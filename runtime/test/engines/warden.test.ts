import { test, describe, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import fsp from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import {
  Warden, renderPacket, detectEvasions, FAILURE_RESPONSE, validateChildResult,
  type SubagentPacket, type FleetContext,
} from "../../src/engines/warden.ts"
const wardenModule = { validateChildResult }
import { Ledger, DEFAULT_CONFIG } from "../../src/engines/ledger.ts"
import { Governor } from "../../src/engines/governor.ts"
import { NullHostClient, type HostClient, type ModelRef, type SessionRef } from "../../src/host/types.ts"
import { UserDecisionRequired, ApexError } from "../../src/core/errors.ts"
import { setLogDir } from "../../src/core/log.ts"
import type { ApexConfig } from "../../src/core/types.ts"

let dir: string
let ledger: Ledger
let cfg: ApexConfig

class FakeHost extends NullHostClient implements HostClient {
  models: ModelRef[]
  created: SessionRef[] = []
  constructor(keys: string[]) {
    super()
    this.models = keys.map((k) => ({ key: k, providerId: k.split("/")[0] ?? k, modelId: k, name: k, connected: true }))
  }
  override async listModels(): Promise<ModelRef[]> {
    return this.models
  }
  override async createSession(title: string, parentId?: string): Promise<SessionRef> {
    const s = { id: `ses_${this.created.length + 1}`, parentId, title }
    this.created.push(s)
    return s
  }
  override async statusFor(models: string[]): Promise<Record<string, string>> {
    return Object.fromEntries(models.map((m) => [m, "not in the connected list"]))
  }
  override async isAvailable(): Promise<boolean> {
    return true
  }
}

beforeEach(async () => {
  dir = await fsp.mkdtemp(path.join(os.tmpdir(), "apex-warden-"))
  setLogDir(path.join(dir, "logs"))
  ledger = new Ledger(dir)
  const init = await ledger.init({
    projectRoot: dir,
    doNotTouch: ["config/prod.yaml"],
    delegation: { ...DEFAULT_CONFIG.delegation, models: { ...DEFAULT_CONFIG.delegation.models, workers: ["worker-a"] } },
  })
  cfg = init.config
})
afterEach(async () => {
  setLogDir(null)
  await fsp.rm(dir, { recursive: true, force: true })
})

function warden(overrides: Partial<ApexConfig> = {}, host: HostClient = new FakeHost(["worker-a", "worker-b", "reviewer-x"])): Warden {
  const merged = { ...cfg, ...overrides, delegation: { ...cfg.delegation, ...(overrides.delegation ?? {}) } }
  return new Warden(host, ledger, new Governor(merged), merged)
}

function packet(over: Partial<SubagentPacket> = {}): SubagentPacket {
  return {
    id: "W-0001", reqIds: ["REQ-001"], objective: "Implement S3 upload", context: "boto3 already a dep",
    readThese: ["src/storage.py"], allowedPaths: ["src/storage.py"], doNotRead: [".env"],
    doNotTouch: ["config/prod.yaml"], expectedOutput: "code + tests", acceptance: ["put() works", "mypy clean"],
    requiredVerification: ["pytest tests/test_storage.py"], model: "worker-a", role: "implementer",
    writer: true, timeoutMs: 900_000, checkpointIntervalMs: 600_000, alreadyExists: [],
    previousFailure: "", strategyChange: "", attempt: 1, maxAttempts: 2, fleetId: "FLEET-001", wave: 0,
    ...over,
  }
}

// ── WAR-001 ─────────────────────────────────────────────────────────────────

describe("WAR-001 — the packet carries every required field", () => {
  test("all mandatory sections are present", () => {
    const text = renderPacket(packet())
    for (const section of [
      "SUBAGENT TASK", "REQUIREMENT IDS", "OBJECTIVE", "CONTEXT YOU NEED", "READ THESE",
      "ALLOWED PATHS", "DO NOT READ", "DO NOT TOUCH", "EXPECTED OUTPUT", "ACCEPTANCE CRITERIA",
      "REQUIRED VERIFICATION", "CHECKPOINT REQUIREMENT", "SCOPE DISCIPLINE", "REPORT FORMAT",
    ]) {
      assert.ok(text.includes(section), `missing ${section}`)
    }
  })

  test("demands literal output, not a summary", () => {
    assert.match(renderPacket(packet()), /paste the LITERAL output\. Do not summarise it\./)
  })

  test("a retry packet states what must not be redone", () => {
    const text = renderPacket(packet({
      attempt: 2, alreadyExists: ["src/storage.py:1-120 put() and get() complete, 4 tests passing"],
      previousFailure: "context exhaustion while writing delete()",
      strategyChange: "None needed — the approach was right, the scope was too large.",
    }))
    assert.match(text, /ATTEMPT: 2 of 2/)
    assert.match(text, /WHAT ALREADY EXISTS — DO NOT REDO/)
    assert.match(text, /put\(\) and get\(\) complete/)
    assert.match(text, /WHY THE PREVIOUS ATTEMPT FAILED/)
    assert.match(text, /STRATEGY CHANGE/)
  })
})

// ── FLT-002, FLT-003 ────────────────────────────────────────────────────────

describe("FLT-002 — directed orders parse correctly", () => {
  const w = () => warden()

  test('"run 5 subagents on this"', () => {
    const o = w().parseOrder("run 5 subagents on this")!
    assert.equal(o.trigger, "DIRECTED")
    assert.equal(o.logicalWorkers, 5)
  })

  test('"use 50 workers"', () => {
    assert.equal(w().parseOrder("use 50 workers")!.logicalWorkers, 50)
  })

  test('"run the army on this" uses the configured maximum', () => {
    assert.equal(w().parseOrder("run the army on this")!.logicalWorkers, cfg.delegation.maxLogicalPackets)
  })

  test('"spawn a reviewer using worker-b"', () => {
    const o = w().parseOrder("spawn a reviewer using worker-b as the reviewer")!
    assert.equal(o.logicalWorkers, 1)
    assert.equal(o.models.reviewer, "worker-b")
    assert.ok(o.roles.includes("reviewer"))
  })

  test('"use worker-a for the workers and reviewer-x as the verifier"', () => {
    const o = w().parseOrder("run 4 workers: use worker-a for the workers and reviewer-x as the verifier")!
    assert.ok(o.models.workers.includes("worker-a"))
    assert.equal(o.models.reviewer, "reviewer-x")
  })

  test('"don\'t use subagents" means zero', () => {
    for (const phrase of ["don't use subagents", "do not use subagents", "no subagents", "do it yourself"]) {
      const o = w().parseOrder(phrase)!
      assert.equal(o.logicalWorkers, 0, phrase)
    }
  })

  test("ordinary prose is not an order", () => {
    assert.equal(w().parseOrder("please fix the auth bug"), null)
    assert.equal(w().parseOrder("the tests are failing"), null)
  })

  test("the count is capped at the configured maximum", () => {
    assert.equal(w().parseOrder("use 100000 workers")!.logicalWorkers, cfg.delegation.maxLogicalPackets)
  })

  test("restate makes a misparse obvious in one line", () => {
    const o = w().parseOrder("run 50 workers with worker-a as the workers and reviewer-x as the verifier")!
    const line = w().restate(o)
    assert.match(line, /50 logical work packet/)
    assert.match(line, /substitution = OFF/)
    assert.match(line, /writers = 1 per wave/)
  })
})

describe("FLT-003 — an order versus mode OFF", () => {
  test("mode OFF plus an order asks rather than silently resolving", () => {
    const w = warden({ delegation: { ...cfg.delegation, mode: "OFF" } })
    const result = w.reconcileOrderWithMode(w.parseOrder("run 5 subagents")!)
    assert.equal(result.proceed, false)
    assert.match(result.question, /Which wins/)
  })

  test("any other mode proceeds", () => {
    for (const mode of ["AUTO", "DIRECTED_ONLY", "AGGRESSIVE"] as const) {
      const w = warden({ delegation: { ...cfg.delegation, mode } })
      assert.equal(w.reconcileOrderWithMode(w.parseOrder("run 3 subagents")!).proceed, true, mode)
    }
  })
})

// ── FLT-004, FLT-005 — THE substitution law ─────────────────────────────────

describe("FLT-004 — a user-named model is NEVER substituted", () => {
  const order = (models: Partial<{ commander: string; workers: string[]; reviewer: string }>) => ({
    trigger: "DIRECTED" as const, raw: "", task: "t", logicalWorkers: 5,
    models: { commander: null, workers: [], reviewer: null, ...models }, roles: [], reqIds: [], criteria: [],
  })

  test("an unavailable named model stops everything and asks", async () => {
    const w = warden({}, new FakeHost(["worker-a"]))
    await assert.rejects(
      () => w.resolveModels(order({ workers: ["worker-a"], reviewer: "model-b" })),
      (err: unknown) => {
        assert.ok(err instanceof UserDecisionRequired)
        assert.deepEqual(err.unavailable, ["model-b"])
        assert.match(err.message, /Nothing was substituted/)
        assert.match(err.message, /Available right now: worker-a/)
        assert.match(err.message, /Which would you like, or should I wait\?/)
        return true
      },
    )
  })

  test("available models bind exactly as named", async () => {
    const resolved = await warden().resolveModels(order({ commander: "worker-a", workers: ["worker-a", "worker-b"], reviewer: "reviewer-x" }))
    assert.equal(resolved.commander, "worker-a")
    assert.deepEqual(resolved.workers, ["worker-a", "worker-b"])
    assert.equal(resolved.reviewer, "reviewer-x")
  })

  test("FLT-005 — a pre-authorised fallback is the ONLY exception", async () => {
    const w = warden(
      { delegation: { ...cfg.delegation, models: { ...cfg.delegation.models, fallback: { "model-b": "worker-b" } } } },
      new FakeHost(["worker-a", "worker-b"]),
    )
    const resolved = await w.resolveModels(order({ workers: ["worker-a"], reviewer: "model-b" }))
    assert.equal(resolved.reviewer, "worker-b", "the user's own fallback is honoured")
  })

  test("a fallback that is ALSO unavailable still stops and asks", async () => {
    const w = warden(
      { delegation: { ...cfg.delegation, models: { ...cfg.delegation.models, fallback: { "model-b": "model-c" } } } },
      new FakeHost(["worker-a"]),
    )
    await assert.rejects(() => w.resolveModels(order({ workers: ["worker-a"], reviewer: "model-b" })), UserDecisionRequired)
  })

  test("no models at all is a user decision, never a guess", async () => {
    const w = warden({}, new FakeHost([]))
    await assert.rejects(() => w.resolveModels(order({})), UserDecisionRequired)
  })
})

// ── FLT-006 — autonomous judgment ───────────────────────────────────────────

describe("FLT-006 — autonomous delegation needs >=2 criteria and an announcement", () => {
  const ctx = (over: Partial<FleetContext> = {}): FleetContext => ({
    disjointUnits: 0, sharedFiles: false, consecutiveFailures: 0, largeContextUnits: 0,
    readOnlyBroad: false, freshReviewerHelps: false, isFinalIntegration: false, ...over,
  })

  test("one criterion is not enough in AUTO", () => {
    assert.equal(warden().shouldDelegateAutonomously(ctx({ disjointUnits: 3 })).yes, false)
  })

  test("two criteria delegate, and announce first", () => {
    const r = warden().shouldDelegateAutonomously(ctx({ disjointUnits: 3, largeContextUnits: 1 }))
    assert.equal(r.yes, true)
    assert.match(r.announcement, /Delegating/)
    assert.match(r.announcement, /do it yourself/)
    assert.ok(r.criteria.length >= 2)
  })

  test("shared files always block delegation, however many criteria", () => {
    const r = warden().shouldDelegateAutonomously(ctx({ disjointUnits: 9, largeContextUnits: 3, sharedFiles: true }))
    assert.equal(r.yes, false)
    assert.match(r.criteria[0]!, /same files/)
  })

  test("final integration is never delegated", () => {
    const r = warden().shouldDelegateAutonomously(ctx({ disjointUnits: 5, largeContextUnits: 2, isFinalIntegration: true }))
    assert.equal(r.yes, false)
  })

  test("mode OFF and DIRECTED_ONLY never delegate on their own", () => {
    for (const mode of ["OFF", "DIRECTED_ONLY"] as const) {
      const w = warden({ delegation: { ...cfg.delegation, mode } })
      assert.equal(w.shouldDelegateAutonomously(ctx({ disjointUnits: 5, largeContextUnits: 2 })).yes, false, mode)
    }
  })

  test("AGGRESSIVE lowers the threshold to one", () => {
    const w = warden({ delegation: { ...cfg.delegation, mode: "AGGRESSIVE" } })
    assert.equal(w.shouldDelegateAutonomously(ctx({ disjointUnits: 3 })).yes, true)
  })

  test("the third consecutive failure is itself a criterion", () => {
    const r = warden().shouldDelegateAutonomously(ctx({ consecutiveFailures: 3, freshReviewerHelps: true }))
    assert.equal(r.yes, true)
  })
})

// ── FLT-007, FLT-008, FLT-009, FLT-010 ──────────────────────────────────────

describe("FLT-007 — the logical count is honoured exactly", () => {
  const order = (n: number) => ({
    trigger: "DIRECTED" as const, raw: "", task: "audit the repo", logicalWorkers: n,
    models: { commander: null, workers: [], reviewer: null }, roles: [], reqIds: ["REQ-001"], criteria: [],
  })

  test("50 requested produces 50 packets", () => {
    assert.equal(warden().decompose(order(50), []).length, 50)
  })

  test("packets cycle through the subtasks with distinct perspectives", () => {
    const packets = warden().decompose(order(6), [
      { title: "a", objective: "inventory", role: "researcher", dependsOn: [] },
      { title: "b", objective: "implement", role: "implementer", dependsOn: [] },
    ])
    assert.equal(packets.length, 6)
    assert.ok(packets[4]!.objective.includes("perspective"))
    assert.equal(new Set(packets.map((p) => p.id)).size, 6, "ids are unique")
  })

  test("zero means zero", () => {
    assert.deepEqual(warden().decompose(order(0), []), [])
  })

  test("the cap is enforced", () => {
    const w = warden({ delegation: { ...cfg.delegation, maxLogicalPackets: 10 } })
    assert.equal(w.decompose(order(500), []).length, 10)
  })
})

describe("FLT-008 — dependency waves", () => {
  const mk = (n: number) => Array.from({ length: n }, (_, i) => packet({ id: `W-000${i + 1}` }))

  test("independent packets share one wave", () => {
    const waves = warden().buildWaves(mk(3))
    assert.equal(waves.length, 1)
    assert.equal(waves[0]!.length, 3)
  })

  test("dependencies produce ordered waves", () => {
    const packets = mk(3)
    const deps = new Map([["W-0002", ["W-0001"]], ["W-0003", ["W-0002"]]])
    const waves = warden().buildWaves(packets, deps)
    assert.equal(waves.length, 3)
    assert.equal(waves[0]![0]!.id, "W-0001")
    assert.equal(waves[2]![0]!.id, "W-0003")
  })

  test("a cycle is rejected rather than executed", () => {
    const deps = new Map([["W-0001", ["W-0002"]], ["W-0002", ["W-0001"]]])
    assert.throws(() => warden().buildWaves(mk(2), deps), /cycle detected/)
  })

  test("an unknown dependency is rejected", () => {
    assert.throws(() => warden().buildWaves(mk(1), new Map([["W-0001", ["W-9999"]]])), /unknown packet/)
  })

  test("each packet records its wave index", () => {
    const packets = mk(2)
    warden().buildWaves(packets, new Map([["W-0002", ["W-0001"]]]))
    assert.equal(packets[0]!.wave, 0)
    assert.equal(packets[1]!.wave, 1)
  })
})

describe("FLT-010 — write safety", () => {
  test("only writersPerWave packets get write access", () => {
    const wave = [packet({ id: "A" }), packet({ id: "B" }), packet({ id: "C" })]
    const assigned = warden().assign(wave, { workers: ["worker-a", "worker-b"], reviewer: null }, "FLEET-001")
    assert.equal(assigned.filter((p) => p.writer).length, 1)
  })

  test("reviewers never write and get the reviewer model", () => {
    const wave = [packet({ id: "A", role: "reviewer" })]
    const [assigned] = warden().assign(wave, { workers: ["worker-a"], reviewer: "reviewer-x" }, "F")
    assert.equal(assigned!.writer, false)
    assert.equal(assigned!.model, "reviewer-x")
  })

  test("worktree isolation permits every implementer to write", () => {
    const w = warden({ delegation: { ...cfg.delegation, isolation: "worktree" } })
    const wave = [packet({ id: "A" }), packet({ id: "B" })]
    assert.equal(w.assign(wave, { workers: ["worker-a"], reviewer: null }, "F").filter((p) => p.writer).length, 2)
  })

  test("WAR-011 — overlapping writers are refused with the conflict named", () => {
    const wave = [
      packet({ id: "A", writer: true, allowedPaths: ["src/"] }),
      packet({ id: "B", writer: true, allowedPaths: ["src/storage.py"] }),
    ]
    const result = warden().checkWriteSafety(wave)
    assert.equal(result.safe, false)
    assert.match(result.conflict, /A and B/)
  })

  test("disjoint writers under worktree isolation are safe", () => {
    const w = warden({ delegation: { ...cfg.delegation, isolation: "worktree", writersPerWave: 2 } })
    const wave = [
      packet({ id: "A", writer: true, allowedPaths: ["src/a.py"] }),
      packet({ id: "B", writer: true, allowedPaths: ["src/b.py"] }),
    ]
    assert.equal(w.checkWriteSafety(wave).safe, true)
  })
})

// ── WAR-002, WAR-003 ────────────────────────────────────────────────────────

describe("WAR-002/003 — dispatch records before spawning", () => {
  test("the packet survives an immediate crash", async () => {
    const host = new FakeHost(["worker-a"])
    const record = await warden({}, host).dispatch(packet())
    assert.equal(record.state, "RUNNING")
    assert.equal(record.sessionId, "ses_1")
    const stored = (await ledger.listSubagents()).find((s) => s.id === "W-0001")!
    assert.equal(stored.model, "worker-a")
    assert.deepEqual(stored.allowedPaths, ["src/storage.py"])
  })

  test("a child session is linked to its parent", async () => {
    const host = new FakeHost(["worker-a"])
    await warden({}, host).dispatch(packet(), "ses_parent")
    assert.equal(host.created[0]!.parentId, "ses_parent")
  })
})

// ── WAR-004, WAR-005 ────────────────────────────────────────────────────────

describe("WAR-004/005 — supervision detects all four conditions", () => {
  const w = () => warden()

  test("session.error is a crash", () => {
    assert.equal(w().classifyEvent({ type: "session.error" }, packet(), false), "crash")
  })

  test("a write outside ALLOWED PATHS is scope drift", () => {
    assert.equal(w().classifyEvent({ type: "file.edited", path: "config/prod.yaml" }, packet(), false), "scope_drift")
  })

  test("a write inside ALLOWED PATHS is fine", () => {
    assert.equal(w().classifyEvent({ type: "file.edited", path: "src/storage.py" }, packet(), false), null)
  })

  test("idle with unmet criteria is a FAILURE, not a completion", () => {
    assert.equal(w().classifyEvent({ type: "session.idle" }, packet(), false), "idle_unfinished")
  })

  test("idle with met criteria is done", () => {
    assert.equal(w().classifyEvent({ type: "session.idle" }, packet(), true), "done")
  })

  test("message updates are checkpoints", () => {
    assert.equal(w().classifyEvent({ type: "message.updated" }, packet(), false), "checkpoint")
  })

  test("checkpoints are persisted", async () => {
    const wd = warden()
    await wd.dispatch(packet())
    await wd.recordCheckpoint("W-0001", "put() done, starting get()", ["src/storage.py"])
    const stored = (await ledger.listSubagents()).find((s) => s.id === "W-0001")!
    assert.equal(stored.state, "CHECKPOINTED")
    assert.match(stored.checkpoint, /put\(\) done/)
    assert.deepEqual(stored.filesChanged, ["src/storage.py"])
  })
})

// ── WAR-006, WAR-007, WAR-008 ───────────────────────────────────────────────

describe("WAR-006/007 — recovery resumes, never restarts", () => {
  test("the replacement packet states what already exists", async () => {
    const wd = warden()
    await wd.dispatch(packet())
    await wd.recordCheckpoint("W-0001", "put() and get() complete, 4 tests passing")

    const { packet: replacement, escalate } = await wd.recover("W-0001", "context_exhaustion", [
      "src/storage.py:1-120 put() and get() complete, mypy clean",
    ])
    assert.equal(escalate, false)
    assert.equal(replacement!.attempt, 2)
    assert.equal(replacement!.model, "worker-a", "FLT-011 — the SAME model")
    assert.match(replacement!.alreadyExists[0]!, /put\(\) and get\(\) complete/)
    assert.match(replacement!.previousFailure, /context_exhaustion/)
    assert.match(renderPacket(replacement!), /DO NOT REDO/)
  })

  test("a wrong-approach failure forces a strategy change, not a retry", async () => {
    const wd = warden()
    await wd.dispatch(packet())
    const { packet: replacement, escalate, reason } = await wd.recover("W-0001", "wrong_approach", [])
    assert.equal(replacement, null)
    assert.equal(escalate, true)
    assert.match(reason, /must not be retried the same way/)
  })

  test("fabricated success stops delegation for this task", async () => {
    const wd = warden()
    await wd.dispatch(packet())
    const { escalate, reason } = await wd.recover("W-0001", "fabricated_success", [])
    assert.equal(escalate, true)
    assert.match(reason, /back in-house/)
  })

  test("WAR-008 — the retry ceiling escalates and keeps the requirement visible", async () => {
    const wd = warden()
    await wd.dispatch(packet({ maxAttempts: 2 }))
    await wd.recover("W-0001", "crash", [])
    const second = await wd.recover("W-0001", "crash", [])
    assert.equal(second.escalate, true)
    assert.match(second.reason, /not dropped/)
    const stored = (await ledger.listSubagents()).find((s) => s.id === "W-0001")!
    assert.equal(stored.state, "REJECTED")
  })

  test("an unknown subagent is a clean error", async () => {
    await assert.rejects(() => warden().recover("W-9999", "crash", []), ApexError)
  })
})

// ── FLT-011, FLT-012, FLT-013, FLT-016 ──────────────────────────────────────

describe("FLT-011/012/013 — redistribution stays within the model class", () => {
  test("another worker of the SAME model takes the packet", async () => {
    const r = await warden().redistribute(packet(), "worker-a", ["worker-a"], false)
    assert.equal(r.action, "requeue")
    assert.match(r.message, /Not switching models/)
  })

  test("class exhausted asks the user and keeps other work running", async () => {
    const r = await warden().redistribute(packet(), "worker-a", [], false)
    assert.equal(r.action, "ask_user")
    assert.match(r.message, /have not substituted/)
    assert.match(r.message, /Independent packets are still running/)
  })

  test("all classes down stops, persists, and never falls back", async () => {
    const r = await warden().redistribute(packet(), "worker-a", [], true)
    assert.equal(r.action, "stop")
    assert.match(r.message, /Everything is saved/)
    assert.match(r.message, /not fallen back to a model you did not choose/)
    const progress = await fsp.readFile(ledger.file("PROGRESS.md"), "utf8")
    assert.match(progress, /All worker classes are unavailable/)
  })

  test("FLT-016 — a rate limit retries the SAME model", () => {
    assert.equal(FAILURE_RESPONSE.rate_limit.retrySameModel, true)
    assert.equal(FAILURE_RESPONSE.rate_limit.narrow, false)
  })
})

// ── WAR-010 ─────────────────────────────────────────────────────────────────

describe("WAR-010 — parent verification is mandatory and complete", () => {
  const good = {
    diff: "+ def delete(self, key): ...",
    changedFiles: ["src/storage.py"],
    criteriaMet: [true, true],
    rerunPassed: true,
    integrationPassed: true,
  }

  test("all seven checks passing accepts", async () => {
    const wd = warden()
    await wd.dispatch(packet())
    const r = await wd.verifyResult("W-0001", good)
    assert.equal(r.accepted, true)
    assert.equal(Object.values(r.checks).every(Boolean), true)
    assert.equal((await ledger.listSubagents())[0]!.state, "VERIFIED_ACCEPTED")
  })

  test("a subagent's own claim never accepts on its own", async () => {
    const wd = warden()
    await wd.dispatch(packet())
    const r = await wd.verifyResult("W-0001", { ...good, rerunPassed: false })
    assert.equal(r.accepted, false)
    assert.ok(r.defects.some((d) => d.includes("re-run")))
  })

  test("one unmet criterion out of two is a rejection", async () => {
    const wd = warden()
    await wd.dispatch(packet())
    const r = await wd.verifyResult("W-0001", { ...good, criteriaMet: [true, false] })
    assert.equal(r.accepted, false)
    assert.ok(r.defects.some((d) => d.includes("criterion 2")))
  })

  test("out-of-scope writes are rejected", async () => {
    const wd = warden()
    await wd.dispatch(packet())
    const r = await wd.verifyResult("W-0001", { ...good, changedFiles: ["src/storage.py", "src/other.py"] })
    assert.equal(r.accepted, false)
    assert.ok(r.defects.some((d) => d.includes("outside ALLOWED PATHS")))
  })

  test("a protected-path write is rejected", async () => {
    const wd = warden()
    await wd.dispatch(packet({ allowedPaths: ["src/storage.py", "config/prod.yaml"] }))
    const r = await wd.verifyResult("W-0001", { ...good, changedFiles: ["config/prod.yaml"] })
    assert.equal(r.accepted, false)
    assert.ok(r.defects.some((d) => d.includes("protected path")))
  })

  test("no diff means the work could not be inspected", async () => {
    const wd = warden()
    await wd.dispatch(packet())
    const r = await wd.verifyResult("W-0001", { ...good, diff: null })
    assert.equal(r.accepted, false)
  })

  test("evasions are detected in the diff", async () => {
    const wd = warden()
    await wd.dispatch(packet())
    const r = await wd.verifyResult("W-0001", { ...good, diff: "+ @pytest.mark.skip\n+ def test_x(): ..." })
    assert.equal(r.accepted, false)
    assert.ok(r.defects.some((d) => d.includes("evasion")))
  })
})

describe("detectEvasions", () => {
  const cases: Array<[string, string]> = [
    ["+    @pytest.mark.skip", "skipped"],
    ["+  it.skip('x', () => {})", "skipped"],
    ["+        assert True", "weakened"],
    ["+    raise NotImplementedError", "stub"],
    ["+  # TODO finish this", "stub"],
  ]
  for (const [diff, expect] of cases) {
    test(`catches: ${diff.trim()}`, () => {
      assert.ok(detectEvasions(diff).some((e) => e.includes(expect)), JSON.stringify(detectEvasions(diff)))
    })
  }

  test("an honest diff is clean", () => {
    assert.deepEqual(detectEvasions("+ def delete(self, key):\n+     self.client.delete_object(Key=key)"), [])
  })

  test("a removed assertion with no replacement is caught", () => {
    assert.ok(detectEvasions("-    assert result == 42\n+    return result").length > 0)
  })
})

// ── FLT-014, FLT-015, FLT-017 ───────────────────────────────────────────────

describe("FLT-014/015 — the fleet report", () => {
  const base = {
    fleetId: "FLEET-001", trigger: "DIRECTED" as const, logicalPackets: 50, waves: 4,
    modelsCalled: { "worker-a": 15, "reviewer-x": 3 }, modelsUnavailable: ["model-b"],
  }

  test("a reconciling tally reports clean", () => {
    const r = warden().buildReport({
      ...base,
      tally: { COMPLETED_VERIFIED: 47, COMPLETED_REJECTED: 1, FAILED_REDISTRIBUTED: 1, SKIPPED_DEPENDENCY: 1 },
    })
    assert.equal(r.reconciles, true)
    assert.equal(r.terminal, 50)
    assert.equal(r.physicalCalls, 18)
  })

  test("FLT-014 — a mismatch is reported as corruption, not smoothed over", () => {
    const r = warden().buildReport({ ...base, tally: { COMPLETED_VERIFIED: 40 } })
    assert.equal(r.reconciles, false)
    assert.ok(r.notes.some((n) => n.includes("DOES NOT RECONCILE")))
    assert.match(warden().renderReport(r), /DOES NOT RECONCILE/)
  })

  test("FLT-015 — a model with zero calls is never reported as used", () => {
    const r = warden().buildReport({
      ...base,
      modelsCalled: { "worker-a": 15, "never-called": 0 },
      tally: { COMPLETED_VERIFIED: 50 },
    })
    assert.ok(!("never-called" in r.modelsCalled))
    assert.ok(r.notes.some((n) => n.includes("model-b") && n.includes("NOT substituted")))
  })

  test("the rendered report shows the unavailable model honestly", () => {
    const text = warden().renderReport(warden().buildReport({ ...base, tally: { COMPLETED_VERIFIED: 50 } }))
    assert.match(text, /model-b — requested, unreachable, 0 calls, NOT substituted/)
    assert.match(text, /50 dispatched, 50 terminal ✓/)
  })

  test("FLT-017 — a host without subagents says so instead of claiming a fleet", () => {
    const r = warden().buildReport({ ...base, tally: { COMPLETED_VERIFIED: 50 }, sequentialFallback: true })
    assert.ok(r.notes.some((n) => n.includes("SEQUENTIALLY") && n.includes("no fleet ran")))
  })
})

describe("no host available", () => {
  test("dispatch fails with a clear message rather than pretending", async () => {
    const w = new Warden(new NullHostClient(), ledger, new Governor(cfg), cfg)
    await assert.rejects(() => w.dispatch(packet()), /cannot spawn subagents/)
  })
})

// ── WP-048 — subagent learning restriction (26 §§4–5, 7) ──────────────────────

describe("WP-048 — children propose, parents promote (LRNT-T03, FLT-T02)", () => {
  test("a child result with proposals returns them as PROPOSALS, never promoted", () => {
    const home = path.join(dir, "globalhome")
    const validated = validateChildResult(
      {
        taskId: "W-0001",
        status: "COMPLETE",
        claims: [{ text: "migrations are compatible", evidenceIds: ["VER-1"], confidence: "HIGH" }],
        changedPaths: [],
        proposedMemory: [{ text: "use pnpm in this project" }],
        proposedSkills: [{ title: "verify-cascade", content: "---\nname: verify-cascade\n---\n# Goal\nx" }],
        unresolved: [],
      },
      home,
    )

    assert.equal(validated.proposalCount, 2, "both proposals are counted")
    assert.deepEqual(validated.globalWriteAttempts, [], "no global paths were touched")
    // The proposals remain DATA on the result — there is no activation path here.
    assert.equal(validated.result.proposedSkills!.length, 1)
    assert.equal(validated.result.proposedMemory!.length, 1)
  })

  test("LRNT-T03/FLT-T02/HOME-T04: a child claiming writes into global stores is FLAGGED, not trusted", () => {
    const home = path.join(dir, "globalhome")
    const validated = validateChildResult(
      {
        taskId: "W-0002",
        status: "COMPLETE",
        claims: [],
        changedPaths: [
          path.join(dir, "project", "src", "ok-file.ts"),
          path.join(home, "skills", "engineering", "hacked", "SKILL.md"),
          path.join(home, "memory", "memory.json"),
        ],
        unresolved: [],
      },
      home,
    )

    assert.equal(validated.globalWriteAttempts.length, 2, "both global writes are named")
    assert.ok(validated.globalWriteAttempts.some((p) => p.includes("skills")))
    assert.ok(validated.globalWriteAttempts.some((p) => p.includes("memory")))
    // The project-local path is NOT a violation.
    assert.ok(!validated.globalWriteAttempts.some((p) => p.includes("ok-file.ts")))
  })

  test("path-shape detection survives differently-spelled roots and pending quarantine", () => {
    // Root spelled with backslashes; child reports forward slashes.
    const home = path.join(dir, "globalhome")
    const validated = validateChildResult(
      {
        taskId: "W-0003",
        status: "COMPLETE",
        claims: [],
        changedPaths: [
          home.split(path.sep).join("/") + "/trust/skills.json",
          path.join(home, "skills", "pending", "legit-candidate.json"),
        ],
        unresolved: [],
      },
      home,
    )

    assert.ok(validated.globalWriteAttempts.some((p) => p.includes("trust/skills.json")), "trust writes are violations")
    assert.ok(
      !validated.globalWriteAttempts.some((p) => p.includes("pending")),
      "staging a candidate in skills/pending/ is the LEGAL path, not a violation",
    )
  })
})
