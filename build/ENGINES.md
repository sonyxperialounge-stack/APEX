# ENGINES

> The seven engines are the whole system. The MCP server and the OpenCode plugin are thin
> adapters over them.
>
> **Design invariant:** engines import from `core/` only. Never from `mcp/`, `plugin/`, or
> `cli/`. All I/O is injected. If testing an engine needs a running host, the design is wrong.

Code below is a specification you can compile, not a copy-paste drop-in. Types are exact;
bodies are illustrative where marked.

---

## SHARED TYPES — `src/core/types.ts`

```ts
export type ReqStatus =
  | "NOT_STARTED" | "IN_PROGRESS" | "IMPLEMENTED_NOT_VERIFIED"
  | "VERIFIED_COMPLETE" | "BLOCKED" | "NOT_APPLICABLE"

export interface Requirement {
  id: string                    // REQ-001, stable, never reused
  source: string                // "docs/plan.md §3.2"
  text: string
  component?: string
  dependsOn: string[]
  acceptance: string
  verifyBy: string              // the command that proves it
  status: ReqStatus
  evidence: string[]            // verification record ids
  files: string[]
  notes?: string
  blockedReason?: string        // required when BLOCKED
  naReason?: string             // required when NOT_APPLICABLE
}

export type VerifyType =
  | "parse" | "types" | "lint" | "unit" | "integration"
  | "suite" | "build" | "runtime" | "manual"

export type VerifyResult = "PASS" | "FAIL" | "NOT_RUN"

export interface VerificationRecord {
  id: string                    // V-001
  reqIds: string[]
  type: VerifyType
  command: string
  expected: string
  actual: string                // LITERAL output, redacted, bounded
  exitCode: number | null
  result: VerifyResult
  reason?: string               // required when NOT_RUN
  durationMs: number
  timestamp: string
}

export type AutonomyMode = "MANUAL" | "GUARDED" | "AUTO" | "FULL_AUTO"

export interface ApexConfig {
  projectRoot: string
  autonomy: AutonomyMode
  allowedPaths: string[]
  doNotRead: string[]
  doNotTouch: string[]
  ignore: string[]
  sourcesOfTruth: string[]
  verifyCommands: Partial<Record<VerifyType, string | null>>
  limits: {
    maxSameStrategyFailures: number
    maxSubagentRetries: number
    handoffAtContextPct: number
  }
  council: { enabled: boolean; reviewerModel: string | null; conveneOn: string[] }
}

export interface Decision { allowed: boolean; reason: string; rule: string; requiresSnapshot: boolean }
```

---

## 1. LEDGER — durable state

**Owns:** everything in `.apex/`. **The only module that writes it.** Every other engine goes
through this one, which is what makes the invariants enforceable.

```ts
export class Ledger {
  constructor(private root: string, private fs: FileSystem) {}

  async init(config: ApexConfig): Promise<void>      // never overwrites an existing ledger
  async loadConfig(): Promise<ApexConfig>

  async addRequirement(r: Omit<Requirement, "status" | "evidence">): Promise<Requirement>
  async listRequirements(filter?: { status?: ReqStatus }): Promise<Requirement[]>
  async setStatus(id: string, next: ReqStatus, opts?: {
    reason?: string; evidenceId?: string
  }): Promise<Requirement>                            // THROWS on an illegal transition

  async addVerification(v: Omit<VerificationRecord, "id" | "timestamp">): Promise<VerificationRecord>
  async addDecision(d: DecisionRecord): Promise<void>
  async addFinding(f: Finding): Promise<void>
  async upsertSubagent(s: SubagentRecord): Promise<void>

  async appendProgress(entry: ProgressEntry): Promise<void>
  async setResumePoint(rp: ResumePoint): Promise<void>
  async generateHandoff(): Promise<string>            // FROM STATE, not from a summary
  async archivePhase(phase: string): Promise<void>    // refuses if anything is unresolved
  async totals(): Promise<Record<ReqStatus, number>>
}
```

### The transition table — LED-004, the heart of the engine

```ts
const LEGAL: Record<ReqStatus, ReqStatus[]> = {
  NOT_STARTED:              ["IN_PROGRESS", "BLOCKED", "NOT_APPLICABLE"],
  IN_PROGRESS:              ["IMPLEMENTED_NOT_VERIFIED", "BLOCKED", "NOT_APPLICABLE"],
  IMPLEMENTED_NOT_VERIFIED: ["VERIFIED_COMPLETE", "IN_PROGRESS", "BLOCKED"],
  VERIFIED_COMPLETE:        ["IN_PROGRESS"],            // reopened by the final audit
  BLOCKED:                  ["IN_PROGRESS", "NOT_APPLICABLE"],
  NOT_APPLICABLE:           ["IN_PROGRESS"],
}

async setStatus(id, next, opts) {
  const req = await this.get(id)

  if (!LEGAL[req.status].includes(next))
    throw new ApexError(
      `Illegal transition ${req.status} → ${next} for ${id}. ` +
      `Legal from here: ${LEGAL[req.status].join(", ")}. ` +
      `To reach VERIFIED_COMPLETE, first implement it (IN_PROGRESS → ` +
      `IMPLEMENTED_NOT_VERIFIED), then verify it with evidence.`)

  // LED-005 — evidence is not optional
  if (next === "VERIFIED_COMPLETE") {
    const passing = (await this.verificationsFor(id)).filter(v => v.result === "PASS")
    if (passing.length === 0)
      throw new ApexError(
        `${id} cannot be VERIFIED_COMPLETE: no passing verification record references it. ` +
        `Run the check in verifyBy (\`${req.verifyBy}\`) and record the result first.`)
  }

  if (next === "BLOCKED" && !opts?.reason)
    throw new ApexError(`BLOCKED requires evidence. What exactly failed, and what would unblock it?`)
  if (next === "NOT_APPLICABLE" && !opts?.reason)
    throw new ApexError(`NOT_APPLICABLE requires a written justification.`)

  return this.write({ ...req, status: next, ...applyReason(next, opts) })
}
```

> **Why this matters.** The error message is the product. A model that tries to shortcut to
> `VERIFIED_COMPLETE` is told exactly what it must do instead. This converts a doctrine rule
> into a mechanism the model cannot forget.

### Notes

- Markdown is generated from the typed model, never hand-assembled with string concatenation.
- Parsing must tolerate human hand-edits (LED-015): parse leniently, write canonically.
- All writes atomic: temp file → `fsync` → rename. Never a partial ledger.
- `generateHandoff()` reads recorded state only. It must never call a model, because a
  model-written handoff is a summary and summaries lose the blockers.

---

## 2. VERIFIER — grounded proof

**Owns:** turning "I changed something" into "here is what happened when I checked it."

```ts
export class Verifier {
  constructor(private cfg: ApexConfig, private exec: CommandRunner, private ledger: Ledger) {}

  async detectCommands(root: string): Promise<Partial<Record<VerifyType, string>>>
  async captureBaseline(): Promise<Baseline>          // run the suite BEFORE changes
  async cascade(changedFiles: string[], reqIds: string[], opts?: {
    stopAtFirstFailure?: boolean; maxTier?: VerifyType
  }): Promise<VerificationRecord[]>
  async targetedTest(file: string): Promise<string | null>
  async compareToBaseline(current: SuiteResult): Promise<Regression[]>
}
```

### Command detection — VER-001

Read, in this order, and stop at the first project-defined answer:

| Look in | For |
|---|---|
| `package.json` `scripts` | `test`, `typecheck`/`tsc`, `lint`, `build` |
| `Makefile` / `justfile` | targets named `test`, `check`, `lint`, `build` |
| `pyproject.toml` | `[tool.pytest]`, `[tool.mypy]`, `[tool.ruff]` |
| `Cargo.toml` | `cargo test` / `cargo clippy` / `cargo build` |
| `go.mod` | `go test ./...` / `go vet ./...` / `go build ./...` |
| `.github/workflows/*.yml` | **the most reliable source** — CI runs what actually works |

Cache in `.apex/config.json`. Never guess again, and never invent a command the project does
not define — a fabricated command that fails proves nothing about the code.

### The cascade — VER-003

```ts
const ORDER: VerifyType[] = ["parse", "types", "lint", "unit", "suite", "build", "runtime"]

async cascade(changedFiles, reqIds, opts = {}) {
  const records: VerificationRecord[] = []

  for (const tier of ORDER) {
    if (opts.maxTier && ORDER.indexOf(tier) > ORDER.indexOf(opts.maxTier)) break

    const command = tier === "unit"
      ? await this.targetedTest(changedFiles[0])     // VER-005: smallest relevant check
      : this.cfg.verifyCommands[tier]

    if (!command) {
      records.push(await this.record({
        tier, command: "", result: "NOT_RUN",
        reason: `No ${tier} command configured for this project`, reqIds,
      }))
      continue
    }

    const r = await this.exec.run(command, { timeoutMs: TIMEOUTS[tier], cwd: this.cfg.projectRoot })

    if (r.code === 127 || /command not found|is not recognized/i.test(r.stderr)) {
      // VER-007: a missing tool is NOT_RUN. It is never a pass.
      records.push(await this.record({
        tier, command, result: "NOT_RUN",
        reason: `Tool not installed: ${command.split(" ")[0]}`, reqIds,
      }))
      continue
    }

    const rec = await this.record({
      tier, command, result: r.code === 0 ? "PASS" : "FAIL",
      actual: redact(bound(r.stdout + r.stderr)),      // VER-004 + VER-011
      exitCode: r.code, reqIds,
    })
    records.push(rec)

    if (r.code !== 0 && opts.stopAtFirstFailure !== false) break   // do not run expensive
  }                                                                 // checks on broken code
  return records
}
```

`bound()` truncates the **middle** of long output, never the end — the failure summary is
almost always at the end, and truncating it destroys the evidence.

### Baseline and regression — VER-008, VER-009

Capture the suite result at intake. Then a failure can be attributed:

```
failing now ∩ failing at baseline  → pre-existing. Not yours. Record in FINDINGS.md.
failing now \ failing at baseline  → REGRESSION. Yours. Name the specific tests.
```

Without this, agents routinely spend an hour fixing a test that was already red.

### Hard constraint — VER-012

The Verifier has **no write path to test files**. Enforced by a source-scan test. The engine
that measures correctness must never be able to alter the measurement.

---

## 3. GOVERNOR — permission and safety

**Owns:** every allow/deny decision, protected paths, snapshots, rollback.

```ts
export class Governor {
  constructor(private cfg: ApexConfig, private fs: FileSystem, private git: GitClient | null) {}

  decide(op: Operation): Decision
  isProtectedRead(p: string): boolean
  isProtectedWrite(p: string): boolean
  expandBulk(command: string): Promise<string[]>      // GOV-006: what will this actually touch?
  async snapshot(reqId: string, files: string[]): Promise<SnapshotRef>
  async rollback(ref: SnapshotRef): Promise<RollbackReport>   // ONLY the recorded files
}
```

### Path protection — GOV-003, the most security-critical function here

```ts
isProtectedWrite(target: string): boolean {
  // Resolve fully: relative, .., symlinks, 8.3 short names, case on win32
  const real = this.fs.realpathSafe(path.resolve(this.cfg.projectRoot, target))
  const norm = process.platform === "win32" ? real.toLowerCase() : real

  // Outside allowed_paths → protected by default (deny-by-default, not allow-by-default)
  if (!this.cfg.allowedPaths.some(a => isUnder(norm, this.resolve(a)))) return true

  return this.cfg.doNotTouch.some(p => {
    const rp = this.resolve(p)
    return norm === rp || isUnder(norm, rp) || minimatch(norm, rp, { dot: true })
  })
}
```

Must survive at least these evasions — write a test for each: `../` traversal · absolute paths ·
symlinks pointing inside a protected dir · case variation on Windows · trailing slashes ·
`./x/../protected/y` · UNC paths · a glob that expands to include a protected file · a shell
command containing the path rather than a tool argument.

### The hard blocklist — GOV-002

```ts
const BLOCKLIST: Rule[] = [
  { id: "protected-write",  test: op => op.kind === "write"  && this.isProtectedWrite(op.path) },
  { id: "protected-read",   test: op => op.kind === "read"   && this.isProtectedRead(op.path) },
  { id: "unbounded-delete", test: op => /rm\s+-[rf]{2}|find\s+.*-delete|Remove-Item.*-Recurse.*-Force/.test(op.command ?? "")
                                        && !this.isBoundedToProject(op) },
  { id: "history-rewrite",  test: op => /git\s+(push\s+.*--force(?!-with-lease)|reset\s+--hard|clean\s+-[a-z]*f|checkout\s+\.$)/.test(op.command ?? "") },
  { id: "blanket-stash",    test: op => /git\s+stash(?!\s+push\s+--)/.test(op.command ?? "") },
  { id: "sql-destructive",  test: op => /\b(DROP\s+(DATABASE|TABLE|SCHEMA)|TRUNCATE)\b/i.test(op.command ?? "") },
  { id: "secret-egress",    test: op => op.kind === "network" && containsSecret(op.payload) },
  { id: "external-effect",  test: op => op.kind === "deploy" || op.kind === "payment" || op.kind === "message" },
  { id: "self-modify",      test: op => op.kind === "write" && isApexConfigWiden(op) },
]

decide(op: Operation): Decision {
  for (const rule of BLOCKLIST) {
    if (rule.test(op)) return {
      allowed: false, rule: rule.id, requiresSnapshot: false,
      reason: EXPLANATIONS[rule.id],       // the model must learn WHY, not just that it failed
    }
  }
  return MODE_POLICY[this.cfg.autonomy](op)   // GOV-001
}
```

`GOV-002` is the requirement that this loop runs **before** the mode policy, in every mode. No
config value can reorder it.

### Rollback — GOV-008, GOV-009

```ts
async rollback(ref: SnapshotRef): Promise<RollbackReport> {
  const restored: string[] = []
  for (const f of ref.files) {                    // ONLY the recorded files
    await this.fs.copy(path.join(ref.dir, f.hash), f.originalPath)
    restored.push(f.originalPath)
  }
  // GOV-009: prove nothing else moved
  const dirtyNow = this.git ? await this.git.statusShort() : []
  const unexpected = dirtyNow.filter(p => !restored.includes(p) && !ref.preExistingDirty.includes(p))
  return { restored, preserved: ref.preExistingDirty, unexpected }
}
```

`ref.preExistingDirty` is captured at snapshot time. That is what makes "preserve the user's
work" a checkable property rather than an intention.

**GOV-010 is a source-scan test:** the strings `reset --hard`, `clean -fd`, `checkout .`, and
bare `git stash` must not appear anywhere in the package.

---

## 4. CORTEX — the system prompt

**Owns:** assembling what the model sees, every turn. Highest-leverage engine in the system.

```ts
export class Cortex {
  constructor(private ledger: Ledger, private recall: Recall, private cfg: ApexConfig) {}
  async assemble(ctx: { sessionId: string; activeReq?: string; files?: string[]; budget?: number }): Promise<string>
}
```

### Priority and degradation — COR-002, COR-003

Sections are emitted in priority order and dropped from the bottom when over budget:

```
1. PROTECTED PATHS       never dropped. Safety outranks everything.
2. AUTONOMY MODE         never dropped.
3. ACTIVE REQUIREMENT    id, acceptance, verify command
4. RECENT FAILURES       last 3, with their signatures — this is what stops loops
5. LEDGER SUMMARY        counts + blockers
6. DOCTRINE SUMMARY      the compressed core
7. RELEVANT MEMORY       from RECALL, most relevant first
```

### Shape of the output

```
=== APEX ACTIVE (L2) ===

PROTECTED — these operations will be blocked, do not attempt them:
  never modify: config/prod.yaml, migrations/, vendor/
  never read:   .env, secrets/, api-key.md
AUTONOMY: GUARDED — ask once before delete, git-push, dependency install.

ACTIVE REQUIREMENT — REQ-021
  Upload artifacts to S3 with retry on transient 5xx.
  Acceptance: S3Backend matches LocalBackend's interface; 3 retries with backoff.
  Prove with: pytest tests/test_storage.py

RECENT FAILURES — do not repeat these:
  1. REQ-018 · patched serializer directly → broke 4 unrelated tests
  2. REQ-018 · added a compat shim → shim fails on nested models
  → A third attempt at the same approach is prohibited. Change strategy.

STATE: 23 requirements · 14 verified · 1 blocked (REQ-030, no DATABASE_URL)

OPERATING RULES
  Evidence over assertion. Never claim it works without running it.
  Verify after every edit: mypy src/ && pytest tests/test_storage.py
  Requirements have IDs and exactly one status. Nothing silently disappears.
  Two identical failures → change the strategy, do not retry.

PROJECT MEMORY (relevant to src/storage.py)
  · Tests must run from the repo root — conftest.py sets sys.path
  · The worker also consumes storage.Backend — check worker/tasks.py for blast radius
```

Determinism (COR-005) matters for caching and for tests: the same ledger state must produce a
byte-identical prompt.

---

## 5. WARDEN — subagent supervision

**Owns:** spawning, watching, and recovering delegated work.

```ts
export class Warden {
  constructor(private host: HostClient, private ledger: Ledger, private gov: Governor) {}

  async delegate(packet: SubagentPacket): Promise<SubagentHandle>
  async supervise(h: SubagentHandle): Promise<SubagentOutcome>
  async recover(id: string): Promise<RecoveryPlan>
  async verifyResult(id: string): Promise<ParentVerification>   // WAR-010, mandatory
  async abortAll(reason: string): Promise<void>

  // ── Fleet control (core/13-FLEET.md, FLT-001..017) ──
  parseOrder(text: string): FleetOrder | null                   // FLT-002
  shouldDelegateAutonomously(ctx: FleetContext): { yes: boolean; criteria: string[] }  // FLT-006
  async runFleet(order: FleetOrder): Promise<FleetReport>       // FLT-007..015
}
```

### The model substitution law — FLT-004, the single most important rule here

```ts
async resolveModels(order: FleetOrder): Promise<ResolvedModels> {
  const live = await this.host.listModels()
  const missing = order.requestedModels.filter(m => !live.some(l => l.key === m))
  if (missing.length === 0) return bind(order, live)

  // FLT-005: the ONLY exception is a fallback the user pre-authorised
  const covered = missing.filter(m => this.cfg.delegation.models.fallback[m])
  const stranded = missing.filter(m => !this.cfg.delegation.models.fallback[m])
  if (stranded.length === 0) return bindWithFallbacks(order, live, this.cfg)

  // Everything else STOPS. There is no code path that picks a replacement.
  throw new UserDecisionRequired({
    unavailable: stranded,
    hostReported: await this.host.statusFor(stranded),
    available: live.map(l => l.key),
    message:
      `${stranded.join(", ")} ${stranded.length === 1 ? "is" : "are"} not available on this host. ` +
      `Nothing was substituted. Available right now: ${live.map(l => l.key).join(", ")}. ` +
      `Which would you like, or should I wait?`,
  })
}
```

There is deliberately **no** `pickBestAvailable()` function anywhere in this engine. A source
scan asserts it stays that way: the user chose those models for reasons the system cannot see,
and a helpful substitution destroys the thing they were doing.

### Logical vs physical — FLT-007, FLT-009

```ts
async runFleet(order: FleetOrder): Promise<FleetReport> {
  const packets = this.decompose(order.task, order.logicalWorkers)   // honour the count EXACTLY
  const waves = this.scheduler.buildWaves(packets)                   // topological, cycle-rejecting
  const cap = this.cfg.delegation.max_concurrent_calls               // bound the PHYSICAL calls
  const tally = new Tally(packets.length)

  for (const wave of waves) {
    const runnable = wave.packets.filter(p => {
      if (this.deps(p).some(d => tally.failed.has(d))) {
        tally.mark(p.id, "SKIPPED_DEPENDENCY")                       // FLT-008: skipped, not silent
        return false
      }
      return true
    })
    if (!runnable.length) continue

    // FLT-010: exactly one writer per wave while isolation is "none"
    const assignments = this.assign(runnable, order.models, this.cfg.delegation.writers_per_wave)

    // FLT-009: genuinely concurrent within the wave, bounded by `cap` — never a queue of 1
    for (const outcome of await pool(assignments, cap, a => this.runPacket(a)))
      tally.mark(outcome.packetId, await this.classify(outcome))     // may redistribute (FLT-011)
  }

  tally.assertReconciles()      // FLT-014: dispatched === terminal, or the run is corrupted
  return tally.report(await this.callLog())   // FLT-015: only models actually called
}
```

### Redistribution — FLT-011, FLT-012, FLT-013

```ts
async onWorkerFailure(packet: Packet, worker: ModelRef, cls: FailureClass) {
  if (cls === "rate_limit") return this.backoffAndRequeue(packet, worker)   // FLT-016: same model

  const sameClass = this.idleWorkersOfModel(worker)                          // FLT-011: SAME model
  if (sameClass.length) {
    const replacement = await this.buildReplacementPacket(packet)            // states what survives
    return this.dispatch(replacement, sameClass[0])
  }

  // FLT-012: the class is exhausted. Do not reach for another model.
  await this.ledger.appendProgress({
    note: `Model class ${worker.key} exhausted. ${this.stranded(worker).length} packets stranded. ` +
          `Not substituted. Continuing independent packets.`,
  })
  if (this.everyClassDown())                                                 // FLT-013
    return this.stopAndAsk("All worker classes are unavailable. State persisted.")
  return this.askUserAboutClass(worker)                                      // and keep going elsewhere
}
```

The `everyClassDown()` path persists state **before** asking, so a user who steps away for an
hour loses nothing.

### Supervision — WAR-004

Subscribe to the host event stream and watch for four conditions:

```ts
async supervise(h) {
  const deadline = Date.now() + h.packet.timeoutMs
  let lastCheckpoint = Date.now()

  for await (const ev of this.host.events(h.sessionId)) {
    switch (ev.type) {
      case "session.error":
        return this.fail(h, "crash", ev)                       // recover immediately

      case "file.edited":
        if (!h.packet.allowedPaths.some(a => isUnder(ev.path, a)))
          return this.fail(h, "scope-drift", ev)               // WAR-005: abort NOW, not at the end
        break

      case "message.updated":
        lastCheckpoint = Date.now()
        await this.ledger.upsertSubagent(checkpointFrom(ev))
        break

      case "session.idle":
        // The most dangerous state: it stopped, but did it finish?
        return (await this.acceptanceMet(h))
          ? this.done(h)
          : this.fail(h, "idle-unfinished", ev)
    }

    if (Date.now() > deadline) return this.fail(h, "timeout", null)
    if (Date.now() - lastCheckpoint > h.packet.checkpointIntervalMs * 2)
      return this.fail(h, "stalled", null)
  }
}
```

`idle-unfinished` is the case most often mistaken for success by agents and by humans.

### Recovery — WAR-006, WAR-007

```
1. Read the last checkpoint from SUBAGENTS.md
2. Inspect REALITY: git status / GET /session/:id/diff — what actually exists on disk
3. Classify: complete | partial | absent, per acceptance criterion
4. Preserve everything valid. Never delete surviving work because the session died.
5. Resume:
     host supports session resume  → resume that session, it still has the context
     it does not                    → build a REPLACEMENT PACKET stating explicitly:
                                       what already exists (do not redo)
                                       why the previous attempt failed
                                       the narrowed remaining scope
                                       whether the strategy must change
6. Increment the attempt counter. At the ceiling → escalate, never drop.
```

### Parent verification — WAR-010

Seven checks from `core/06-DELEGATION.md`, all of them, before any status change:

```ts
async verifyResult(id) {
  const s = await this.ledger.getSubagent(id)
  const diff = await this.host.sessionDiff(s.sessionId)      // real diff, not its claim
  return {
    diffRead:        diff !== null,
    scopeRespected:  changedFiles(diff).every(f => isUnder(f, s.packet.allowedPaths)),
    protectedClean:  !changedFiles(diff).some(f => this.gov.isProtectedWrite(f)),
    criteriaMet:     await this.checkEachCriterion(s),        // individually, not overall
    verificationRerun: await this.verifier.cascade(changedFiles(diff), s.packet.reqIds),
    integrationOk:   await this.verifier.cascade([], s.packet.reqIds, { maxTier: "suite" }),
    evasions:        await this.scanForEvasions(diff),        // skipped tests, weakened asserts, stubs
  }
}
```

Any false → `REJECTED`. The subagent's own report is never an input to this function.

---

## 6. RECALL — project memory

```ts
export class Recall {
  constructor(private root: string, private fs: FileSystem) {}
  async read(): Promise<Memory>
  async capture(fact: MemoryFact): Promise<void>              // deduped, redacted, dated
  async relevant(ctx: { files: string[]; task: string }, limit?: number): Promise<MemoryFact[]>
  async detectStale(): Promise<StaleEntry[]>
  async mirrorToHost(target: "AGENTS.md" | "CLAUDE.md"): Promise<void>
}
```

**Automatic capture (REC-002)** is what makes this compound. Facts are derived from real events,
not from the model remembering to write them:

| Event | Fact captured |
|---|---|
| A verification command succeeds for the first time | `commands.test = "<the command>"` — it worked, so it is true |
| A command fails with "not found" | `environment: <tool> is not available here` |
| Third failure on a requirement | `failed-approaches: <approach> — <why>, <date>, <REQ>` |
| A file is edited that always requires another edit | `architecture: X and Y must change together` |
| The user corrects the agent | `preferences: <the correction>` |

**Relevance (REC-003)** is intentionally simple: filename overlap, symbol overlap, requirement
component match, recency. No embeddings, no vector store — that is a dependency and a
complexity cost for a corpus of a hundred short lines. If it ever outgrows that, revisit it as
its own decision.

**Staleness (REC-004):** an entry referencing a file, path, or command that no longer exists is
flagged, not silently trusted. Stale memory is worse than none, because it is believed.

---

## 7. COUNCIL — targeted second opinion

```ts
export class Council {
  constructor(private host: HostClient, private ledger: Ledger) {}
  async available(): Promise<ModelRef[]>                       // live catalog, never hardcoded
  shouldConvene(ctx: ConveneContext): { yes: boolean; reason: string }
  async review(input: ReviewInput): Promise<Finding[]>         // hypotheses, not verdicts
}
```

### The convening gate — CNC-002

```ts
shouldConvene(ctx) {
  if (ctx.consecutiveFailures >= 3)   return { yes: true, reason: "third consecutive failure" }
  if (ctx.securityRelevant)           return { yes: true, reason: "security-relevant change" }
  if (ctx.irreversible)               return { yes: true, reason: "irreversible operation" }
  if (ctx.architectural && ctx.reversalCostHours > 1)
                                      return { yes: true, reason: "expensive to reverse" }
  if (ctx.kind === "requirement-extraction")
                                      return { yes: true, reason: "requirement diffing" }
  return { yes: false, reason: "routine work — verification is cheaper and stronger than review" }
}
```

That last line is the engine's whole philosophy. If a test can settle it, run the test.

### The review call — CNC-003, CNC-004

```ts
async review({ requirement, diff, testOutput, implementerModel }) {
  const reviewer = (await this.available()).find(m => m.key !== implementerModel)
  if (!reviewer) throw new ApexError(
    "Council needs a model different from the implementer. Only one model is available, " +
    "and a model reviewing its own work shares its blind spot. Skipping review.")

  const session = await this.host.createSession("APEX independent review")
  const out = await this.host.prompt(session.id, reviewer, [
    "Find defects in this change. Assume there is at least one.",
    "",
    `REQUIREMENT:\n${requirement.text}`,
    `ACCEPTANCE:\n${requirement.acceptance}`,
    `DIFF:\n${diff}`,
    `TEST OUTPUT:\n${testOutput}`,
    "",
    "Check: is the requirement met FULLY, not partially? What regresses?",
    "What edge case is unhandled? Report findings only — no praise, no summary.",
  ].join("\n"), { agent: "plan" })    // read-only agent: a reviewer must not edit

  return parseFindings(out)           // each is a HYPOTHESIS
}
```

Deliberately **not** sent: the implementer's reasoning. That is the anchor that would cause the
reviewer to reproduce the original mistake.

**CNC-005:** every finding is verified with evidence before it changes anything. **CNC-006:**
there is no code path from a vote or a tally to a requirement status — enforced by source scan.

---

## HOW THEY COMPOSE — one L2 edit, end to end

```
model calls edit(src/auth.py)
  │
  ├─ GOVERNOR.decide       protected? destructive? snapshot needed?
  │    └─ blocked → return an explanatory error to the model. Done.
  ├─ GOVERNOR.snapshot     copy the file into .apex/snapshots/REQ-014/
  ├─ [the edit runs]
  ├─ VERIFIER.cascade      parse → types → targeted test
  │    └─ FAIL → the literal error is injected into this same turn
  ├─ LEDGER.addVerification   record with literal output
  ├─ LEDGER.setStatus      IN_PROGRESS → IMPLEMENTED_NOT_VERIFIED (throws if illegal)
  ├─ RECALL.capture        "pytest tests/test_auth.py works" — because it just did
  └─ CORTEX                next turn's prompt now carries the new state
```

The model never had to remember to do any of it. That is the difference between L0 and L2, and
it is the entire reason the runtime is worth building.

---

Next: `MCP-SERVER.md` · `OPENCODE-PLUGIN.md` · `TESTING.md`
