import { test, describe, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import fsp from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import { McpServer, VERSION } from "../../src/mcp/server.ts"
import { TOOLS, awaitAllTasks } from "../../src/mcp/tools.ts"
import { setLogDir } from "../../src/core/log.ts"

const RUNTIME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..")

let dir: string
let sent: unknown[]
let server: McpServer

beforeEach(async () => {
  dir = await fsp.mkdtemp(path.join(os.tmpdir(), "apex-mcp-"))
  setLogDir(path.join(dir, "logs"))
  sent = []
  server = new McpServer({ projectRoot: dir, write: (line) => sent.push(JSON.parse(line)) })
})
afterEach(async () => {
  // A background verification task still writing into the ledger will hold the temp
  // directory open. Waiting for it is also the correct production behaviour: evidence
  // must not land after the report was written.
  await awaitAllTasks(20_000)
  setLogDir(null)
  await fsp.rm(dir, { recursive: true, force: true })
})

async function call(name: string, args: Record<string, unknown> = {}): Promise<string> {
  const res = (await server.handle({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } })) as {
    result: { content: Array<{ text: string }> }
  }
  return res.result.content[0]!.text
}

async function callJson<T = Record<string, unknown>>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  return JSON.parse(await call(name, args)) as T
}

// ── MCP-001, MCP-002, MCP-003 ───────────────────────────────────────────────

describe("MCP-001/002/003 — handshake", () => {
  test("initialize returns serverInfo and only implemented capabilities", async () => {
    const res = (await server.handle({ id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } })) as {
      result: { protocolVersion: string; capabilities: Record<string, unknown>; serverInfo: { name: string; version: string } }
    }
    assert.equal(res.result.serverInfo.name, "apex")
    assert.equal(res.result.serverInfo.version, VERSION)
    assert.deepEqual(Object.keys(res.result.capabilities).sort(), ["prompts", "resources", "tools"])
  })

  test("MCP-003 — an unknown protocol version negotiates down to a supported one", async () => {
    const res = (await server.handle({ id: 1, method: "initialize", params: { protocolVersion: "1999-01-01" } })) as {
      result: { protocolVersion: string }
    }
    assert.equal(res.result.protocolVersion, "2025-06-18")
  })

  test("an older supported version is honoured", async () => {
    const res = (await server.handle({ id: 1, method: "initialize", params: { protocolVersion: "2024-11-05" } })) as {
      result: { protocolVersion: string }
    }
    assert.equal(res.result.protocolVersion, "2024-11-05")
  })

  test("notifications get no response", async () => {
    assert.equal(await server.handle({ method: "notifications/initialized" }), null)
  })

  test("an unknown method returns a JSON-RPC error, not a crash", async () => {
    const res = (await server.handle({ id: 7, method: "nope/nope" })) as { error: { code: number } }
    assert.equal(res.error.code, -32601)
  })
})

// ── MCP-004 ─────────────────────────────────────────────────────────────────

describe("MCP-004 — the tool surface", () => {
  // Taken from build/REQUIREMENTS.md MCP-004 VERBATIM.
  //
  // An external scan found four of these missing while this list had been rewritten to
  // match the implementation — the exact "silently dropped requirement" this project
  // exists to prevent, hidden by bending the test instead of fixing the code. The list
  // now asserts the SPEC, so the code has to satisfy it rather than the other way round.
  const REQUIRED = [
    "apex_init", "apex_status", "apex_req_add", "apex_req_list", "apex_req_status",
    "apex_verify", "apex_snapshot", "apex_rollback", "apex_delegate",
    "apex_subagent_status", "apex_council", "apex_gate", "apex_handoff",
    "apex_memory_read", "apex_memory_write", "apex_findings",
  ]

  test("every required tool is listed", async () => {
    const res = (await server.handle({ id: 1, method: "tools/list" })) as { result: { tools: Array<{ name: string }> } }
    const names = res.result.tools.map((t) => t.name)
    for (const required of REQUIRED) assert.ok(names.includes(required), `missing ${required}`)
  })

  test("every tool has a valid schema and a description that teaches", () => {
    for (const tool of TOOLS) {
      assert.equal(typeof tool.name, "string")
      assert.ok(tool.description.length > 40, `${tool.name} description is too thin to guide a model`)
      assert.equal((tool.inputSchema as { type: string }).type, "object")
      assert.doesNotThrow(() => JSON.parse(JSON.stringify(tool.inputSchema)))
    }
  })

  test("apex_req_status describes the legal path and the evidence rule", () => {
    const tool = TOOLS.find((t) => t.name === "apex_req_status")!
    assert.match(tool.description, /IMPLEMENTED_NOT_VERIFIED/)
    assert.match(tool.description, /REJECTED unless a passing verification record/)
  })

  test("an unknown tool returns a rejection naming the real tools", async () => {
    const out = await call("apex_nope")
    assert.match(out, /REJECTED: unknown tool/)
    assert.match(out, /apex_status/)
  })
})

// ── MCP-005 — rejections teach ──────────────────────────────────────────────

describe("MCP-005 — teaching rejections, not exceptions", () => {
  test("an illegal transition returns a REJECTED message with the recipe", async () => {
    await call("apex_init", { projectRoot: dir })
    const req = await callJson<{ requirement: { id: string } }>("apex_req_add", {
      source: "plan.md", text: "do the thing", acceptance: "thing is done", verifyBy: "npm test",
    })
    const out = await call("apex_req_status", { id: req.requirement.id, status: "VERIFIED_COMPLETE" })
    assert.match(out, /^REJECTED:/)
    assert.match(out, /Illegal transition/)
    assert.match(out, /IN_PROGRESS/)
  })

  test("BLOCKED without a reason is rejected with an explanation", async () => {
    await call("apex_init", { projectRoot: dir })
    const req = await callJson<{ requirement: { id: string } }>("apex_req_add", {
      source: "p", text: "t", acceptance: "a", verifyBy: "v",
    })
    const out = await call("apex_req_status", { id: req.requirement.id, status: "BLOCKED" })
    assert.match(out, /REJECTED/)
    assert.match(out, /requires evidence/)
  })

  test("a rejection is not marked isError — it is a correction", async () => {
    await call("apex_init", { projectRoot: dir })
    const res = (await server.handle({
      id: 1, method: "tools/call",
      params: { name: "apex_req_status", arguments: { id: "REQ-999", status: "IN_PROGRESS" } },
    })) as { result: { isError?: boolean; content: Array<{ text: string }> } }
    assert.notEqual(res.result.isError, true)
    assert.match(res.result.content[0]!.text, /REJECTED/)
  })
})

// ── MCP-006 — the gate names its failures ───────────────────────────────────

describe("MCP-006 — apex_gate", () => {
  test("an empty ledger fails the gate with reasons", async () => {
    await call("apex_init", { projectRoot: dir })
    const gate = await callJson<{ passed: boolean; failures: string[]; verdict: string }>("apex_gate")
    assert.equal(gate.passed, false)
    assert.ok(gate.failures.length > 0)
    assert.match(gate.verdict, /GATE FAILED/)
    assert.match(gate.verdict, /Do not claim completion/)
  })

  test("the gate names every unmet requirement individually", async () => {
    await call("apex_init", { projectRoot: dir })
    const a = await callJson<{ requirement: { id: string } }>("apex_req_add", {
      source: "p", text: "a", acceptance: "a", verifyBy: "v",
    })
    const b = await callJson<{ requirement: { id: string } }>("apex_req_add", {
      source: "p", text: "b", acceptance: "b", verifyBy: "v",
    })
    await call("apex_req_status", { id: b.requirement.id, status: "BLOCKED", reason: "no creds" })

    const gate = await callJson<{ failures: string[] }>("apex_gate")
    assert.ok(gate.failures.some((f) => f.includes(a.requirement.id)))
    assert.ok(gate.failures.some((f) => f.includes(b.requirement.id) && f.includes("no creds")))
  })

  test("a LATER failure supersedes an earlier pass — stale evidence cannot pass the gate", async () => {
    await call("apex_init", { projectRoot: dir })
    const req = await callJson<{ requirement: { id: string } }>("apex_req_add", {
      source: "p", text: "t", acceptance: "a", verifyBy: "npm test",
    })
    const id = req.requirement.id
    const ledger = new (await import("../../src/engines/ledger.ts")).Ledger(dir)

    await call("apex_req_status", { id, status: "IN_PROGRESS" })
    await call("apex_req_status", { id, status: "IMPLEMENTED_NOT_VERIFIED" })
    await ledger.addVerification({
      reqIds: [id], type: "suite", command: "npm test", expected: "pass",
      actual: "2 passed", exitCode: 0, result: "PASS",
    })
    await call("apex_req_status", { id, status: "VERIFIED_COMPLETE" })
    await call("apex_resume", { nextAction: "done" })

    assert.equal((await callJson<{ passed: boolean }>("apex_gate")).passed, true, "gate passes on fresh evidence")

    // The code is then broken and re-checked. The earlier pass is now stale.
    await ledger.addVerification({
      reqIds: [id], type: "suite", command: "npm test", expected: "pass",
      actual: "1 failed", exitCode: 1, result: "FAIL",
      reason: "New failures introduced by this change: rejects a bad token",
    })

    const gate = await callJson<{ passed: boolean; failures: string[] }>("apex_gate")
    assert.equal(gate.passed, false, "a regression after closure MUST reopen the gate")
    assert.ok(gate.failures.some((f) => f.includes(id) && f.includes("stale")))
    assert.ok(gate.failures.some((f) => f.includes("FINAL state")))
  })

  test("a claimed VERIFIED_COMPLETE with no evidence is caught by the gate", async () => {
    await call("apex_init", { projectRoot: dir })
    const req = await callJson<{ requirement: { id: string } }>("apex_req_add", {
      source: "p", text: "t", acceptance: "a", verifyBy: "v",
    })
    // Corrupt the ledger by hand — the gate must still catch it.
    const file = path.join(dir, ".apex", "REQUIREMENTS.md")
    const text = await fsp.readFile(file, "utf8")
    await fsp.writeFile(file, text.replace("**Status:** NOT_STARTED", "**Status:** VERIFIED_COMPLETE"), "utf8")

    const gate = await callJson<{ passed: boolean; failures: string[] }>("apex_gate")
    assert.equal(gate.passed, false)
    assert.ok(gate.failures.some((f) => f.includes(req.requirement.id) && f.includes("no passing verification")))
  })
})

// ── MCP-007, MCP-008 ────────────────────────────────────────────────────────

describe("MCP-007/008 — resources and prompts", () => {
  test("all resources are readable", async () => {
    await call("apex_init", { projectRoot: dir })
    for (const uri of ["apex://state", "apex://requirements", "apex://handoff", "apex://memory"]) {
      const res = (await server.handle({ id: 1, method: "resources/read", params: { uri } })) as {
        result: { contents: Array<{ text: string }> }
      }
      assert.ok(res.result.contents[0]!.text.length > 0, `${uri} was empty`)
    }
  })

  test("an unknown resource is an error, not a crash", async () => {
    const res = (await server.handle({ id: 1, method: "resources/read", params: { uri: "apex://nope" } })) as {
      error: { code: number }
    }
    assert.equal(res.error.code, -32602)
  })

  test("all prompts are retrievable", async () => {
    await call("apex_init", { projectRoot: dir })
    for (const name of ["apex-boot", "apex-resume", "apex-review"]) {
      const res = (await server.handle({ id: 1, method: "prompts/get", params: { name, arguments: { diff: "x" } } })) as {
        result: { messages: Array<{ content: { text: string } }> }
      }
      assert.ok(res.result.messages[0]!.content.text.length > 0)
    }
  })

  test("apex-review withholds the author's reasoning", async () => {
    const res = (await server.handle({
      id: 1, method: "prompts/get", params: { name: "apex-review", arguments: { diff: "DIFF_HERE" } },
    })) as { result: { messages: Array<{ content: { text: string } }> } }
    const body = res.result.messages[0]!.content.text
    assert.match(body, /Assume there is at least one/)
    assert.match(body, /DIFF_HERE/)
    assert.ok(!/because|rationale|I chose/i.test(body), "the reviewer must not be anchored")
  })
})

// ── MCP-009 — robustness ────────────────────────────────────────────────────

describe("MCP-009 — malformed input never kills the server", () => {
  const HOSTILE: Array<Record<string, unknown>> = [
    {},
    { id: 1 },
    { id: 1, method: "" },
    { id: 1, method: "tools/call" },
    { id: 1, method: "tools/call", params: {} },
    { id: 1, method: "tools/call", params: { name: 123 } },
    { id: 1, method: "tools/call", params: { name: "apex_req_add", arguments: null } },
    { id: 1, method: "tools/call", params: { name: "apex_req_add", arguments: { source: 1, text: null } } },
    { id: null, method: "tools/list" },
    { id: 1, method: "resources/read", params: {} },
  ]

  for (const [i, message] of HOSTILE.entries()) {
    test(`survives hostile message ${i}`, async () => {
      const result = await server.handle(message)
      assert.ok(result === null || typeof result === "object")
    })
  }

  test("still works after every hostile message", async () => {
    for (const message of HOSTILE) await server.handle(message).catch(() => null)
    const res = (await server.handle({ id: 99, method: "tools/list" })) as { result: { tools: unknown[] } }
    assert.ok(res.result.tools.length > 0)
  })
})

// ── MCP-011 — filesystem-only mode ──────────────────────────────────────────

describe("MCP-011 — works with no host server present", () => {
  test("a full cycle runs on the filesystem alone", async () => {
    const init = await callJson<{ created: boolean }>("apex_init", { projectRoot: dir })
    assert.equal(init.created, true)

    const req = await callJson<{ requirement: { id: string } }>("apex_req_add", {
      source: "plan.md §1", text: "add a health endpoint", acceptance: "GET /health returns 200",
      verifyBy: "npm test",
    })
    const id = req.requirement.id

    await call("apex_req_status", { id, status: "IN_PROGRESS" })
    const check = await callJson<{ allowed: boolean }>("apex_check", { kind: "write", path: "src/app.ts" })
    assert.equal(check.allowed, true)

    const verify = await callJson<{ verdict: string }>("apex_verify", { reqIds: [id], maxTier: "types" })
    assert.match(verify.verdict, /NOTHING RAN/, "an empty project honestly reports that nothing ran")

    await call("apex_req_status", { id, status: "IMPLEMENTED_NOT_VERIFIED" })
    const status = await callJson<{ totals: Record<string, number> }>("apex_status")
    assert.equal(status.totals.IMPLEMENTED_NOT_VERIFIED, 1)

    const gate = await callJson<{ passed: boolean }>("apex_gate")
    assert.equal(gate.passed, false, "unverified work cannot pass the gate")
  })

  test("apex_init on an existing ledger loads rather than overwrites", async () => {
    await call("apex_init", { projectRoot: dir })
    await call("apex_req_add", { source: "p", text: "t", acceptance: "a", verifyBy: "v" })
    const again = await callJson<{ created: boolean; message: string }>("apex_init", { projectRoot: dir })
    assert.equal(again.created, false)
    assert.match(again.message, /previous session's memory/)
    const list = await callJson<Array<unknown>>("apex_req_list")
    assert.equal(list.length, 1)
  })

  test("apex_check blocks a protected path with an explanation", async () => {
    await call("apex_init", { projectRoot: dir, doNotTouch: ["config/prod.yaml"] })
    const res = await callJson<{ allowed: boolean; reason: string }>("apex_check", {
      kind: "write", path: "config/prod.yaml",
    })
    assert.equal(res.allowed, false)
    assert.match(res.reason, /APEX BLOCKED/)
  })

  test("apex_check reports bulk violations before the command runs", async () => {
    await fsp.mkdir(path.join(dir, "config"), { recursive: true })
    await fsp.writeFile(path.join(dir, "config", "prod.yaml"), "x", "utf8")
    await call("apex_init", { projectRoot: dir, doNotTouch: ["config/prod.yaml"] })
    const res = await callJson<{ bulkViolations: string[]; bulkNote?: string }>("apex_check", {
      kind: "bash", command: "black .",
    })
    assert.ok(res.bulkViolations.length > 0)
    assert.match(res.bulkNote ?? "", /Narrow it/)
  })

  test("snapshot and rollback round-trip through the tools", async () => {
    await call("apex_init", { projectRoot: dir })
    const file = path.join(dir, "src", "a.ts")
    await fsp.mkdir(path.dirname(file), { recursive: true })
    await fsp.writeFile(file, "original", "utf8")

    const snap = await callJson<{ snapshotId: string }>("apex_snapshot", { reqId: "REQ-001", files: ["src/a.ts"] })
    await fsp.writeFile(file, "broken", "utf8")
    const report = await callJson<{ restored: string[]; note: string }>("apex_rollback", { snapshotId: snap.snapshotId })

    assert.equal(await fsp.readFile(file, "utf8"), "original")
    assert.equal(report.restored.length, 1)
    assert.match(report.note, /not a completion/)
  })

  test("memory round-trips and dedupes", async () => {
    await call("apex_init", { projectRoot: dir })
    await call("apex_memory_write", { section: "Traps", fact: "pytest -n auto is flaky here" })
    await call("apex_memory_write", { section: "Traps", fact: "pytest -n auto is flaky here" })
    const memory = await call("apex_memory_read")
    assert.equal(memory.split("pytest -n auto").length - 1, 1, "duplicate facts are not appended twice")
  })

  test("handoff is generated from real state", async () => {
    await call("apex_init", { projectRoot: dir, sourcesOfTruth: ["docs/plan.md"] })
    const req = await callJson<{ requirement: { id: string } }>("apex_req_add", {
      source: "docs/plan.md", text: "t", acceptance: "a", verifyBy: "v",
    })
    await call("apex_req_status", { id: req.requirement.id, status: "BLOCKED", reason: "waiting on DB access" })
    await call("apex_resume", { nextAction: "start REQ-002" })

    const handoff = await call("apex_handoff", { environment: "node 24, no DB" })
    assert.match(handoff, /waiting on DB access/)
    assert.match(handoff, /start REQ-002/)
    assert.match(handoff, /node 24, no DB/)
    assert.match(handoff, /docs\/plan\.md/)
  })
})

// ── real subprocess round-trip ──────────────────────────────────────────────

describe("real stdio subprocess round-trip", () => {
  test("spawns, initializes, lists tools, and calls one", async () => {
    const child = spawn(
      process.execPath,
      ["--experimental-strip-types", path.join(RUNTIME, "bin", "apex-agent.js"), "mcp", "--project", dir],
      { cwd: RUNTIME, stdio: ["pipe", "pipe", "pipe"], env: { ...process.env, APEX_STATE_DIR: path.join(dir, "state") } },
    )

    const frames: Record<string, unknown>[] = []
    let buffer = ""
    let stderr = ""
    child.stdout.on("data", (chunk: Buffer) => {
      buffer += chunk.toString("utf8")
      let index: number
      while ((index = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, index).trim()
        buffer = buffer.slice(index + 1)
        if (line) frames.push(JSON.parse(line))
      }
    })
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8")
    })

    const send = (msg: unknown) => child.stdin.write(JSON.stringify(msg) + "\n")
    const waitFor = async (id: number, timeoutMs = 20_000): Promise<Record<string, unknown>> => {
      const deadline = Date.now() + timeoutMs
      while (Date.now() < deadline) {
        const found = frames.find((f) => f.id === id)
        if (found) return found
        await new Promise((r) => setTimeout(r, 25))
      }
      throw new Error(`no response for id ${id}. stderr: ${stderr}`)
    }

    try {
      send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } })
      const init = (await waitFor(1)) as { result: { serverInfo: { name: string } } }
      assert.equal(init.result.serverInfo.name, "apex")

      send({ jsonrpc: "2.0", method: "notifications/initialized" })

      send({ jsonrpc: "2.0", id: 2, method: "tools/list" })
      const tools = (await waitFor(2)) as { result: { tools: Array<{ name: string }> } }
      assert.ok(tools.result.tools.length >= 16)

      send({
        jsonrpc: "2.0", id: 3, method: "tools/call",
        params: { name: "apex_init", arguments: { projectRoot: dir } },
      })
      const called = (await waitFor(3)) as { result: { content: Array<{ text: string }> } }
      assert.match(called.result.content[0]!.text, /"created"/)

      // MCP-009 over the real transport
      child.stdin.write("{ this is not json\n")
      send({ jsonrpc: "2.0", id: 4, method: "ping" })
      await waitFor(4)

      // MCP-001: every stdout frame must be valid protocol JSON — asserted by the
      // fact that parsing above never threw, plus this explicit shape check.
      for (const frame of frames) assert.equal(frame.jsonrpc, "2.0")
    } finally {
      child.stdin.end()
      child.kill()
    }
  })
})

// ── the silently-dropped-requirements incident ──────────────────────────────

describe("MCP-004/010 + PLG-014 — restored after an external scan found them missing", () => {
  test("the four previously-missing tools exist and are callable", async () => {
    await call("apex_init", { projectRoot: dir })
    for (const name of ["apex_delegate", "apex_subagent_status", "apex_council", "apex_findings"]) {
      assert.ok(TOOLS.some((t) => t.name === name), `${name} is not declared`)
    }
    const findings = await callJson<{ count: number }>("apex_findings")
    assert.equal(typeof findings.count, "number")
    const subs = await callJson<{ subagents: unknown[] }>("apex_subagent_status")
    assert.ok(Array.isArray(subs.subagents))
  })

  test("apex_delegate records the packet even when the host cannot spawn", async () => {
    await call("apex_init", { projectRoot: dir })
    const out = await callJson<{ spawned: boolean; note: string; packet: string }>("apex_delegate", {
      objective: "Implement the storage backend",
      allowedPaths: ["src/storage.ts"],
      acceptance: ["put() works", "mypy clean"],
    })
    assert.equal(out.spawned, false)
    assert.match(out.note, /do not report that a subagent ran/)
    assert.match(out.packet, /SUBAGENT TASK/)
    const subs = await callJson<{ subagents: Array<{ id: string }> }>("apex_subagent_status")
    assert.equal(subs.subagents.length, 1, "the packet is recorded BEFORE any spawn")
  })

  test("apex_council DECLINES routine work", async () => {
    await call("apex_init", { projectRoot: dir })
    const out = await call("apex_council", { reqId: "REQ-001", diff: "x", implementerModel: "m" })
    assert.match(out, /DECLINED/)
    assert.match(out, /verification is cheaper and stronger|disabled/)
  })

  test("MCP-010 — a heavy tier returns a task id instead of blocking", async () => {
    await call("apex_init", { projectRoot: dir })
    const out = await callJson<{ taskId: string; status: string; poll: string; note?: string }>("apex_verify", {
      reqIds: ["REQ-001"],
      maxTier: "suite",
    }) as { taskId: string; status: string; poll: string; note?: string }
    assert.match(out.taskId, /^T-\d+$/)
    assert.equal(out.status, "running")
    assert.equal(out.poll, "apex_task_result")
    assert.match(out.note ?? "", /Nothing is verified until it returns/)
  })

  test("MCP-010 — apex_task_result polls to completion", async () => {
    await call("apex_init", { projectRoot: dir })
    const started = await callJson<{ taskId: string }>("apex_verify", { reqIds: ["REQ-001"], maxTier: "suite" })
    let result = await callJson<{ status: string; verdict?: string }>("apex_task_result", { taskId: started.taskId })
    for (let i = 0; i < 60 && result.status === "running"; i++) {
      await new Promise((r) => setTimeout(r, 250))
      result = await callJson("apex_task_result", { taskId: started.taskId })
    }
    assert.equal(result.status, "done")
    assert.match(result.verdict!, /NOTHING RAN|PASSED|FAILED/)
  })

  test("an unknown task id is a teaching rejection", async () => {
    assert.match(await call("apex_task_result", { taskId: "T-999" }), /REJECTED: no task/)
  })

  test("PLG-014 — the plugin registers the same tools natively", async () => {
    const { apexTools } = await import("../../src/plugin/index.ts")
    const registry = apexTools(dir) as Record<string, { description: string; execute: (a: unknown) => Promise<string> }>
    for (const t of TOOLS) assert.ok(registry[t.name], `${t.name} not registered natively`)
    assert.equal(Object.keys(registry).length, TOOLS.length, "L1 and L2 surfaces must not drift")
    const out = await registry.apex_status!.execute({})
    assert.match(out, /totals/)
  })
})

describe("apex_models — FLT-004 pre-dispatch check", () => {
  test("returns a catalog and never suggests a substitute", async () => {
    await call("apex_init", { projectRoot: dir })
    const out = await callJson<{ models: unknown[]; count: number; note: string }>("apex_models")
    assert.ok(Array.isArray(out.models))
    assert.equal(typeof out.count, "number")
    // With no host reachable the answer must be "you cannot delegate", never "use another".
    assert.match(out.note, /never substitutes|not that any model may be used instead/)
  })

  test("is declared in the tool list", () => {
    assert.ok(TOOLS.some((t) => t.name === "apex_models"))
  })
})

describe("doc/code agreement — the mirror of the dropped-requirements bug", () => {
  // The first version of this test scanned MCP-SERVER.md only. A phantom `apex_fleet`
  // tool survived that round in OPENCODE-PLUGIN.md, outside the net — F-005's lesson
  // repeated by the very fix meant to prevent it. It scans EVERY build doc now.
  const DOCS = ["MCP-SERVER.md", "OPENCODE-PLUGIN.md", "REQUIREMENTS.md", "ARCHITECTURE.md", "ENGINES.md"]

  /** A doc may name an unimplemented tool only inside an explicit deferral section. */
  function documentedTools(doc: string): string[] {
    const withoutDeferrals = doc
      .split(/^#{2,4} .*DEFERRED.*$/im)
      .map((section, i) =>
        // Everything after a DEFERRED heading, up to the next heading of the same level,
        // is allowed to name tools that do not exist.
        i === 0 ? section : section.slice(section.search(/^#{2,3} /m) === -1 ? section.length : section.search(/^#{2,3} /m)),
      )
      .join("\n")

    const names = new Set<string>()
    // A tool is "documented as shipping" if it appears as a table row, a tool({ block key,
    // or a backticked name in prose.
    for (const m of withoutDeferrals.matchAll(/^\s*(apex_[a-z_]+):\s*tool\(\{/gm)) names.add(m[1]!)
    for (const m of withoutDeferrals.matchAll(/^\|\s*`(apex_[a-z_]+)`/gm)) names.add(m[1]!)
    for (const m of withoutDeferrals.matchAll(/`(apex_[a-z_]+)`/g)) names.add(m[1]!)
    return [...names]
  }

  for (const file of DOCS) {
    test(`${file} names no tool the code does not implement`, async () => {
      const fsp2 = await import("node:fs/promises")
      const docPath = path.resolve(RUNTIME, "..", "build", file)
      const doc = await fsp2.readFile(docPath, "utf8").catch(() => "")
      if (!doc) return

      const implemented = new Set(TOOLS.map((t) => t.name))
      const phantom = documentedTools(doc).filter((n) => !implemented.has(n))
      assert.deepEqual(
        phantom,
        [],
        `${file} documents tools that do not exist: ${phantom.join(", ")}. ` +
          `Implement them, or move them under a heading containing "DEFERRED" with the reason.`,
      )
    })
  }

  // A method can appear in a doc as a CALL (`e.warden.runFleet(`) or as a DECLARATION
  // (`async runFleet(order): Promise<...>`). The first version of this net parsed calls
  // only, so `runFleet` survived in ENGINES.md in declaration form. Both shapes now count.
  test("no build doc declares an engine method that does not exist", async () => {
    const fsp2 = await import("node:fs/promises")
    const srcDir = path.resolve(RUNTIME, "src")
    const readAll = async (dir: string, acc: string[] = []): Promise<string[]> => {
      for (const e of await fsp2.readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name)
        if (e.isDirectory()) await readAll(full, acc)
        else if (e.name.endsWith(".ts")) acc.push(await fsp2.readFile(full, "utf8"))
      }
      return acc
    }
    const source = (await readAll(srcDir)).join("\n")

    const phantom: string[] = []
    for (const file of DOCS) {
      const doc = await fsp2.readFile(path.resolve(RUNTIME, "..", "build", file), "utf8").catch(() => "")
      if (!doc) continue
      // A deferral section may declare what is deliberately not built. The runFleet
      // blockquote itself declares nothing, so remove ONLY that note — an earlier version
      // truncated the whole document at it, which is how `onWorkerFailure` and friends
      // survived this net in declaration form.
      const scanned = doc.replace(/^> \*\*There is no `\w+\(\)`[^\n]*(?:\n> [^\n]*)*/m, "")

      for (const m of scanned.matchAll(/^\s{2}(?:async\s+)?([a-z][A-Za-z0-9]*)\s*(?:\([^)]*\)|<)/gm)) {
        const method = m[1]!
        if (["constructor", "if", "for", "while", "return", "catch", "switch"].includes(method)) continue
        if (!new RegExp(`\\b${method}\\s*[(<:]`).test(source)) phantom.push(`${file}: ${method}()`)
      }
    }
    assert.deepEqual(
      [...new Set(phantom)],
      [],
      `build docs declare methods that do not exist: ${[...new Set(phantom)].join(", ")}`,
    )
  })

  // A doc can also name a TYPE that does not exist — an interface's return type, a
  // constructor's field type. `SubagentEventVerdict`, `RecoveryPlan` and `FleetReportInput`
  // in ENGINES.md survived every earlier net because they all parsed method shapes, not
  // identifiers. Any uppercase identifier in a ```ts block must be a type or constant the
  // source actually declares.
  test("no build doc names a type the source does not declare", async () => {
    const fsp2 = await import("node:fs/promises")
    const srcDir = path.resolve(RUNTIME, "src")
    const readAll = async (dir: string, acc: string[] = []): Promise<string[]> => {
      for (const e of await fsp2.readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name)
        if (e.isDirectory()) await readAll(full, acc)
        else if (e.name.endsWith(".ts")) acc.push(await fsp2.readFile(full, "utf8"))
      }
      return acc
    }
    const source = (await readAll(srcDir)).join("\n")

    const declared = new Set<string>()
    for (const m of source.matchAll(/\b(?:export\s+)?(?:interface|type|class|enum)\s+([A-Z][A-Za-z0-9_]*)\b/g)) declared.add(m[1]!)
    for (const m of source.matchAll(/\b(?:export\s+)?const\s+([A-Z][A-Za-z0-9_]*)\b/g)) declared.add(m[1]!)
    for (const m of source.matchAll(/\b(?:export\s+)?function\s+([A-Z][A-Za-z0-9_]*)\b/g)) declared.add(m[1]!)

    // Standard library and TypeScript utility types — real, but not declared in src.
    const builtins = new Set([
      "Promise", "Map", "Set", "WeakMap", "WeakSet", "Record", "Array", "Partial", "Pick",
      "Omit", "Readonly", "Exclude", "Extract", "NonNullable", "ReturnType", "Parameters",
      "Awaited", "Error", "Date", "RegExp", "JSON", "String", "Number", "Boolean", "Object",
      "Function", "Symbol", "BigInt", "Math", "Buffer", "NodeJS", "AsyncIterable", "Iterable",
      "AsyncIterator", "Iterator", "URL",
    ])

    const phantom: string[] = []
    for (const file of DOCS) {
      const doc = await fsp2.readFile(path.resolve(RUNTIME, "..", "build", file), "utf8").catch(() => "")
      if (!doc) continue
      for (const block of doc.matchAll(/```ts\n([\s\S]*?)```/g)) {
        // strip comments and string literals so filenames like "AGENTS.md" stay silent
        const code = block[1]!
          .split("\n")
          .map((l) => l.replace(/\/\/.*$/, "").replace(/"[^"]*"/g, "").replace(/'[^']*'/g, "").replace(/`[^`]*`/g, ""))
          .join("\n")
        for (const m of code.matchAll(/\b([A-Z][A-Za-z0-9_]*)\b/g)) {
          const name = m[1]!
          if (builtins.has(name) || declared.has(name)) continue
          phantom.push(`${file}: ${name}`)
        }
      }
    }
    assert.deepEqual(
      [...new Set(phantom)],
      [],
      `build docs name types the source does not declare: ${[...new Set(phantom)].join(", ")}`,
    )
  })

  test("no build doc calls an engine method that does not exist", async () => {
    const fsp2 = await import("node:fs/promises")
    const srcDir = path.resolve(RUNTIME, "src")
    const readAll = async (dir: string, acc: string[] = []): Promise<string[]> => {
      for (const e of await fsp2.readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name)
        if (e.isDirectory()) await readAll(full, acc)
        else if (e.name.endsWith(".ts")) acc.push(await fsp2.readFile(full, "utf8"))
      }
      return acc
    }
    const source = (await readAll(srcDir)).join("\n")

    const phantom: string[] = []
    for (const file of DOCS) {
      const doc = await fsp2
        .readFile(path.resolve(RUNTIME, "..", "build", file), "utf8")
        .catch(() => "")
      // Calls like `e.warden.runFleet(` or `ledger.setStatus(` in illustrative code.
      for (const m of doc.matchAll(/\b(?:e|this)\.(warden|ledger|verifier|governor|cortex|recall|council)\.(\w+)\(/g)) {
        const method = m[2]!
        if (!new RegExp(`\\b${method}\\s*[(<:]`).test(source)) phantom.push(`${file}: ${m[1]}.${method}()`)
      }
    }
    assert.deepEqual(
      [...new Set(phantom)],
      [],
      `build docs call engine methods that do not exist: ${[...new Set(phantom)].join(", ")}`,
    )
  })
})
