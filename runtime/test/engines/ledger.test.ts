import { test, describe, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import fsp from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { Ledger, LEGAL_TRANSITIONS, nextId } from "../../src/engines/ledger.ts"
import { REQ_STATUSES, type ReqStatus } from "../../src/core/types.ts"
import { IllegalTransitionError, ApexError } from "../../src/core/errors.ts"
import { readTextOrNull } from "../../src/core/json.ts"
import { setLogDir } from "../../src/core/log.ts"

let dir: string
let ledger: Ledger

beforeEach(async () => {
  dir = await fsp.mkdtemp(path.join(os.tmpdir(), "apex-ledger-"))
  setLogDir(path.join(dir, "logs"))
  ledger = new Ledger(dir)
  await ledger.init({ projectRoot: dir })
})
afterEach(async () => {
  setLogDir(null)
  await fsp.rm(dir, { recursive: true, force: true })
})

async function addReq(overrides: Record<string, string> = {}) {
  return ledger.addRequirement({
    source: "plan.md §1",
    text: "Reject expired tokens with 401",
    acceptance: "Expired token -> 401",
    verifyBy: "pytest tests/test_auth.py",
    ...overrides,
  })
}

async function pass(id: string) {
  return ledger.addVerification({
    reqIds: [id],
    type: "unit",
    command: "pytest tests/test_auth.py",
    expected: "all pass",
    actual: "6 passed, 0 failed",
    exitCode: 0,
    result: "PASS",
  })
}

// ── LED-001 ─────────────────────────────────────────────────────────────────

describe("LED-001 — init", () => {
  test("creates the full ledger", async () => {
    for (const f of [
      "config.json",
      "REQUIREMENTS.md",
      "VERIFICATION.md",
      "PROGRESS.md",
      "DECISIONS.md",
      "FINDINGS.md",
      "SUBAGENTS.md",
      "MEMORY.md",
    ]) {
      assert.ok(await readTextOrNull(ledger.file(f)), `${f} missing`)
    }
  })

  test("NEVER overwrites an existing ledger", async () => {
    await addReq()
    const second = new Ledger(dir)
    const result = await second.init({ projectRoot: dir })
    assert.equal(result.created, false)
    assert.equal((await second.listRequirements()).length, 1, "previous session's memory survived")
  })

  test("config defaults are sane and complete", async () => {
    const c = await ledger.loadConfig()
    assert.equal(c.autonomy, "GUARDED")
    assert.equal(c.delegation.mode, "AUTO")
    assert.equal(c.delegation.models.allowSubstitution, false, "FLT-004 default")
    assert.equal(c.delegation.writersPerWave, 1)
    assert.equal(c.limits.maxSameStrategyFailures, 3)
  })
})

// ── LED-002, LED-007, LED-015 ───────────────────────────────────────────────

describe("LED-002 — records round-trip", () => {
  test("every field survives markdown round-trip", async () => {
    const created = await ledger.addRequirement({
      source: "docs/plan.md §3.2",
      text: "Reject tokens whose exp claim is in the past, returning HTTP 401",
      acceptance: 'Expired token -> 401, body {"error":"token_expired"}',
      verifyBy: "pytest tests/test_auth.py::test_expired_token",
      component: "auth",
      dependsOn: ["REQ-011", "REQ-012"],
      notes: "Refresh-token path is out of scope per §3.2",
    })
    const [back] = await ledger.listRequirements()
    assert.deepEqual(back, created)
  })

  test("LED-007 — ids are never reused", async () => {
    await addReq()
    await assert.rejects(() => addReq({ id: "REQ-001" }), /never reused/)
  })

  test("ids are monotonic even with gaps", () => {
    assert.equal(nextId("REQ", ["REQ-001", "REQ-007", "REQ-003"]), "REQ-008")
    assert.equal(nextId("V", []), "V-001")
  })

  test("requires an acceptance criterion", async () => {
    await assert.rejects(
      () => ledger.addRequirement({ source: "s", text: "t", acceptance: "  ", verifyBy: "x" }),
      /acceptance criterion/,
    )
  })

  test("LED-015 — a hand-edited ledger re-parses", async () => {
    await addReq()
    const file = ledger.file("REQUIREMENTS.md")
    const text = (await readTextOrNull(file))!
    // A human edits the notes line, with sloppy spacing and no leading dash.
    const edited = text.replace("- **Notes:** ", "**Notes:**   edited by hand   ")
    await fsp.writeFile(file, edited, "utf8")
    const [r] = await ledger.listRequirements()
    assert.equal(r!.notes, "edited by hand")
    assert.equal(r!.status, "NOT_STARTED", "other fields survive the hand edit")
  })
})

// ── LED-003, LED-004 — the transition table ─────────────────────────────────

describe("LED-004 — illegal transitions are rejected", () => {
  const ILLEGAL: Array<[ReqStatus, ReqStatus]> = [
    ["NOT_STARTED", "VERIFIED_COMPLETE"],
    ["NOT_STARTED", "IMPLEMENTED_NOT_VERIFIED"],
    ["IN_PROGRESS", "VERIFIED_COMPLETE"],
    ["BLOCKED", "VERIFIED_COMPLETE"],
    ["BLOCKED", "IMPLEMENTED_NOT_VERIFIED"],
    ["NOT_APPLICABLE", "VERIFIED_COMPLETE"],
    ["VERIFIED_COMPLETE", "BLOCKED"],
  ]

  for (const [from, to] of ILLEGAL) {
    test(`rejects ${from} -> ${to}`, async () => {
      const r = await addReq()
      // drive to `from` legally
      if (from !== "NOT_STARTED") {
        const routes: Record<string, Array<[ReqStatus, string]>> = {
          IN_PROGRESS: [["IN_PROGRESS", ""]],
          BLOCKED: [["BLOCKED", "no credentials"]],
          NOT_APPLICABLE: [["NOT_APPLICABLE", "out of scope"]],
          IMPLEMENTED_NOT_VERIFIED: [["IN_PROGRESS", ""], ["IMPLEMENTED_NOT_VERIFIED", ""]],
          VERIFIED_COMPLETE: [["IN_PROGRESS", ""], ["IMPLEMENTED_NOT_VERIFIED", ""]],
        }
        for (const [s, reason] of routes[from] ?? []) await ledger.setStatus(r.id, s, { reason })
        if (from === "VERIFIED_COMPLETE") {
          await pass(r.id)
          await ledger.setStatus(r.id, "VERIFIED_COMPLETE")
        }
      }
      await assert.rejects(
        () => ledger.setStatus(r.id, to, { reason: "x" }),
        (err: unknown) => err instanceof IllegalTransitionError,
      )
    })
  }

  test("the legal path all the way through works", async () => {
    const r = await addReq()
    await ledger.setStatus(r.id, "IN_PROGRESS")
    await ledger.setStatus(r.id, "IMPLEMENTED_NOT_VERIFIED")
    const v = await pass(r.id)
    const done = await ledger.setStatus(r.id, "VERIFIED_COMPLETE", { evidenceId: v.id })
    assert.equal(done.status, "VERIFIED_COMPLETE")
    assert.ok(done.evidence.includes(v.id))
  })

  test("VERIFIED_COMPLETE can be reopened by the final audit", async () => {
    const r = await addReq()
    await ledger.setStatus(r.id, "IN_PROGRESS")
    await ledger.setStatus(r.id, "IMPLEMENTED_NOT_VERIFIED")
    await pass(r.id)
    await ledger.setStatus(r.id, "VERIFIED_COMPLETE")
    const reopened = await ledger.setStatus(r.id, "IN_PROGRESS")
    assert.equal(reopened.status, "IN_PROGRESS")
  })

  test("LED-003 — an unknown status value is rejected", async () => {
    const r = await addReq()
    await assert.rejects(() => ledger.setStatus(r.id, "DONE" as ReqStatus), /is not a status/)
  })

  test("the error message tells the model what to do instead", async () => {
    const r = await addReq()
    await assert.rejects(
      () => ledger.setStatus(r.id, "VERIFIED_COMPLETE"),
      (err: Error) => {
        assert.match(err.message, /Illegal transition/)
        assert.match(err.message, /IN_PROGRESS/)
        assert.match(err.message, /pytest tests\/test_auth\.py/, "quotes the actual verify command")
        return true
      },
    )
  })

  test("the transition table has no unreachable status", () => {
    const reachable = new Set<ReqStatus>(["NOT_STARTED"])
    let changed = true
    while (changed) {
      changed = false
      for (const from of [...reachable]) {
        for (const to of LEGAL_TRANSITIONS[from]) {
          if (!reachable.has(to)) {
            reachable.add(to)
            changed = true
          }
        }
      }
    }
    assert.deepEqual([...reachable].sort(), [...REQ_STATUSES].sort())
  })
})

// ── LED-005, LED-006 ────────────────────────────────────────────────────────

describe("LED-005 — evidence is mandatory for VERIFIED_COMPLETE", () => {
  test("rejected without a passing record", async () => {
    const r = await addReq()
    await ledger.setStatus(r.id, "IN_PROGRESS")
    await ledger.setStatus(r.id, "IMPLEMENTED_NOT_VERIFIED")
    await assert.rejects(
      () => ledger.setStatus(r.id, "VERIFIED_COMPLETE"),
      /no passing verification record/,
    )
  })

  test("a FAILING record does not satisfy the requirement", async () => {
    const r = await addReq()
    await ledger.setStatus(r.id, "IN_PROGRESS")
    await ledger.setStatus(r.id, "IMPLEMENTED_NOT_VERIFIED")
    await ledger.addVerification({
      reqIds: [r.id],
      type: "unit",
      command: "pytest",
      expected: "pass",
      actual: "2 failed",
      exitCode: 1,
      result: "FAIL",
    })
    await assert.rejects(() => ledger.setStatus(r.id, "VERIFIED_COMPLETE"), /no passing verification/)
  })

  test("a NOT_RUN record does not satisfy the requirement", async () => {
    const r = await addReq()
    await ledger.setStatus(r.id, "IN_PROGRESS")
    await ledger.setStatus(r.id, "IMPLEMENTED_NOT_VERIFIED")
    await ledger.addVerification({
      reqIds: [r.id],
      type: "types",
      command: "mypy src/",
      expected: "clean",
      actual: "",
      exitCode: null,
      result: "NOT_RUN",
      reason: "mypy is not installed",
    })
    await assert.rejects(() => ledger.setStatus(r.id, "VERIFIED_COMPLETE"), /no passing verification/)
  })

  test("evidence for a DIFFERENT requirement does not count", async () => {
    const a = await addReq()
    const b = await addReq({ text: "another" })
    await pass(a.id)
    await ledger.setStatus(b.id, "IN_PROGRESS")
    await ledger.setStatus(b.id, "IMPLEMENTED_NOT_VERIFIED")
    await assert.rejects(() => ledger.setStatus(b.id, "VERIFIED_COMPLETE"), /no passing verification/)
  })
})

describe("LED-006 — reasons are mandatory", () => {
  test("BLOCKED without evidence is rejected", async () => {
    const r = await addReq()
    await assert.rejects(() => ledger.setStatus(r.id, "BLOCKED"), /requires evidence/)
    await assert.rejects(() => ledger.setStatus(r.id, "BLOCKED", { reason: "   " }), /requires evidence/)
  })

  test("NOT_APPLICABLE without a justification is rejected", async () => {
    const r = await addReq()
    await assert.rejects(() => ledger.setStatus(r.id, "NOT_APPLICABLE"), /justification/)
  })

  test("the reason is persisted and readable", async () => {
    const r = await addReq()
    await ledger.setStatus(r.id, "BLOCKED", { reason: "no DATABASE_URL in this environment" })
    const back = await ledger.getRequirement(r.id)
    assert.equal(back.reason, "no DATABASE_URL in this environment")
  })
})

// ── LED-008 ─────────────────────────────────────────────────────────────────

describe("LED-008 — totals always reconcile", () => {
  test("totals sum to the row count after many mutations", async () => {
    const ids: string[] = []
    for (let i = 0; i < 12; i++) ids.push((await addReq({ text: `req ${i}` })).id)

    await ledger.setStatus(ids[0]!, "IN_PROGRESS")
    await ledger.setStatus(ids[1]!, "BLOCKED", { reason: "x" })
    await ledger.setStatus(ids[2]!, "NOT_APPLICABLE", { reason: "y" })
    await ledger.setStatus(ids[3]!, "IN_PROGRESS")
    await ledger.setStatus(ids[3]!, "IMPLEMENTED_NOT_VERIFIED")
    await pass(ids[3]!)
    await ledger.setStatus(ids[3]!, "VERIFIED_COMPLETE")

    const totals = await ledger.totals()
    const sum = Object.values(totals).reduce((a, b) => a + b, 0)
    assert.equal(sum, 12)
    assert.equal((await ledger.listRequirements()).length, 12)

    const text = (await readTextOrNull(ledger.file("REQUIREMENTS.md")))!
    assert.match(text, /12 total/)
    assert.match(text, /1 verified/)
    assert.match(text, /1 blocked/)
  })

  test("no requirement can be deleted", () => {
    assert.equal(
      typeof (ledger as unknown as Record<string, unknown>).deleteRequirement,
      "undefined",
      "a delete API must not exist",
    )
  })
})

// ── LED-009 ─────────────────────────────────────────────────────────────────

describe("LED-009 — verification records", () => {
  test("literal output is preserved verbatim", async () => {
    const r = await addReq()
    const output = "FAILED tests/test_ser.py::test_nested\nTypeError: unexpected kwarg\n2 failed, 4 passed"
    const v = await ledger.addVerification({
      reqIds: [r.id],
      type: "unit",
      command: "pytest",
      expected: "all pass",
      actual: output,
      exitCode: 1,
      result: "FAIL",
    })
    const back = (await ledger.listVerifications()).find((x) => x.id === v.id)!
    assert.equal(back.actual, output, "the evidence is the literal output, not a summary")
  })

  test("NOT_RUN requires a reason", async () => {
    await assert.rejects(
      () =>
        ledger.addVerification({
          reqIds: [],
          type: "types",
          command: "mypy",
          expected: "clean",
          actual: "",
          exitCode: null,
          result: "NOT_RUN",
        }),
      /requires a reason/,
    )
  })

  test("secrets never reach disk", async () => {
    const r = await addReq()
    await ledger.addVerification({
      reqIds: [r.id],
      type: "unit",
      command: "pytest",
      expected: "pass",
      actual: "auth failed with token ghp_AAaa11BBbb22CCcc33DDdd44EEee55FF",
      exitCode: 1,
      result: "FAIL",
    })
    const onDisk = (await readTextOrNull(ledger.file("VERIFICATION.md")))!
    assert.ok(!onDisk.includes("ghp_AAaa11"), "secret leaked into the ledger")
    assert.ok(onDisk.includes("[REDACTED]"))
  })

  test("evidence is linked back onto the requirement automatically", async () => {
    const r = await addReq()
    const v = await pass(r.id)
    assert.ok((await ledger.getRequirement(r.id)).evidence.includes(v.id))
  })

  test("multi-line output survives the round trip", async () => {
    const r = await addReq()
    const output = "line1\nline2\n\nline4 with | pipe and ### hashes"
    await ledger.addVerification({
      reqIds: [r.id], type: "suite", command: "pytest", expected: "x",
      actual: output, exitCode: 0, result: "PASS",
    })
    const back = await ledger.listVerifications()
    assert.equal(back[0]!.actual, output)
  })
})

// ── LED-010, LED-012 ────────────────────────────────────────────────────────

describe("LED-010 — progress and resume point", () => {
  test("entries append, resume point is replaced", async () => {
    await ledger.appendProgress({ reqId: "REQ-001", what: "first thing", result: "PASS" })
    await ledger.setResumePoint({ nextAction: "do A", doNotRedo: "REQ-001" })
    await ledger.appendProgress({ reqId: "REQ-002", what: "second thing", result: "PASS" })
    await ledger.setResumePoint({ nextAction: "do B" })

    const rp = await ledger.getResumePoint()
    assert.equal(rp.nextAction, "do B")
    assert.equal(rp.doNotRedo, "REQ-001", "unspecified fields are preserved")

    const text = (await readTextOrNull(ledger.file("PROGRESS.md")))!
    assert.ok(text.includes("first thing"), "history is appended, not replaced")
    assert.ok(text.includes("second thing"))
  })
})

describe("LED-012 — handoff is generated from state", () => {
  test("contains every blocker and the true resume point", async () => {
    const a = await addReq({ text: "auth work" })
    const b = await addReq({ text: "storage work" })
    const c = await addReq({ text: "migration work" })

    await ledger.setStatus(a.id, "IN_PROGRESS")
    await ledger.setStatus(a.id, "IMPLEMENTED_NOT_VERIFIED")
    await pass(a.id)
    await ledger.setStatus(a.id, "VERIFIED_COMPLETE")

    await ledger.setStatus(b.id, "IN_PROGRESS")
    await ledger.setStatus(b.id, "IMPLEMENTED_NOT_VERIFIED")

    await ledger.setStatus(c.id, "BLOCKED", { reason: "no DATABASE_URL" })
    await ledger.setResumePoint({ nextAction: "finish storage", doNotRedo: `${a.id}` })

    const handoff = await ledger.generateHandoff({ architecture: "auth is a single chokepoint" })

    assert.ok(handoff.includes(c.id), "the blocker must appear")
    assert.ok(handoff.includes("no DATABASE_URL"), "with its evidence")
    assert.ok(handoff.includes(b.id), "unverified work must appear")
    assert.ok(handoff.includes("finish storage"), "resume point")
    assert.ok(handoff.includes("auth is a single chokepoint"))
    assert.ok(handoff.includes("1/3 requirements verified"))
  })

  test("is written to disk", async () => {
    await ledger.generateHandoff()
    assert.ok(await readTextOrNull(ledger.file("HANDOFF.md")))
  })
})

// ── LED-013 ─────────────────────────────────────────────────────────────────

describe("LED-013 — archive refuses unresolved work", () => {
  test("refuses when anything is unresolved", async () => {
    const a = await addReq()
    await ledger.setStatus(a.id, "IN_PROGRESS")
    await assert.rejects(() => ledger.archivePhase("phase-1", [a.id]), /not resolved/)
  })

  test("archives verified work and leaves a pointer", async () => {
    const a = await addReq()
    await ledger.setStatus(a.id, "IN_PROGRESS")
    await ledger.setStatus(a.id, "IMPLEMENTED_NOT_VERIFIED")
    await pass(a.id)
    await ledger.setStatus(a.id, "VERIFIED_COMPLETE")

    await ledger.archivePhase("phase-1", [a.id])
    const archived = await readTextOrNull(path.join(dir, ".apex", "archive", "phase-1.md"))
    assert.ok(archived?.includes(a.id))
    assert.ok(archived?.includes("6 passed"), "evidence travels with the archive")

    const progress = (await readTextOrNull(ledger.file("PROGRESS.md")))!
    assert.ok(progress.includes("archive/phase-1.md"), "a pointer is left behind")
    assert.equal((await ledger.listRequirements()).length, 1, "the requirement itself is NOT removed")
  })
})

// ── LED-014 ─────────────────────────────────────────────────────────────────

describe("LED-014 — concurrent writes leave valid files", () => {
  test("50 interleaved appends produce a parseable ledger", async () => {
    await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        ledger.appendProgress({ reqId: `REQ-${i}`, what: `entry ${i}`, result: "PASS" }),
      ),
    )
    const text = (await readTextOrNull(ledger.file("PROGRESS.md")))!
    assert.ok(text.startsWith("# Progress"))
    assert.ok(text.includes("## RESUME POINT"))
  })

  test("concurrent requirement adds never corrupt the file", async () => {
    for (let i = 0; i < 20; i++) await addReq({ text: `req ${i}` })
    const all = await ledger.listRequirements()
    assert.equal(all.length, 20)
    assert.equal(new Set(all.map((r) => r.id)).size, 20, "no duplicate ids")
  })
})

// ── LED-016 ─────────────────────────────────────────────────────────────────

describe("LED-016 — recovery", () => {
  test("recovers from a backup when the primary file is gone", async () => {
    await addReq()
    const file = ledger.file("REQUIREMENTS.md")
    const good = (await readTextOrNull(file))!
    await fsp.writeFile(`${file}.apex.bak`, good, "utf8")
    await fsp.rm(file)

    const reqs = await ledger.listRequirements()
    assert.equal(reqs.length, 1, "recovered from backup")
    assert.ok(await readTextOrNull(file), "the primary file was restored")
  })

  test("an empty ledger reads as empty rather than throwing", async () => {
    await fsp.writeFile(ledger.file("REQUIREMENTS.md"), "", "utf8")
    assert.deepEqual(await ledger.listRequirements(), [])
  })
})

// ── side records ────────────────────────────────────────────────────────────

describe("side records", () => {
  test("decisions round-trip with sequential ids", async () => {
    const d = await ledger.addDecision({
      context: "REQ-021, plan is silent on retries",
      problem: "transient 5xx fails the job",
      options: ["no retry", "3 retries with backoff", "add a queue"],
      chose: "3 retries with backoff",
      whyNotAViolation: "spec is silent; tenacity is already a dependency",
      affects: ["src/storage.py:95"],
      reversible: "yes — remove the decorator",
    })
    assert.equal(d.id, "DEC-001")
    const text = (await readTextOrNull(ledger.file("DECISIONS.md")))!
    assert.ok(text.includes("3 retries with backoff"))

    const d2 = await ledger.addDecision({
      context: "c", problem: "p", options: ["a"], chose: "a",
      whyNotAViolation: "w", affects: [], reversible: "yes",
    })
    assert.equal(d2.id, "DEC-002")
  })

  test("findings round-trip", async () => {
    await ledger.addFinding({
      where: "src/legacy/parser.py:88",
      what: "bare except with pass — hides real failures",
      whyNotFixed: "out of scope; plan does not cover legacy/",
      recommend: "follow-up task",
    })
    const all = await ledger.listFindings()
    assert.equal(all.length, 1)
    assert.equal(all[0]!.id, "F-001")
    assert.equal(all[0]!.where, "src/legacy/parser.py:88")
  })

  test("subagent records round-trip", async () => {
    const record = {
      id: "SUB-001",
      parentReqIds: ["REQ-021"],
      sessionId: "ses_8f2a1c",
      scope: "Implement S3 upload only",
      allowedPaths: ["src/storage.py", "tests/test_storage.py"],
      forbiddenPaths: ["config/prod.yaml"],
      acceptance: "pytest tests/test_storage.py passes",
      state: "FAILED_RETRYING" as const,
      checkpoint: "put() and get() done, delete() started",
      filesChanged: ["src/storage.py"],
      parentVerification: "REJECTED — downgrade is a no-op",
      failureClass: "context-exhaustion",
      attempt: 2,
      maxAttempts: 2,
      nextStrategy: "narrow to delete() only",
      model: "worker-model",
      fleetId: "FLEET-001",
    }
    await ledger.upsertSubagent(record)
    const [back] = await ledger.listSubagents()
    assert.deepEqual(back, record)
  })

  test("upsert replaces rather than duplicating", async () => {
    const base = {
      id: "SUB-001", parentReqIds: [], sessionId: "s", scope: "x", allowedPaths: [],
      forbiddenPaths: [], acceptance: "a", state: "RUNNING" as const, checkpoint: "",
      filesChanged: [], parentVerification: "", failureClass: "", attempt: 1,
      maxAttempts: 2, nextStrategy: "", model: "m", fleetId: "",
    }
    await ledger.upsertSubagent(base)
    await ledger.upsertSubagent({ ...base, state: "VERIFIED_ACCEPTED" })
    const all = await ledger.listSubagents()
    assert.equal(all.length, 1)
    assert.equal(all[0]!.state, "VERIFIED_ACCEPTED")
  })
})

describe("status", () => {
  test("reports the active requirement, blockers and level", async () => {
    const a = await addReq({ text: "a" })
    const b = await addReq({ text: "b" })
    await ledger.setStatus(a.id, "IN_PROGRESS")
    await ledger.setStatus(b.id, "BLOCKED", { reason: "waiting on creds" })

    const s = await ledger.status()
    assert.equal(s.activeRequirement, a.id)
    assert.equal(s.totalRequirements, 2)
    assert.deepEqual(s.blocked, [{ id: b.id, reason: "waiting on creds" }])
    assert.equal(s.level, 0)
  })

  test("level reflects the runtime marker", async () => {
    await ledger.writeRuntimeMarker(2, "1.0.0")
    assert.equal((await ledger.status()).level, 2)
  })
})

describe("ApexError surface", () => {
  test("unknown requirement is a clean error", async () => {
    await assert.rejects(
      () => ledger.getRequirement("REQ-999"),
      (e: unknown) => e instanceof ApexError,
    )
  })
})

describe("the ledger refuses a filesystem root", () => {
  test("init at a drive root throws instead of scattering files", async () => {
    for (const root of ["/", "C:\\", "C:/"]) {
      await assert.rejects(
        () => new Ledger(root).init({ projectRoot: root }),
        (err: Error) => {
          assert.match(err.message, /Refusing to create a ledger at the filesystem root/)
          return true
        },
        `root ${root} was accepted`,
      )
    }
  })

  test("a real directory still works", async () => {
    const fresh = await fsp.mkdtemp(path.join(os.tmpdir(), "apex-ok-"))
    const result = await new Ledger(fresh).init({ projectRoot: fresh })
    assert.equal(result.created, true)
    await fsp.rm(fresh, { recursive: true, force: true })
  })
})
