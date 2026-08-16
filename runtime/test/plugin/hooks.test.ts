import { test, describe, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import fsp from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import {
  ApexPlugin, bootstrapEngines, safe, systemTransform, toolBefore, toolAfter, permissionAsk,
  onEvent, onCompacting, messagesTransform, chatParams, classifyTool, isEditTool,
  permissionToOperation, describeHooks, HOOK_NAMES, TEMPERATURE_BY_CLASS, companionPaths, isDeliberateBlock,
  type Engines,
} from "../../src/plugin/index.ts"
import { readTextOrNull, readJson } from "../../src/core/json.ts"
import { setLogDir } from "../../src/core/log.ts"

let dir: string
let e: Engines

async function write(rel: string, content = "x"): Promise<string> {
  const file = path.join(dir, rel)
  await fsp.mkdir(path.dirname(file), { recursive: true })
  await fsp.writeFile(file, content, "utf8")
  return file
}

beforeEach(async () => {
  dir = await fsp.mkdtemp(path.join(os.tmpdir(), "apex-plugin-"))
  setLogDir(path.join(dir, "logs"))
  await write("package.json", JSON.stringify({ name: "demo", type: "module", scripts: { test: "node --test" } }))
  await write("src/app.js", "export const x = 1\n")
  await write("config/prod.yaml", "secret: no")
  e = await bootstrapEngines(dir)
  const cfg = await e.ledger.loadConfig()
  await e.ledger.saveConfig({ ...cfg, doNotTouch: ["config/prod.yaml"], doNotRead: [".env"] })
  e.cfg = await e.ledger.loadConfig()
  e.governor = new (await import("../../src/engines/governor.ts")).Governor(e.cfg)
})
afterEach(async () => {
  setLogDir(null)
  await fsp.rm(dir, { recursive: true, force: true })
})

// ── PLG-001, PLG-015, PLG-016 ───────────────────────────────────────────────

describe("PLG-001 — the plugin loads and exports every hook", () => {
  test("returns a hook for each declared name", async () => {
    const plugin = await ApexPlugin({ directory: dir })
    for (const hook of HOOK_NAMES) {
      assert.equal(typeof plugin[hook], "function", `missing hook ${hook}`)
    }
    assert.equal(typeof plugin.dispose, "function")
  })

  test("PLG-015 — writes the level-2 runtime marker", async () => {
    await ApexPlugin({ directory: dir })
    const marker = await readJson<{ level: number }>(path.join(dir, ".apex", "runtime.json"), { level: 0 })
    assert.equal(marker.level, 2)
    assert.equal((await e.ledger.status()).level, 2)
  })

  test("prefers the worktree over the directory", async () => {
    const worktree = path.join(dir, "wt")
    await fsp.mkdir(worktree, { recursive: true })
    await ApexPlugin({ directory: dir, worktree })
    assert.ok(await readTextOrNull(path.join(worktree, ".apex", "config.json")))
  })

  test("PLG-016 — the hook list is exported for a doctor diff", () => {
    assert.deepEqual([...describeHooks()], [...HOOK_NAMES])
    assert.ok(HOOK_NAMES.includes("experimental.chat.system.transform"))
    assert.ok(HOOK_NAMES.includes("tool.execute.before"))
  })
})

// ── PLG-002 — fault injection ───────────────────────────────────────────────

describe("PLG-002 — a throw in any hook never breaks the session", () => {
  test("safe() swallows and logs", async () => {
    const wrapped = safe("boom", async () => {
      throw new Error("simulated hook failure")
    })
    assert.equal(await wrapped(), undefined)
  })

  test("safe() bounds a hanging hook", async () => {
    const wrapped = safe("hang", () => new Promise(() => {}), 150)
    const started = Date.now()
    assert.equal(await wrapped(), undefined)
    assert.ok(Date.now() - started < 3000, "a hang must not become a frozen editor")
  })

  test("every real hook survives a corrupt ledger", async () => {
    await fsp.rm(path.join(dir, ".apex"), { recursive: true, force: true })
    const plugin = await ApexPlugin({ directory: dir })
    // Re-break it after bootstrap recreated it.
    await fsp.writeFile(path.join(dir, ".apex", "config.json"), "{{{ not json", "utf8")

    const system = plugin["experimental.chat.system.transform"] as (i: unknown, o: unknown) => Promise<unknown>
    const params = plugin["chat.params"] as (i: unknown, o: unknown) => Promise<unknown>
    const ev = plugin.event as (i: unknown) => Promise<unknown>

    await assert.doesNotReject(() => system({}, { system: ["host prompt"] }))
    await assert.doesNotReject(() => params({}, {}))
    await assert.doesNotReject(() => ev({ event: { type: "session.idle" } }))
  })

  test("a hook returning undefined is a degraded capability, not a crash", async () => {
    const wrapped = safe("x", async () => {
      throw new Error("nope")
    })
    const result = await wrapped()
    assert.equal(result, undefined)
  })
})

// ── PLG-003 — system prompt injection ───────────────────────────────────────

describe("PLG-003 — the doctrine is injected into every request", () => {
  test("APEX is prepended, and the host prompt is preserved", async () => {
    const out = { system: ["HOST PROMPT WITH TOOL CONTRACT"] }
    const result = (await systemTransform(e)({}, out))!
    assert.equal(out.system.length, 2, "the hook must MUTATE output.system — a return value is ignored")
    assert.match(out.system[0]!, /APEX ACTIVE \(L2\)/)
    assert.equal(out.system[1], "HOST PROMPT WITH TOOL CONTRACT", "the host contract must survive")
    assert.deepEqual(result.system, out.system)
  })

  test("protected paths are stated every turn", async () => {
    const out = { system: [] as string[] }
    await systemTransform(e)({}, out)
    assert.match(out.system[0]!, /config\/prod\.yaml/)
    assert.match(out.system[0]!, /never read/)
  })

  test("the active requirement appears once one is in progress", async () => {
    const req = await e.ledger.addRequirement({
      source: "p", text: "add a health endpoint", acceptance: "GET /health -> 200", verifyBy: "npm test",
    })
    await e.ledger.setStatus(req.id, "IN_PROGRESS")
    const out = { system: [] as string[] }
    await systemTransform(e)({}, out)
    assert.match(out.system[0]!, new RegExp(req.id))
    assert.match(out.system[0]!, /health endpoint/)
  })
})

// ── PLG-004, PLG-005 — enforcement ──────────────────────────────────────────

describe("PLG-004 — protected paths are hard-blocked", () => {
  test("a write to a protected path throws with an explanation", async () => {
    await assert.rejects(
      () => toolBefore(e)({ tool: "edit", callID: "c1" }, { args: { filePath: "config/prod.yaml" } }),
      (err: Error) => {
        assert.match(err.message, /APEX BLOCKED/)
        assert.match(err.message, /do not retry it or route around it/i)
        return true
      },
    )
  })

  test("reading a do_not_read path is blocked", async () => {
    await assert.rejects(
      () => toolBefore(e)({ tool: "read", callID: "c2" }, { args: { filePath: ".env" } }),
      /APEX BLOCKED/,
    )
  })

  test("an ordinary edit proceeds", async () => {
    const result = (await toolBefore(e)({ tool: "edit", callID: "c3" }, { args: { filePath: "src/app.js" } }))!
    assert.equal(result.blocked, false)
  })

  test("GOV-006 — a bulk command reaching a protected path is blocked before it runs", async () => {
    await assert.rejects(
      () => toolBefore(e)({ tool: "bash", callID: "c4" }, { args: { command: "black ." } }),
      (err: Error) => {
        assert.match(err.message, /bulk-operation/)
        assert.match(err.message, /Narrow it/)
        return true
      },
    )
  })

  test("a bulk command confined to safe files proceeds", async () => {
    const result = (await toolBefore(e)({ tool: "bash", callID: "c5" }, { args: { command: "prettier --write src/*.js" } }))!
    assert.equal(result.blocked, false)
  })

  test("a force push is blocked", async () => {
    await assert.rejects(
      () => toolBefore(e)({ tool: "bash", callID: "c6" }, { args: { command: "git push --force origin main" } }),
      /history-rewrite/,
    )
  })

  test("PLG-005 — a risky edit takes a snapshot first", async () => {
    const result = (await toolBefore(e)({ tool: "write", callID: "c7" }, { args: { filePath: "src/app.js" } }))!
    assert.ok(result.snapshotId.startsWith("SNAP-"))
    const snaps = await fsp.readdir(path.join(dir, ".apex", "snapshots"), { recursive: true })
    assert.ok(snaps.length > 0)
  })

  test("the intent is recorded for the after-hook", async () => {
    await toolBefore(e)({ tool: "edit", callID: "c8" }, { args: { filePath: "src/app.js" } })
    assert.ok(e.intents.has("c8"))
  })
})

// ── PLG-006, PLG-007 — grounding ────────────────────────────────────────────

describe("PLG-006 — verification lands in the SAME turn as the edit", () => {
  test("a failing check is appended to the tool output before the model can claim success", async () => {
    await write("tests/app.test.js", [
      'import { test } from "node:test"',
      'import assert from "node:assert/strict"',
      'test("fails on purpose", () => { assert.equal(1, 2) })',
    ].join("\n"))
    e.cfg.verifyCommands = { suite: "npm test" }
    e.verifier = new (await import("../../src/engines/verifier.ts")).Verifier(
      e.cfg, new (await import("../../src/core/exec.ts")).RealCommandRunner(), e.ledger,
    )

    await toolBefore(e)({ tool: "edit", callID: "x1" }, { args: { filePath: "src/app.js" } })
    const output = { output: "edited src/app.js" }
    const result = (await toolAfter(e)({ tool: "edit", callID: "x1" }, output))!

    assert.equal(result.verified, false)
    assert.match(output.output, /APEX VERIFICATION FAILED/)
    assert.match(output.output, /Do not report success/)
    assert.match(output.output, /\.apex\/VERIFICATION\.md/)
  })

  test("a passing check appends nothing", async () => {
    await write("tests/app.test.js", [
      'import { test } from "node:test"',
      'test("passes", () => {})',
    ].join("\n"))
    e.cfg.verifyCommands = { suite: "npm test" }
    e.verifier = new (await import("../../src/engines/verifier.ts")).Verifier(
      e.cfg, new (await import("../../src/core/exec.ts")).RealCommandRunner(), e.ledger,
    )

    await toolBefore(e)({ tool: "edit", callID: "x2" }, { args: { filePath: "src/app.js" } })
    const output = { output: "edited" }
    const result = (await toolAfter(e)({ tool: "edit", callID: "x2" }, output))!
    assert.equal(result.verified, true)
    assert.equal(output.output, "edited")
  })

  test("a non-edit tool is not verified", async () => {
    await toolBefore(e)({ tool: "read", callID: "x3" }, { args: { filePath: "src/app.js" } })
    const result = (await toolAfter(e)({ tool: "read", callID: "x3" }, { output: "contents" }))!
    assert.equal(result.records.length, 0)
  })

  test("an unknown callID is ignored rather than throwing", async () => {
    const result = (await toolAfter(e)({ tool: "edit", callID: "never-seen" }, { output: "x" }))!
    assert.equal(result.records.length, 0)
  })

  test("PLG-007 — the real change is recorded in the ledger", async () => {
    await toolBefore(e)({ tool: "edit", callID: "x4" }, { args: { filePath: "src/app.js" } })
    await toolAfter(e)({ tool: "edit", callID: "x4" }, { output: "done" })
    const progress = (await readTextOrNull(e.ledger.file("PROGRESS.md")))!
    assert.match(progress, /edit src[/\\]app\.js/)
  })

  test("REC-002 — a working command is captured into memory automatically", async () => {
    await write("tests/app.test.js", 'import { test } from "node:test"\ntest("ok", () => {})')
    e.cfg.verifyCommands = { suite: "npm test" }
    e.verifier = new (await import("../../src/engines/verifier.ts")).Verifier(
      e.cfg, new (await import("../../src/core/exec.ts")).RealCommandRunner(), e.ledger,
    )
    await toolBefore(e)({ tool: "edit", callID: "x5" }, { args: { filePath: "src/app.js" } })
    await toolAfter(e)({ tool: "edit", callID: "x5" }, { output: "done" })
    const memory = (await readTextOrNull(e.ledger.file("MEMORY.md")))!
    assert.match(memory, /verified working/)
  })
})

// ── PLG-008 — permission policy ─────────────────────────────────────────────

describe("PLG-008 — each autonomy mode answers differently", () => {
  const modes = [
    { mode: "MANUAL" as const, edit: "ask" },
    { mode: "GUARDED" as const, edit: "allow" },
    { mode: "AUTO" as const, edit: "allow" },
    { mode: "FULL_AUTO" as const, edit: "allow" },
  ]

  for (const { mode, edit } of modes) {
    test(`${mode}: an ordinary edit -> ${edit}`, async () => {
      e.cfg = { ...e.cfg, autonomy: mode }
      e.governor = new (await import("../../src/engines/governor.ts")).Governor(e.cfg)
      const output = { status: "ask" as const }
      const result = (await permissionAsk(e)({ type: "edit", pattern: "src/app.js" }, output))!
      assert.equal(result.status, edit)
    })
  }

  test("a protected path is DENIED in every mode, including FULL_AUTO", async () => {
    for (const mode of ["MANUAL", "GUARDED", "AUTO", "FULL_AUTO"] as const) {
      e.cfg = { ...e.cfg, autonomy: mode }
      e.governor = new (await import("../../src/engines/governor.ts")).Governor(e.cfg)
      const result = (await permissionAsk(e)({ type: "edit", pattern: "config/prod.yaml" }, { status: "ask" }))!
      assert.equal(result.status, "deny", `${mode} allowed a protected write`)
    }
  })

  test("GUARDED asks before a dependency install", async () => {
    e.cfg = { ...e.cfg, autonomy: "GUARDED" }
    e.governor = new (await import("../../src/engines/governor.ts")).Governor(e.cfg)
    const result = (await permissionAsk(e)({ type: "bash", pattern: "npm install lodash" }, { status: "allow" }))!
    assert.equal(result.status, "ask")
  })

  test("permissionToOperation maps host permission types", () => {
    assert.equal(permissionToOperation({ type: "edit", pattern: "a" }).kind, "write")
    assert.equal(permissionToOperation({ type: "read", pattern: "a" }).kind, "read")
    assert.equal(permissionToOperation({ type: "bash", pattern: "ls" }).kind, "bash")
    assert.equal(permissionToOperation({ type: "webfetch", pattern: "http://x" }).kind, "network")
  })
})

// ── PLG-009, PLG-010 — events ───────────────────────────────────────────────

describe("PLG-009/010 — session lifecycle", () => {
  test("session.error triggers recovery", async () => {
    const result = (await onEvent(e)({ event: { type: "session.error", properties: { sessionID: "ses_9" } } }))!
    assert.equal(result.action, "recover")
    assert.equal(result.detail, "ses_9")
    assert.match((await readTextOrNull(e.ledger.file("PROGRESS.md")))!, /ses_9 errored/)
  })

  test("a child session is tracked", async () => {
    const result = (await onEvent(e)({
      event: { type: "session.created", properties: { sessionID: "ses_child", parentID: "ses_parent" } },
    }))!
    assert.equal(result.action, "track_child")
  })

  test("a top-level session is not tracked as a child", async () => {
    const result = (await onEvent(e)({ event: { type: "session.created", properties: { sessionID: "ses_top" } } }))!
    assert.equal(result.action, "none")
  })

  test("an edit to a protected path is recorded as a finding", async () => {
    const result = (await onEvent(e)({ event: { type: "file.edited", properties: { path: "config/prod.yaml" } } }))!
    assert.equal(result.action, "scope_drift")
    assert.match((await readTextOrNull(e.ledger.file("FINDINGS.md")))!, /protected path/)
  })

  test("an ordinary edit event is not a drift", async () => {
    const result = (await onEvent(e)({ event: { type: "file.edited", properties: { path: "src/app.js" } } }))!
    assert.equal(result.action, "none")
  })

  test("an unknown event is ignored", async () => {
    assert.equal((await onEvent(e)({ event: { type: "something.else" } }))!.action, "none")
  })
})

// ── PLG-011, PLG-012 — context survival ─────────────────────────────────────

describe("PLG-011 — constraints survive compaction", () => {
  test("the anchor carries protected paths and autonomy into the summary", async () => {
    const output: { context: string[]; prompt?: string } = { context: ["host context"] }
    const result = (await onCompacting(e)({ sessionID: "s1" }, output))!
    const joined = output.context.join("\n")
    assert.match(joined, /MUST SURVIVE COMPACTION/)
    assert.match(joined, /config\/prod\.yaml/)
    assert.match(joined, /AUTONOMY/)
    assert.ok(output.context.includes("host context"), "the host's own context is preserved")
    assert.equal(output.prompt, undefined, "the host's compaction prompt is not overwritten")
    assert.deepEqual(result.context, output.context)
  })
})

describe("PLG-012 — long sessions are re-anchored", () => {
  test("a short conversation is left alone", async () => {
    assert.equal(await messagesTransform(e, 20)({}, { messages: new Array(5).fill({}) }), undefined)
  })

  test("a long conversation gets one anchor inserted before the last message", async () => {
    const out = { messages: new Array(25).fill({ info: { role: "user" }, parts: [] }) }
    const result = (await messagesTransform(e, 20)({}, out))!
    assert.equal(out.messages.length, 26, "the hook must MUTATE output.messages")
    const injected = out.messages[24] as { parts: Array<{ text: string }> }
    assert.match(injected.parts[0]!.text, /APEX ACTIVE/)
    assert.deepEqual(result.messages, out.messages)
  })
})

// ── PLG-013 — parameters ────────────────────────────────────────────────────

describe("PLG-013 — temperature by task class", () => {
  test("planning is warm when nothing is active", async () => {
    const output: { temperature?: number } = {}
    const result = (await chatParams(e)({}, output))!
    assert.equal(result.taskClass, "planning")
    assert.equal(output.temperature, TEMPERATURE_BY_CLASS.planning)
  })

  test("editing is cold once a requirement is in progress", async () => {
    const req = await e.ledger.addRequirement({ source: "p", text: "t", acceptance: "a", verifyBy: "npm test" })
    await e.ledger.setStatus(req.id, "IN_PROGRESS")
    const result = (await chatParams(e)({}, {}))!
    assert.equal(result.taskClass, "editing")
    assert.equal(TEMPERATURE_BY_CLASS.editing, 0.1)
  })

  test("two failures switch to debugging", async () => {
    const req = await e.ledger.addRequirement({ source: "p", text: "t", acceptance: "a", verifyBy: "npm test" })
    await e.ledger.setStatus(req.id, "IN_PROGRESS")
    for (let i = 0; i < 2; i++) {
      await e.ledger.addVerification({
        reqIds: [req.id], type: "unit", command: "npm test", expected: "pass",
        actual: "failed", exitCode: 1, result: "FAIL",
      })
    }
    assert.equal((await chatParams(e)({}, {}))!.taskClass, "debugging")
  })

  test("the four classes have distinct temperatures", () => {
    assert.equal(new Set(Object.values(TEMPERATURE_BY_CLASS)).size, 4)
  })
})

// ── classification helpers ──────────────────────────────────────────────────

describe("tool classification", () => {
  const cases: Array<[string, Record<string, unknown>, string]> = [
    ["edit", { filePath: "a.ts" }, "write"],
    ["write", { path: "a.ts" }, "write"],
    ["patch", { file: "a.ts" }, "write"],
    ["read", { filePath: "a.ts" }, "read"],
    ["bash", { command: "ls" }, "bash"],
    ["webfetch", { url: "http://x" }, "network"],
  ]
  for (const [tool, args, kind] of cases) {
    test(`${tool} -> ${kind}`, () => {
      assert.equal(classifyTool(tool, args).kind, kind)
    })
  }

  test("edit tools are recognised case-insensitively", () => {
    assert.equal(isEditTool("Edit"), true)
    assert.equal(isEditTool("MultiEdit"), true)
    assert.equal(isEditTool("read"), false)
  })
})

describe("companion files", () => {
  test("agents, commands and skills are all enumerated", () => {
    const paths = companionPaths("/cfg")
    assert.ok(paths.some((p) => p.includes("apex-implementer")))
    assert.ok(paths.some((p) => p.includes("apex-reviewer")))
    assert.ok(paths.some((p) => p.includes("apex.md")))
    assert.ok(paths.some((p) => p.includes("SKILL.md")))
  })
})

// ── PLG-017 — overhead ──────────────────────────────────────────────────────

describe("PLG-017 — hook overhead", () => {
  test("system.transform stays well under the budget", async () => {
    const durations: number[] = []
    for (let i = 0; i < 20; i++) {
      const started = performance.now()
      await systemTransform(e)({}, { system: [] })
      durations.push(performance.now() - started)
    }
    durations.sort((a, b) => a - b)
    const p95 = durations[Math.floor(durations.length * 0.95)]!
    assert.ok(p95 < 200, `p95 was ${p95.toFixed(1)}ms`)
  })

  test("tool.execute.before stays fast for an ordinary edit", async () => {
    const durations: number[] = []
    for (let i = 0; i < 20; i++) {
      const started = performance.now()
      await toolBefore(e)({ tool: "edit", callID: `p${i}` }, { args: { filePath: "src/app.js" } })
      durations.push(performance.now() - started)
    }
    durations.sort((a, b) => a - b)
    assert.ok(durations[Math.floor(durations.length * 0.95)]! < 300)
  })
})

// ── the enforcement-vs-safety bug ───────────────────────────────────────────
//
// A live run against real OpenCode showed governor.block and plugin.block both firing
// while the protected file was still modified: safe() was catching the deliberate
// refusal. PLG-002 must swallow FAILURES and propagate DECISIONS.

describe("PLG-002/PLG-004 — a deliberate block propagates, a failure does not", () => {
  test("safe() re-throws a BlockedError", async () => {
    const { BlockedError } = await import("../../src/core/errors.ts")
    const wrapped = safe("blocker", async () => {
      throw new BlockedError("[APEX BLOCKED: protected-write] nope", "protected-write")
    })
    await assert.rejects(() => wrapped(), /APEX BLOCKED/)
  })

  test("safe() re-throws a block that lost its prototype across a module boundary", async () => {
    const wrapped = safe("blocker", async () => {
      throw new Error("[APEX BLOCKED: bulk-operation] narrow it")
    })
    await assert.rejects(() => wrapped(), /APEX BLOCKED/)
  })

  test("safe() still swallows a genuine bug", async () => {
    const wrapped = safe("buggy", async () => {
      throw new TypeError("cannot read properties of undefined")
    })
    assert.equal(await wrapped(), undefined)
  })

  test("safe() still swallows a timeout", async () => {
    const wrapped = safe("slow", () => new Promise(() => {}), 120)
    assert.equal(await wrapped(), undefined)
  })

  test("isDeliberateBlock discriminates correctly", async () => {
    const { BlockedError } = await import("../../src/core/errors.ts")
    assert.equal(isDeliberateBlock(new BlockedError("x", "r")), true)
    assert.equal(isDeliberateBlock(new Error("[APEX BLOCKED: r] x")), true)
    assert.equal(isDeliberateBlock(new Error("random failure")), false)
    assert.equal(isDeliberateBlock("not an error"), false)
  })

  test("END TO END: the wrapped hook actually blocks a protected write", async () => {
    const hook = safe("tool.execute.before", toolBefore(e))
    await assert.rejects(
      () => hook({ tool: "edit", callID: "block-1" }, { args: { filePath: "config/prod.yaml" } }),
      /APEX BLOCKED: protected-write/,
      "the wrapped hook must refuse — this is the whole point of L2",
    )
  })

  test("END TO END: the wrapped hook still allows an ordinary edit", async () => {
    const hook = safe("tool.execute.before", toolBefore(e))
    const result = await hook({ tool: "edit", callID: "ok-1" }, { args: { filePath: "src/app.js" } })
    assert.equal(result?.blocked, false)
  })
})
