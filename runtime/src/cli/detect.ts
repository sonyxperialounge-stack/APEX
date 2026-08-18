/*
 * APEX — ARMY V3 — Copyright (c) 2026 Lalit Sharma. All rights reserved.
 * Licensed under the APEX Personal Use License 1.0 (see the LICENSE file).
 * Not open source: personal, non-commercial use of unmodified copies only.
 * Modification, resale, commercial use, and renaming are prohibited.
 * Removing this notice or the LICENSE grants no rights whatsoever.
 */

/**
 * Host detection (INS-001).
 *
 * Reports EVERY host found, not just the first. Multiple hosts can be attached at once
 * and they share the project ledger, so work started in one continues in another.
 */

import path from "node:path"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { existsSync } from "../core/json.ts"
import { hostConfigDir } from "../core/paths.ts"

const run = promisify(execFile)

export type HostName =
  | "opencode"
  | "claude-code"
  | "cursor"
  | "windsurf"
  | "codex-cli"
  | "gemini-cli"
  | "aider"
  | "zed"

export interface DetectedHost {
  name: HostName
  /** The deepest binding APEX can install for this host. */
  level: 1 | 2
  configDir: string | null
  onPath: boolean
  configDirExists: boolean
}

interface HostSpec {
  name: HostName
  binary: string | null
  level: 1 | 2
  extraDirs?: string[]
}

const SPECS: HostSpec[] = [
  { name: "opencode", binary: "opencode", level: 2 },
  { name: "claude-code", binary: "claude", level: 1 },
  { name: "cursor", binary: null, level: 1 },
  { name: "windsurf", binary: null, level: 1 },
  { name: "codex-cli", binary: "codex", level: 1 },
  { name: "gemini-cli", binary: "gemini", level: 1 },
  { name: "aider", binary: "aider", level: 1 },
  { name: "zed", binary: null, level: 1 },
]

async function onPath(binary: string): Promise<boolean> {
  const probe = process.platform === "win32" ? "where" : "which"
  try {
    await run(probe, [binary], { timeout: 5000, windowsHide: true })
    return true
  } catch {
    return false
  }
}

export async function detectHosts(): Promise<DetectedHost[]> {
  const found: DetectedHost[] = []
  for (const spec of SPECS) {
    const configDir = hostConfigDir(spec.name)
    const dirExists = Boolean(configDir && existsSync(configDir))
    const binaryPresent = spec.binary ? await onPath(spec.binary) : false
    if (!dirExists && !binaryPresent) continue
    found.push({
      name: spec.name,
      level: spec.level,
      configDir,
      onPath: binaryPresent,
      configDirExists: dirExists,
    })
  }
  return found
}

export async function detectHost(name: HostName): Promise<DetectedHost> {
  const spec = SPECS.find((s) => s.name === name)
  if (!spec) throw new Error(`Unknown host "${name}". Known: ${SPECS.map((s) => s.name).join(", ")}`)
  const configDir = hostConfigDir(name)
  return {
    name,
    level: spec.level,
    configDir,
    onPath: spec.binary ? await onPath(spec.binary) : false,
    configDirExists: Boolean(configDir && existsSync(configDir)),
  }
}

/** Find the project root: the nearest ancestor with a project marker, else cwd. */
export function detectProjectRoot(start = process.cwd()): string {
  const markers = [".git", "package.json", "pyproject.toml", "Cargo.toml", "go.mod", ".apex"]
  let dir = path.resolve(start)
  for (let i = 0; i < 64; i++) {
    if (markers.some((m) => existsSync(path.join(dir, m)))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return path.resolve(start)
}

export const KNOWN_HOSTS: HostName[] = SPECS.map((s) => s.name)
