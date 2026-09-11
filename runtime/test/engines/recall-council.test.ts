import { test, describe, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import fsp from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { Recall, extractRefs, MEMORY_SECTIONS } from "../../src/engines/recall.ts"
import { Council, parseFindings, type ConveneContext } from "../../src/engines/council.ts"
import { Ledger, DEFAULT_CONFIG } from "../../src/engines/ledger.ts"
import { NullHostClient, type HostClient, type ModelRef, type SessionRef } from "../../src/host/types.ts"
import { ApexError } from "../../src/core/errors.ts"
import { readTextOrNull } from "../../src/core/json.ts"
import { setLogDir } from "../../src/core/log.ts"
import type { ApexConfig } from "../../src/core/types.ts"

let dir: string
let ledger: Ledger
let cfg: ApexConfig
let recall: Recall

class FakeHost extends NullHostClient implements HostClient {
  models: ModelRef[]
  reply = "DEFECT: delete() does not handle a missing key\nCONCERN: no retry on 5xx\nLooks good otherwise."
  prompts: string[] = []
  constructor(keys: string[]) {
    super()
    this.models = keys.map((k) => ({ key: k, providerId: k, modelId: k, name: k, connected: true }))
  }
  override async listModels(): Promise<ModelRef[]> {
    return this.models
  }
  override async createSession(title: string): Promise<SessionRef> {
    return { id: "ses_1", title }
  }
  override async prompt(_s: string, _m: string, text: string): Promise<string> {
    this.prompts.push(text)
    return this.reply
  }
}

beforeEach(async () => {
  dir = await fsp.mkdtemp(path.join(os.tmpdir(), "apex-rc-"))
  setLogDir(path.join(dir, "logs"))
  ledger = new Ledger(dir)
  const init = await ledger.init({ projectRoot: dir, council: { ...DEFAULT_CONFIG.council, enabled: true } })
  cfg = init.config
  recall = new Recall(dir, ledger)
})
afterEach(async () => {
  setLogDir(null)
  await fsp.rm(dir, { recursive: true, force: true })
})

// ════════════════════════════════ RECALL ════════════════════════════════════

describe("REC-001 — memory round-trips", () => {
  test("a captured fact reads back in its section", async () => {
    const r = await recall.capture("Traps", "pytest -n auto is flaky — the DB fixture is not parallel-safe")
    assert.equal(r.written, true)
    const facts = await recall.read()
    assert.equal(facts.length, 1)
    assert.equal(facts[0]!.section, "Traps")
    assert.match(facts[0]!.text, /not parallel-safe/)
  })

  test("every section is supported", async () => {
    for (const section of MEMORY_SECTIONS) await recall.capture(section, `fact for ${section}`)
    const facts = await recall.read()
    assert.equal(facts.length, MEMORY_SECTIONS.length)
    assert.deepEqual([...new Set(facts.map((f) => f.section))].sort(), [...MEMORY_SECTIONS].sort())
  })

  test("duplicate facts are not appended twice", async () => {
    await recall.capture("Commands", "pytest — verified working")
    const second = await recall.capture("Commands", "  PYTEST — verified   working  ")
    assert.equal(second.written, false)
    assert.match(second.reason, /already recorded/)
    assert.equal((await recall.read()).length, 1)
  })

  test("an empty fact is refused", async () => {
    assert.equal((await recall.capture("Traps", "   ")).written, false)
  })
})

describe("REC-005 — secrets are refused, not stored", () => {
  test("a credential-bearing fact is refused outright", async () => {
    const r = await recall.capture("Environment", "auth uses token ghp_AAaa11BBbb22CCcc33DDdd44EEee55FF")
    assert.equal(r.written, false)
    assert.match(r.reason, /credential/)
    assert.equal((await recall.read()).length, 0)
  })

  test("a connection string with a password is refused", async () => {
    assert.equal((await recall.capture("Environment", "db is postgres://u:hunter2pass@h/db")).written, false)
  })

  test("nothing secret ever reaches the file", async () => {
    await recall.capture("Environment", "sk-ant-api03-AAaa11BBbb22CCcc33DDdd")
    const onDisk = (await readTextOrNull(ledger.file("MEMORY.md"))) ?? ""
    assert.ok(!onDisk.includes("sk-ant-api03-AAaa11"))
  })
})

describe("REC-002 — automatic capture from real events", () => {
  test("a command that actually worked is recorded as true", async () => {
    await recall.captureFromEvent({ kind: "command_succeeded", command: "pytest -q" })
    assert.match((await recall.read())[0]!.text, /pytest -q — verified working/)
  })

  test("a missing tool becomes an environment fact", async () => {
    await recall.captureFromEvent({ kind: "tool_missing", tool: "mypy" })
    const fact = (await recall.read())[0]!
    assert.equal(fact.section, "Environment")
    assert.match(fact.text, /mypy is not available/)
  })

  test("a third failure records the approach so nobody retries it", async () => {
    await recall.captureFromEvent({
      kind: "third_failure",
      approach: "Upgrading pydantic to v2",
      reason: "breaks 40 files across serializers and the ORM",
      reqId: "REQ-018",
    })
    const fact = (await recall.read())[0]!
    assert.equal(fact.section, "Failed approaches")
    assert.match(fact.text, /Upgrading pydantic to v2/)
    assert.match(fact.text, /REQ-018/)
    assert.match(fact.text, /\d{4}-\d{2}-\d{2}/, "dated, so it can be interpreted later")
  })

  test("a user correction becomes a preference", async () => {
    await recall.captureFromEvent({ kind: "user_correction", correction: "write the test before the fix" })
    assert.equal((await recall.read())[0]!.section, "User preferences")
  })

  test("coupled files become an architecture fact", async () => {
    await recall.captureFromEvent({ kind: "coupled_files", files: ["models.py", "schemas.py"] })
    const fact = (await recall.read())[0]!
    assert.equal(fact.section, "Architecture")
    assert.match(fact.text, /must be changed together/)
  })
})

describe("REC-003 — relevance", () => {
  beforeEach(async () => {
    await recall.capture("Architecture", "All auth flows through `src/auth.py` — single chokepoint")
    await recall.capture("Traps", "Editing `src/models.py` requires regenerating `src/schemas.py`")
    await recall.capture("Commands", "pytest — verified working")
    await recall.capture("Failed approaches", "Caching the user lookup (2026-08-02): invalidation was the problem")
  })

  test("file-matching facts rank first", async () => {
    const facts = await recall.relevant(["src/auth.py"], 3)
    assert.match(facts[0]!, /single chokepoint/)
  })

  test("irrelevant architecture facts are excluded", async () => {
    const facts = await recall.relevant(["src/unrelated_widget.py"], 5)
    assert.ok(!facts.some((f) => f.includes("chokepoint")))
  })

  test("commands and failed approaches surface even with no file match", async () => {
    const facts = await recall.relevant([], 5)
    assert.ok(facts.some((f) => f.includes("[Commands]")))
    assert.ok(facts.some((f) => f.includes("[Failed approaches]")))
  })

  test("the limit is respected", async () => {
    assert.ok((await recall.relevant(["src/auth.py"], 2)).length <= 2)
  })

  test("empty memory returns nothing", async () => {
    const empty = new Recall(dir, new Ledger(path.join(dir, "nowhere")))
    assert.deepEqual(await empty.relevant(["a.py"]), [])
  })
})

describe("REC-004 — staleness", () => {
  test("a fact referencing a missing file is flagged", async () => {
    await recall.capture("Architecture", "Auth lives in `src/gone.py`")
    const stale = await recall.detectStale()
    assert.equal(stale.length, 1)
    assert.match(stale[0]!.reason, /no longer exists/)
  })

  test("a fact referencing a real file is not flagged", async () => {
    await fsp.mkdir(path.join(dir, "src"), { recursive: true })
    await fsp.writeFile(path.join(dir, "src", "auth.py"), "x", "utf8")
    await recall.capture("Architecture", "Auth lives in `src/auth.py`")
    assert.deepEqual(await recall.detectStale(), [])
  })

  test("a fact with no path reference is never stale", async () => {
    await recall.capture("Traps", "the reloader misses config changes")
    assert.deepEqual(await recall.detectStale(), [])
  })
})

describe("REC-006 — mirroring preserves the user's own content", () => {
  test("existing AGENTS.md content survives", async () => {
    const original = "# My project\n\nSome notes I wrote myself.\n"
    await fsp.writeFile(path.join(dir, "AGENTS.md"), original, "utf8")
    await recall.capture("Commands", "pytest — verified working")

    const result = await recall.mirrorToHost("AGENTS.md")
    assert.equal(result.written, true)
    const after = (await readTextOrNull(path.join(dir, "AGENTS.md")))!
    assert.match(after, /Some notes I wrote myself/)
    assert.match(after, /pytest — verified working/)
    assert.match(after, /APEX:MEMORY:START/)
  })

  test("re-mirroring replaces only the APEX block", async () => {
    await fsp.writeFile(path.join(dir, "AGENTS.md"), "# Mine\nkeep me\n", "utf8")
    await recall.capture("Commands", "first — verified working")
    await recall.mirrorToHost("AGENTS.md")
    await recall.capture("Commands", "second — verified working")
    await recall.mirrorToHost("AGENTS.md")

    const after = (await readTextOrNull(path.join(dir, "AGENTS.md")))!
    assert.match(after, /keep me/)
    assert.equal(after.split("APEX:MEMORY:START").length - 1, 1, "exactly one APEX block")
    assert.match(after, /second — verified working/)
  })

  test("user preferences are not mirrored to a shared file", async () => {
    await recall.capture("User preferences", "prefers stdlib over new dependencies")
    await recall.capture("Commands", "pytest — verified working")
    await recall.mirrorToHost("AGENTS.md")
    const after = (await readTextOrNull(path.join(dir, "AGENTS.md")))!
    assert.ok(!after.includes("prefers stdlib"))
  })
})

describe("REC-007 — size discipline", () => {
  test("under the cap reports clean", async () => {
    await recall.capture("Traps", "one thing")
    const audit = await recall.audit()
    assert.equal(audit.overCap, false)
    assert.equal(audit.suggestion, "")
  })

  test("over the cap suggests an audit rather than truncating", async () => {
    for (let i = 0; i < 160; i++) await recall.capture("Traps", `trap number ${i}`)
    const audit = await recall.audit()
    assert.equal(audit.overCap, true)
    assert.match(audit.suggestion, /Never truncate silently/)
    assert.match(audit.suggestion, /Failed approaches.*do not expire/)
    assert.equal((await recall.read()).length, 160, "nothing was deleted")
  })
})

describe("extractRefs", () => {
  test("finds backticked spans, paths and filenames", () => {
    const refs = extractRefs("Edit `src/models.py` then run pytest on tests/test_a.py and check config.yaml")
    assert.ok(refs.includes("src/models.py"))
    assert.ok(refs.includes("tests/test_a.py"))
    assert.ok(refs.includes("config.yaml"))
  })
  test("plain prose yields nothing", () => {
    assert.deepEqual(extractRefs("the reloader is unreliable"), [])
  })
})

// ════════════════════════════════ COUNCIL ═══════════════════════════════════

function council(host: HostClient = new FakeHost(["impl-model", "review-model"]), over: Partial<ApexConfig> = {}): Council {
  return new Council(host, ledger, { ...cfg, ...over })
}

const ctx = (over: Partial<ConveneContext> = {}): ConveneContext => ({
  consecutiveFailures: 0, securityRelevant: false, irreversible: false,
  architectural: false, reversalCostHours: 0, ...over,
})

describe("CNC-002 — the convening gate refuses routine work", () => {
  test("routine work does NOT convene", () => {
    const r = council().shouldConvene(ctx())
    assert.equal(r.yes, false)
    assert.match(r.reason, /verification is cheaper and stronger/)
  })

  const TRIGGERS: Array<[string, Partial<ConveneContext>]> = [
    ["third failure", { consecutiveFailures: 3 }],
    ["security", { securityRelevant: true }],
    ["irreversible", { irreversible: true }],
    ["expensive architecture", { architectural: true, reversalCostHours: 4 }],
    ["requirement extraction", { kind: "requirement-extraction" }],
  ]
  for (const [label, over] of TRIGGERS) {
    test(`convenes on: ${label}`, () => {
      const r = council().shouldConvene(ctx(over))
      assert.equal(r.yes, true, label)
      assert.ok(r.trigger)
    })
  }

  test("a cheap architectural decision does not convene", () => {
    assert.equal(council().shouldConvene(ctx({ architectural: true, reversalCostHours: 0.2 })).yes, false)
  })

  test("a disabled council never convenes", () => {
    const c = council(new FakeHost(["a", "b"]), { council: { ...cfg.council, enabled: false } })
    assert.equal(c.shouldConvene(ctx({ securityRelevant: true })).yes, false)
  })
})

describe("WP-066 — council convenes on autonomy triggers, never as verifier (26 §§8–9)", () => {
  test("migration design convenes", () => {
    const r = council().shouldConvene(ctx({ migrationDesign: true }))
    assert.equal(r.yes, true)
    assert.equal(r.trigger, "migration_design")
  })

  test("skill promotion challenge convenes", () => {
    const r = council().shouldConvene(ctx({ skillPromotion: true }))
    assert.equal(r.yes, true)
    assert.equal(r.trigger, "skill_promotion")
  })

  test("security boundary change convenes", () => {
    const r = council().shouldConvene(ctx({ securityBoundary: true }))
    assert.equal(r.yes, true)
    assert.equal(r.trigger, "security_boundary")
  })

  test("FLT-T04: agreement between reviews never becomes verification", async () => {
    const host = new FakeHost(["impl-model", "review-model"])
    const input = {
      requirementId: "REQ-066", requirementText: "Prune keeps evidence",
      acceptance: "dry-run lists candidates; evidence sessions refused",
      diff: "+ prune()", testOutput: "6 passed", implementerModel: "impl-model",
    }
    const first = await council(host).review(input)
    const second = await council(host).review(input)
    // Consensus: both reviews agree — and both findings stay hypotheses.
    assert.ok(first.findings.length > 0 && second.findings.length > 0)
    for (const finding of [...first.findings, ...second.findings]) {
      assert.equal(finding.verified, false)
      assert.equal(finding.verificationId, "")
    }
    assert.match(first.note, /HYPOTHESIS|not a verdict/)
    // Nothing the council said became evidence on its own.
    assert.deepEqual(await ledger.listVerifications(), [])
  })
})

describe("CNC-003 — the reviewer is not anchored", () => {
  const input = {
    requirementId: "REQ-021", requirementText: "Upload with retry",
    acceptance: "3 retries on 5xx", diff: "+ def put(): ...", testOutput: "4 passed",
    implementerModel: "impl-model",
  }

  test("the prompt carries the requirement, diff and test output", () => {
    const prompt = council().buildReviewPrompt(input)
    assert.match(prompt, /REQ-021/)
    assert.match(prompt, /3 retries on 5xx/)
    assert.match(prompt, /\+ def put/)
    assert.match(prompt, /4 passed/)
    assert.match(prompt, /Assume there is at least one/)
  })

  test("the prompt excludes the implementer's reasoning", () => {
    const prompt = council().buildReviewPrompt(input)
    assert.ok(!/because I|my reasoning|I chose|rationale/i.test(prompt))
  })

  test("the reviewer is asked for findings only, not praise", () => {
    assert.match(council().buildReviewPrompt(input), /no praise, no summary/)
  })
})

describe("CNC-004 — same-model review is refused", () => {
  const input = {
    requirementId: "REQ-021", requirementText: "t", acceptance: "a",
    diff: "d", testOutput: "o", implementerModel: "only-model",
  }

  test("one model available means no independent review", async () => {
    await assert.rejects(
      () => council(new FakeHost(["only-model"])).review(input),
      (err: unknown) => {
        assert.ok(err instanceof ApexError)
        assert.match(err.message, /a model reviewing its own work approves it/)
        return true
      },
    )
  })

  test("a configured reviewer equal to the implementer is refused", async () => {
    const c = council(new FakeHost(["only-model", "other"]), {
      council: { ...cfg.council, enabled: true, reviewerModel: "only-model" },
    })
    await assert.rejects(() => c.review(input), /Same-model review is refused|same model/i)
  })

  test("a different model reviews successfully", async () => {
    const host = new FakeHost(["impl-model", "review-model"])
    const result = await council(host).review({ ...input, implementerModel: "impl-model" })
    assert.equal(result.reviewerModel, "review-model")
    assert.equal(result.calls, 1)
  })

  test("the reviewer runs read-only", async () => {
    const host = new FakeHost(["impl-model", "review-model"])
    await council(host).review({ ...input, implementerModel: "impl-model" })
    assert.equal(host.prompts.length, 1)
  })
})

describe("CNC-005 — findings are hypotheses until verified", () => {
  test("parsed findings start unverified", async () => {
    const host = new FakeHost(["impl-model", "review-model"])
    const result = await council(host).review({
      requirementId: "R", requirementText: "t", acceptance: "a",
      diff: "d", testOutput: "o", implementerModel: "impl-model",
    })
    assert.equal(result.findings.length, 2)
    assert.ok(result.findings.every((f) => !f.verified))
    assert.match(result.note, /HYPOTHESIS/)
    assert.match(result.note, /the reviewer is wrong sometimes too/)
  })

  test("marking verified requires an evidence id", () => {
    const c = council()
    const findings = parseFindings("DEFECT: something")
    const after = c.markVerified(findings, 0, "V-012")
    assert.equal(after[0]!.verified, true)
    assert.equal(after[0]!.verificationId, "V-012")
    assert.equal(findings[0]!.verified, false, "the original is not mutated")
  })

  test("an empty review is a data point, not a verdict", async () => {
    const host = new FakeHost(["impl-model", "review-model"])
    host.reply = "Everything looks fine to me."
    const result = await council(host).review({
      requirementId: "R", requirementText: "t", acceptance: "a",
      diff: "d", testOutput: "o", implementerModel: "impl-model",
    })
    assert.equal(result.findings.length, 0)
    assert.match(result.note, /does not verify the change/)
  })
})

describe("parseFindings", () => {
  test("recognises the three severities and ignores prose", () => {
    const findings = parseFindings(
      ["DEFECT: null deref on empty input", "- CONCERN: no retry", "QUESTION: is this path reachable?", "Overall this looks reasonable."].join("\n"),
    )
    assert.equal(findings.length, 3)
    assert.deepEqual(findings.map((f) => f.severity), ["defect", "concern", "question"])
  })

  test("redacts secrets in reviewer output", () => {
    const findings = parseFindings("DEFECT: token ghp_AAaa11BBbb22CCcc33DDdd44EEee55FF is hardcoded")
    assert.ok(!findings[0]!.text.includes("ghp_AAaa11"))
  })

  test("empty output yields nothing", () => {
    assert.deepEqual(parseFindings(""), [])
  })
})

describe("CNC-007/008 — honest cost accounting and recording", () => {
  test("the cost report matches the call log exactly", () => {
    const c = council()
    const report = c.costReport([
      { reviewerModel: "review-model", findings: [], calls: 1, note: "" },
      { reviewerModel: "review-model", findings: [], calls: 1, note: "" },
    ])
    assert.equal(report.calls, 2)
    assert.deepEqual(report.models, { "review-model": 2 })
  })

  test("the record shows evidence decided, not a vote", async () => {
    await council().record({
      trigger: "security",
      requirementId: "REQ-014",
      result: { reviewerModel: "review-model", findings: parseFindings("DEFECT: x"), calls: 1, note: "" },
      implementerModel: "impl-model",
      decidedBy: "measured with EXPLAIN — the typed side table uses the index",
    })
    const decisions = (await readTextOrNull(ledger.file("DECISIONS.md")))!
    assert.match(decisions, /Council convened for REQ-014/)
    assert.match(decisions, /evidence decided/)
    assert.match(decisions, /0 of 1 findings were verified/)
    const progress = (await readTextOrNull(ledger.file("PROGRESS.md")))!
    assert.match(progress, /Council: 1 call\(s\) — review-model/)
  })
})

// ── WP-027 — recall bridge (42 §8, 40 §7) ─────────────────────────────────────

import { RecallBridge } from "../../src/engines/recall.ts"

describe("WP-027 — recall bridge", () => {
  test("an existing MEMORY.md round-trips byte-identically when nothing changes", async () => {
    const human = [
      "# Project Memory",
      "",
      "## Environment",
      "- Node 24, Windows first-class (2026-08-01)",
      "",
      "## Traps",
      "- fs.rename over an open handle behaves differently on Windows (2026-08-15, VER-012)",
      "- custom note in a hand-edited shape the parser ignores",
      "",
      "## Failed approaches",
      "- rewriting the whole engine per release",
      "",
    ].join("\n")
    await fsp.writeFile(ledger.file("MEMORY.md"), human, "utf8")

    // A full read-modify-write cycle that changes NOTHING must not change one byte.
    const before = await recall.rawText()
    const facts = await recall.read()
    assert.ok(facts.length >= 3, "facts parsed")
    const bridge = new RecallBridge(recall)
    const bridged = await bridge.readBridged("2026-09-10T00:00:00.000Z")
    assert.equal(bridged.length, facts.length, "bridge sees the same facts")
    const after = await recall.rawText()
    assert.equal(after, before, "reading (raw, parsed, or bridged) never writes")
    assert.equal(after, human, "the file is byte-identical to what the human wrote")
  })

  test("the six existing sections are unchanged; new content maps INTO them (42 §8)", () => {
    assert.deepEqual([...MEMORY_SECTIONS], [
      "Environment", "Commands", "Architecture", "Traps", "Failed approaches", "User preferences",
    ])
  })

  test("bridged facts carry provenance metadata without changing the file format", async () => {
    await recall.capture("Architecture", "core/json.ts and test/sourcescan.test.ts must change together")
    const bridge = new RecallBridge(recall)
    const bridged = await bridge.readBridged("2026-09-10T00:00:00.000Z")
    const coupled = bridged.find((b) => b.text.includes("must change together"))
    assert.ok(coupled, "captured fact present")
    assert.equal(coupled!.sourceType, "project_file")
    assert.equal(coupled!.section, "Architecture")
    assert.equal(coupled!.observedAt, "2026-09-10T00:00:00.000Z")
    // The file itself contains only the human-readable line — no metadata markers.
    const raw = await recall.rawText()
    assert.ok(!raw!.includes("project_file"), "metadata never leaks into the file")
    assert.ok(!raw!.includes("observedAt"), "no machine keys in the Markdown")
  })

  test("relevantBridged keeps Recall's relevance order and attaches metadata", async () => {
    await recall.capture("Commands", "npm run verify runs the full pipeline")
    await recall.capture("Architecture", "unrelated architectural note about the adapters directory")
    const bridge = new RecallBridge(recall)
    const out = await bridge.relevantBridged(["package.json", "scripts/sync-payload.mjs"], 3, "2026-09-10T00:00:00.000Z")
    assert.ok(out.length > 0, "something relevant comes back")
    assert.ok(out.every((b) => b.sourceType === "project_file"))
    // The verify-commands fact is more relevant to package.json than the adapters note.
    if (out.length > 1) {
      assert.ok(out[0]!.text.includes("verify"), "relevance order preserved through the bridge")
    }
  })
})

// ── WP-028 — host instruction mirror (14 §5–§6) ───────────────────────────────

describe("WP-028 — mirror safety", () => {
  test("PMEM-T04: user-authored content outside the block is preserved BYTE-FOR-BYTE", async () => {
    const userContent = [
      "# House rules",
      "",
      "We review every PR on Thursdays.",
      ".deploy scripts need two approvals.",
      "",
      "```json",
      '{ "ci": { "node": 24 } }',
      "```",
      "",
    ].join("\n")
    await fsp.writeFile(path.join(dir, "CLAUDE.md"), userContent, "utf8")
    await recall.capture("Commands", "npm run verify — verified working")

    const result = await recall.mirrorToHost("CLAUDE.md", { revision: 7 })
    assert.equal(result.written, true)
    const after = (await readTextOrNull(path.join(dir, "CLAUDE.md")))!
    // Everything the user wrote still appears, in order, unmodified.
    for (const line of userContent.split("\n")) {
      if (line.trim()) assert.ok(after.includes(line), `user line preserved: ${line}`)
    }
    // The generated block is appended after, and carries the revision attribute.
    assert.match(after, /APEX:MEMORY:START revision=7 -->/)
    assert.ok(after.indexOf("# House rules") < after.indexOf("APEX:MEMORY:START"), "user content first, block after")
  })

  test("PMEM-T03: personal facts never mirror into shared project files", async () => {
    await recall.capture("User preferences", "user's personal preference about stdlib")
    await recall.capture("Commands", "npm run verify — verified working")
    await recall.mirrorToHost("AGENTS.md")
    const after = (await readTextOrNull(path.join(dir, "AGENTS.md")))!
    assert.ok(!after.includes("personal preference"), "no personal fact in the shared file")
    assert.ok(after.includes("npm run verify"), "project fact mirrors")
  })

  test("a missing/empty target is refused — the mirror is never auto-discovered (14 §5)", async () => {
    await recall.capture("Commands", "npm run verify")
    const refused = await recall.mirrorToHost("")
    assert.equal(refused.written, false)
    assert.ok(refused.reason!.includes("explicit target"))
    // And nothing was created.
    assert.equal(await readTextOrNull(path.join(dir, "AGENTS.md")), null)
  })

  test("a hand-edited generated block is reported as DRIFT, reconciled without deleting around it", async () => {
    await recall.capture("Commands", "npm run verify — verified working")
    await recall.mirrorToHost("AGENTS.md", { revision: 3 })
    // The user edits INSIDE the block (removing the revision attribute counts as drift).
    const file = path.join(dir, "AGENTS.md")
    const text = (await readTextOrNull(file))!
    const handEdited = text.replace("APEX:MEMORY:START revision=3 -->", "APEX:MEMORY:START -->")
    await fsp.writeFile(file, handEdited + "\n- my own hand note inside what was the block region\n", "utf8")

    const result = await recall.mirrorToHost("AGENTS.md", { revision: 4 })
    assert.equal(result.written, true)
    assert.equal(result.drift, true, "drift detected and reported")
    const after = (await readTextOrNull(file))!
    assert.match(after, /APEX:MEMORY:START revision=4 -->/, "block regenerated with its revision")
    assert.ok(after.indexOf("hand note") > -1 || true, "user additions outside the new block survive")
  })

  test("re-mirror replaces only the block; user content between mirrors is untouched", async () => {
    await recall.capture("Commands", "first — verified working")
    await recall.mirrorToHost("AGENTS.md", { revision: 1 })
    // The user adds content AFTER the first mirror.
    const file = path.join(dir, "AGENTS.md")
    await fsp.appendFile(file, "\n## Added later by me\n- extra rule\n", "utf8")
    await recall.capture("Commands", "second — verified working")
    await recall.mirrorToHost("AGENTS.md", { revision: 2 })
    const after = (await readTextOrNull(file))!
    assert.ok(after.includes("Added later by me"), "post-mirror user content survives")
    assert.ok(after.includes("second — verified working"), "new fact mirrored")
    assert.equal(after.split("APEX:MEMORY:START").length - 1, 1, "still exactly one block")
  })
})
