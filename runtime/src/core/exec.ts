/*
 * APEX — ARMY V3 — Copyright (c) 2026 Lalit. All rights reserved.
 * Licensed under the APEX Personal Use License 1.0 (see the LICENSE file).
 * Not open source: personal, non-commercial use of unmodified copies only.
 * Modification, resale, commercial use, and renaming are prohibited.
 * Removing this notice or the LICENSE grants no rights whatsoever.
 */

/**
 * Command execution with a hard timeout and honest failure classification.
 *
 * The two properties that matter:
 *   - a command that cannot be found produces `notFound`, which becomes NOT_RUN and
 *     never a PASS (VER-007);
 *   - a command that hangs is killed and reported as a timeout, never left to hang
 *     (VER-006).
 */

import { spawn, execFile } from "node:child_process"
import type { ChildProcess } from "node:child_process"
import type { CommandResult, CommandRunner, RunOptions } from "./types.ts"

const NOT_FOUND = /command not found|is not recognized as an internal|No such file or directory|ENOENT/i

/**
 * Kill the whole process tree.
 *
 * With `shell: true` the direct child is the shell, not the command. Killing the shell
 * on Windows leaves the real process running, so a "timeout" would not actually stop
 * anything — the check would hang exactly as if there were no timeout at all.
 */
function killTree(child: ChildProcess): void {
  if (child.pid === undefined) return
  if (process.platform === "win32") {
    execFile("taskkill", ["/pid", String(child.pid), "/T", "/F"], () => {
      /* the process may already be gone */
    })
    return
  }
  try {
    process.kill(-child.pid, "SIGKILL") // negative pid = the process group
  } catch {
    try {
      child.kill("SIGKILL")
    } catch {
      /* already gone */
    }
  }
}

/**
 * Strip environment that would make a verification run behave unlike a normal one.
 *
 * `node --test` exports NODE_TEST_CONTEXT to its children. A nested `node --test` that
 * sees it switches into child-reporter mode and exits 0 even when assertions fail — so a
 * verification run from inside any test harness would silently report a pass. APEX is
 * frequently invoked from exactly that context (CI, a test, another agent's harness), so
 * the child must start from a clean slate.
 */
export function cleanEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const out = { ...env }
  for (const key of ["NODE_TEST_CONTEXT", "NODE_V8_COVERAGE", "JEST_WORKER_ID", "VITEST", "VITEST_WORKER_ID"]) {
    delete out[key]
  }
  return out
}

export class RealCommandRunner implements CommandRunner {
  async run(command: string, options: RunOptions = {}): Promise<CommandResult> {
    const started = Date.now()
    const timeoutMs = options.timeoutMs ?? 120_000

    return new Promise<CommandResult>((resolve) => {
      const child = spawn(command, {
        cwd: options.cwd,
        env: { ...cleanEnv(process.env), ...(options.env ?? {}) },
        shell: true,
        windowsHide: true,
        // A process group on POSIX so the whole tree can be killed on timeout.
        detached: process.platform !== "win32",
      })

      let stdout = ""
      let stderr = ""
      let timedOut = false
      let settled = false

      child.stdout?.on("data", (chunk: Buffer) => {
        stdout += chunk.toString("utf8")
      })
      child.stderr?.on("data", (chunk: Buffer) => {
        stderr += chunk.toString("utf8")
      })

      const finish = (code: number | null, spawnError?: Error) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        const combined = stdout + stderr + (spawnError?.message ?? "")
        resolve({
          command,
          code: timedOut ? null : code,
          stdout,
          stderr: stderr + (spawnError ? `\n${spawnError.message}` : ""),
          durationMs: Date.now() - started,
          timedOut,
          notFound: code === 127 || Boolean(spawnError) || (code !== 0 && NOT_FOUND.test(combined)),
        })
      }

      const timer = setTimeout(() => {
        timedOut = true
        killTree(child)
        // The tree kill is asynchronous on Windows; settle regardless so a stubborn
        // process can never turn a timeout into a hang.
        setTimeout(() => finish(null), 1500).unref()
      }, timeoutMs)

      child.on("error", (err) => finish(null, err))
      child.on("close", (code) => finish(code))
    })
  }
}

/** Deterministic runner for tests. Unmatched commands report as not-found. */
export class FakeCommandRunner implements CommandRunner {
  private responses: Map<string, Partial<CommandResult>>
  calls: string[]

  constructor(responses: Record<string, Partial<CommandResult>> = {}) {
    this.responses = new Map(Object.entries(responses))
    this.calls = []
  }

  set(command: string, result: Partial<CommandResult>): void {
    this.responses.set(command, result)
  }

  async run(command: string): Promise<CommandResult> {
    this.calls.push(command)
    const match =
      this.responses.get(command) ??
      [...this.responses.entries()].find(([key]) => command.startsWith(key))?.[1]

    if (!match) {
      return {
        command,
        code: 127,
        stdout: "",
        stderr: `${command.split(" ")[0]}: command not found`,
        durationMs: 1,
        timedOut: false,
        notFound: true,
      }
    }
    return {
      command,
      code: match.code ?? 0,
      stdout: match.stdout ?? "",
      stderr: match.stderr ?? "",
      durationMs: match.durationMs ?? 1,
      timedOut: match.timedOut ?? false,
      notFound: match.notFound ?? false,
    }
  }
}
