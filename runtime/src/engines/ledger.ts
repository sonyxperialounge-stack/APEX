/**
 * LEDGER — durable state (LED-001..016).
 *
 * The only module that writes `.apex/`. Every other engine goes through this one, which
 * is what makes the invariants enforceable rather than aspirational.
 *
 * Storage is markdown, deliberately: it must be readable, diffable, committable and
 * hand-editable. Detail blocks are authoritative; summary tables are always regenerated
 * from them, so the totals can never disagree with the rows (LED-008 by construction).
 */

import path from "node:path"
import fsp from "node:fs/promises"
import {
  REQ_STATUSES,
  type ApexConfig,
  type DecisionRecord,
  type Finding,
  type LedgerStatus,
  type ProgressEntry,
  type ReqStatus,
  type Requirement,
  type ResumePoint,
  type SubagentRecord,
  type SubagentState,
  type VerificationRecord,
  type VerifyResult,
  type VerifyType,
} from "../core/types.ts"
import { ApexError, IllegalTransitionError } from "../core/errors.ts"
import { readTextOrNull, writeText, writeJson, readJson, existsSync } from "../core/json.ts"
import { apexDir, isFilesystemRoot } from "../core/paths.ts"
import { bound, redact } from "../core/redact.ts"
import { event, log } from "../core/log.ts"

// ── The transition table — LED-004, the heart of the engine ─────────────────

export const LEGAL_TRANSITIONS: Record<ReqStatus, ReqStatus[]> = {
  NOT_STARTED: ["IN_PROGRESS", "BLOCKED", "NOT_APPLICABLE"],
  IN_PROGRESS: ["IMPLEMENTED_NOT_VERIFIED", "BLOCKED", "NOT_APPLICABLE"],
  IMPLEMENTED_NOT_VERIFIED: ["VERIFIED_COMPLETE", "IN_PROGRESS", "BLOCKED"],
  VERIFIED_COMPLETE: ["IN_PROGRESS"], // reopened by the final audit
  BLOCKED: ["IN_PROGRESS", "NOT_APPLICABLE"],
  NOT_APPLICABLE: ["IN_PROGRESS"],
}

export const DEFAULT_CONFIG: ApexConfig = {
  projectRoot: "",
  autonomy: "GUARDED",
  allowedPaths: ["."],
  doNotRead: [],
  doNotTouch: [],
  ignore: ["node_modules/", ".git/", "dist/", "build/", "__pycache__/", ".venv/", "vendor/"],
  sourcesOfTruth: [],
  verifyCommands: {},
  limits: { maxSameStrategyFailures: 3, maxSubagentRetries: 2, handoffAtContextPct: 80 },
  council: { enabled: false, reviewerModel: null, conveneOn: [] },
  delegation: {
    mode: "AUTO",
    maxConcurrentCalls: 6,
    maxLogicalPackets: 200,
    writersPerWave: 1,
    isolation: "none",
    models: { commander: null, workers: [], reviewer: null, allowSubstitution: false, fallback: {} },
    onClassExhausted: "ask_user",
    announceAutonomous: true,
  },
}

const EMPTY_RESUME: ResumePoint = { nextAction: "", doNotRedo: "", verifyFirst: "", watchOut: "" }

export class Ledger {
  root: string
  dir: string
  /** Serialises read-modify-write cycles so concurrent callers cannot lose entries. */
  private queue: Promise<unknown>

  constructor(projectRoot: string) {
    this.root = projectRoot
    this.dir = apexDir(projectRoot)
    this.queue = Promise.resolve()
  }

  /**
   * LED-014 — run a mutation with exclusive access to the ledger.
   *
   * Write-level atomicity is not enough on its own: two callers that both READ before
   * either WRITES will each persist their own view, and one set of changes vanishes.
   */
  private mutate<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn)
    this.queue = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  // ── Files ────────────────────────────────────────────────────────────────

  file(name: string): string {
    return path.join(this.dir, name)
  }

  /** LED-001 — create the ledger, never overwriting an existing one. */
  async init(config: Partial<ApexConfig> = {}): Promise<{ created: boolean; config: ApexConfig }> {
    // Defence in depth. A host that hands over a bad path — OpenCode passes `worktree: "/"`
    // before a project is resolved — must not be able to scatter a ledger across a drive
    // root. The caller should validate too; this is the last line.
    if (isFilesystemRoot(this.root)) {
      throw new ApexError(
        `Refusing to create a ledger at the filesystem root (${this.root}). ` +
          `Pass a real project directory.`,
        "ROOT_LEDGER_REFUSED",
      )
    }
    const configFile = this.file("config.json")
    if (existsSync(configFile)) {
      return { created: false, config: await this.loadConfig() }
    }
    await fsp.mkdir(this.dir, { recursive: true })
    await fsp.mkdir(path.join(this.dir, "snapshots"), { recursive: true })
    await fsp.mkdir(path.join(this.dir, "archive"), { recursive: true })

    const merged: ApexConfig = {
      ...DEFAULT_CONFIG,
      ...config,
      projectRoot: config.projectRoot ?? this.root,
      limits: { ...DEFAULT_CONFIG.limits, ...(config.limits ?? {}) },
      council: { ...DEFAULT_CONFIG.council, ...(config.council ?? {}) },
      delegation: {
        ...DEFAULT_CONFIG.delegation,
        ...(config.delegation ?? {}),
        models: { ...DEFAULT_CONFIG.delegation.models, ...(config.delegation?.models ?? {}) },
      },
    }
    await writeJson(configFile, merged)
    await this.writeRequirements([])
    await this.writeVerifications([])
    await writeText(this.file("PROGRESS.md"), renderProgress([], [], EMPTY_RESUME))
    await writeText(this.file("DECISIONS.md"), "# Decision Log\n")
    await writeText(this.file("FINDINGS.md"), "# Findings\n")
    await writeText(this.file("SUBAGENTS.md"), "# Subagent Log\n")
    await writeText(this.file("MEMORY.md"), "# Project Memory\n")
    event("ledger.init", { root: this.root })
    return { created: true, config: merged }
  }

  /**
   * Keys a hand-written config might use that APEX does not recognise.
   *
   * A shipped template once used snake_case while the code read camelCase, so a user who
   * filled in `do_not_touch` had their protected paths dropped in silence — the write went
   * through. Silently ignoring a key the user deliberately set is the single worst thing
   * this system can do, so unknown keys are migrated where the intent is unambiguous and
   * REPORTED either way.
   */
  private static readonly LEGACY_KEYS: Record<string, string> = {
    project_root: "projectRoot",
    allowed_paths: "allowedPaths",
    do_not_read: "doNotRead",
    do_not_touch: "doNotTouch",
    sources_of_truth: "sourcesOfTruth",
    verify_commands: "verifyCommands",
    max_same_strategy_failures: "maxSameStrategyFailures",
    max_subagent_retries: "maxSubagentRetries",
    handoff_at_context_pct: "handoffAtContextPct",
    reviewer_model: "reviewerModel",
    convene_on: "conveneOn",
    max_concurrent_calls: "maxConcurrentCalls",
    max_logical_packets: "maxLogicalPackets",
    writers_per_wave: "writersPerWave",
    allow_substitution: "allowSubstitution",
    on_class_exhausted: "onClassExhausted",
    announce_autonomous: "announceAutonomous",
  }

  /** Verify tiers a user might reasonably write that are not tier names. */
  private static readonly LEGACY_TIERS: Record<string, string> = { test: "suite", run: "runtime" }

  /** Problems found in the last loadConfig. Surfaced by status and by doctor. */
  configIssues: string[] = []

  private normalise(raw: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    const issues: string[] = []
    const known = new Set(Object.keys(DEFAULT_CONFIG))

    for (const [key, value] of Object.entries(raw)) {
      if (key.startsWith("_")) continue // documentation keys in the template
      const migrated = Ledger.LEGACY_KEYS[key]
      if (migrated) {
        out[migrated] = value
        issues.push(`"${key}" is not a config key — read as "${migrated}". Rename it.`)
      } else if (known.has(key)) {
        out[key] = value
      } else {
        issues.push(`"${key}" is not a recognised config key and was IGNORED. Check the spelling.`)
      }
    }

    // Nested renames.
    for (const [outer, inner] of [["limits", null], ["council", null], ["delegation", "models"]] as const) {
      const section = out[outer]
      if (!section || typeof section !== "object") continue
      const fixed: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(section as Record<string, unknown>)) {
        const migrated = Ledger.LEGACY_KEYS[k]
        if (migrated) {
          fixed[migrated] = v
          issues.push(`"${outer}.${k}" is not a config key — read as "${outer}.${migrated}". Rename it.`)
        } else fixed[k] = v
      }
      if (inner && fixed[inner] && typeof fixed[inner] === "object") {
        const nested: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(fixed[inner] as Record<string, unknown>)) {
          const migrated = Ledger.LEGACY_KEYS[k]
          if (migrated) {
            nested[migrated] = v
            issues.push(`"${outer}.${inner}.${k}" is not a config key — read as "${migrated}". Rename it.`)
          } else nested[k] = v
        }
        fixed[inner] = nested
      }
      out[outer] = fixed
    }

    // Verify-tier renames: "test" and "run" are not tiers.
    const commands = out.verifyCommands
    if (commands && typeof commands === "object") {
      const fixed: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(commands as Record<string, unknown>)) {
        const migrated = Ledger.LEGACY_TIERS[k]
        if (migrated) {
          if (v !== null && v !== undefined) {
            fixed[migrated] = v
            issues.push(`verifyCommands."${k}" is not a tier — read as "${migrated}". Rename it.`)
          }
        } else fixed[k] = v
      }
      out.verifyCommands = fixed
    }

    this.configIssues = issues
    for (const issue of issues) log.warn(`config: ${issue}`)
    return out
  }

  async loadConfig(): Promise<ApexConfig> {
    const stored = await readJson<Record<string, unknown>>(this.file("config.json"), {})
    const raw = this.normalise(stored) as Partial<ApexConfig>
    return {
      ...DEFAULT_CONFIG,
      ...raw,
      projectRoot: raw.projectRoot || this.root,
      limits: { ...DEFAULT_CONFIG.limits, ...(raw.limits ?? {}) },
      council: { ...DEFAULT_CONFIG.council, ...(raw.council ?? {}) },
      delegation: {
        ...DEFAULT_CONFIG.delegation,
        ...(raw.delegation ?? {}),
        models: { ...DEFAULT_CONFIG.delegation.models, ...(raw.delegation?.models ?? {}) },
      },
    }
  }

  async saveConfig(config: ApexConfig): Promise<void> {
    await writeJson(this.file("config.json"), config)
  }

  // ── Requirements ─────────────────────────────────────────────────────────

  async listRequirements(filter?: { status?: ReqStatus }): Promise<Requirement[]> {
    const all = await this.readRequirements()
    return filter?.status ? all.filter((r) => r.status === filter.status) : all
  }

  async getRequirement(id: string): Promise<Requirement> {
    const found = (await this.readRequirements()).find((r) => r.id === id)
    if (!found) throw new ApexError(`Unknown requirement ${id}.`, "UNKNOWN_REQUIREMENT")
    return found
  }

  /** LED-002, LED-007 — add a requirement. IDs are assigned and never reused. */
  async addRequirement(input: {
    source: string
    text: string
    acceptance: string
    verifyBy: string
    id?: string
    component?: string
    dependsOn?: string[]
    notes?: string
  }): Promise<Requirement> {
   return this.mutate(async () => {
    const all = await this.readRequirements()
    const id = input.id ?? nextId("REQ", all.map((r) => r.id))
    if (all.some((r) => r.id === id)) {
      throw new ApexError(`Requirement ${id} already exists. IDs are never reused.`, "DUPLICATE_ID")
    }
    if (!input.text.trim()) throw new ApexError("A requirement needs text.")
    if (!input.acceptance.trim()) {
      throw new ApexError(
        `${id} needs an acceptance criterion. If you cannot state how you will know it is ` +
          `satisfied, you are not ready to start it.`,
      )
    }
    const req: Requirement = {
      id,
      source: input.source || "unspecified",
      text: input.text.trim(),
      component: input.component ?? "",
      dependsOn: input.dependsOn ?? [],
      acceptance: input.acceptance.trim(),
      verifyBy: input.verifyBy.trim(),
      status: "NOT_STARTED",
      evidence: [],
      files: [],
      notes: input.notes ?? "",
      reason: "",
    }
    all.push(req)
    await this.writeRequirements(all)
    event("req.add", { id, source: req.source })
    return req
   })
  }

  /**
   * LED-003..006 — set a status, enforcing the legal path and the evidence rule.
   *
   * The error messages are the product: a model that tries to shortcut is told exactly
   * what to do instead, which is what turns a doctrine rule into a mechanism.
   */
  async setStatus(
    id: string,
    next: ReqStatus,
    opts: { reason?: string; evidenceId?: string; files?: string[] } = {},
  ): Promise<Requirement> {
   return this.mutate(async () => {
    if (!REQ_STATUSES.includes(next)) {
      throw new ApexError(
        `"${next}" is not a status. Legal statuses: ${REQ_STATUSES.join(", ")}.`,
        "BAD_STATUS",
      )
    }
    const all = await this.readRequirements()
    const idx = all.findIndex((r) => r.id === id)
    if (idx === -1) throw new ApexError(`Unknown requirement ${id}.`, "UNKNOWN_REQUIREMENT")
    const req = all[idx]!

    if (req.status !== next && !LEGAL_TRANSITIONS[req.status].includes(next)) {
      throw new IllegalTransitionError(
        `Illegal transition ${req.status} → ${next} for ${id}. ` +
          `Legal from here: ${LEGAL_TRANSITIONS[req.status].join(", ")}. ` +
          `To reach VERIFIED_COMPLETE: set IN_PROGRESS, implement it, run the check in ` +
          `verifyBy (\`${req.verifyBy || "<none recorded>"}\`), record the result, set ` +
          `IMPLEMENTED_NOT_VERIFIED, then VERIFIED_COMPLETE.`,
      )
    }

    if (next === "VERIFIED_COMPLETE") {
      const passing = (await this.verificationsFor(id)).filter((v) => v.result === "PASS")
      if (passing.length === 0) {
        throw new IllegalTransitionError(
          `${id} cannot be VERIFIED_COMPLETE: no passing verification record references it. ` +
            `Run \`${req.verifyBy || "the check in verifyBy"}\` and record the result first. ` +
            `Evidence is not optional — that is the whole point of the status.`,
        )
      }
    }

    if (next === "BLOCKED" && !opts.reason?.trim()) {
      throw new ApexError(
        `BLOCKED requires evidence. State exactly what failed, what you observed, and what ` +
          `would unblock it.`,
        "MISSING_REASON",
      )
    }
    if (next === "NOT_APPLICABLE" && !opts.reason?.trim()) {
      throw new ApexError(`NOT_APPLICABLE requires a written justification.`, "MISSING_REASON")
    }

    const updated: Requirement = {
      ...req,
      status: next,
      reason: opts.reason?.trim() ?? (next === "BLOCKED" || next === "NOT_APPLICABLE" ? req.reason : ""),
      evidence: opts.evidenceId && !req.evidence.includes(opts.evidenceId)
        ? [...req.evidence, opts.evidenceId]
        : req.evidence,
      files: opts.files ? unique([...req.files, ...opts.files]) : req.files,
    }
    all[idx] = updated
    await this.writeRequirements(all)
    event("req.status", { id, from: req.status, to: next })
    return updated
   })
  }

  /** Attach implementation files without a status change. */
  async attachFiles(id: string, files: string[]): Promise<Requirement> {
   return this.mutate(async () => {
    const all = await this.readRequirements()
    const idx = all.findIndex((r) => r.id === id)
    if (idx === -1) throw new ApexError(`Unknown requirement ${id}.`, "UNKNOWN_REQUIREMENT")
    all[idx] = { ...all[idx]!, files: unique([...all[idx]!.files, ...files]) }
    await this.writeRequirements(all)
    return all[idx]!
   })
  }

  async totals(): Promise<Record<ReqStatus, number>> {
    return computeTotals(await this.readRequirements())
  }

  // ── Verification ─────────────────────────────────────────────────────────

  async listVerifications(): Promise<VerificationRecord[]> {
    return this.readVerifications()
  }

  async verificationsFor(reqId: string): Promise<VerificationRecord[]> {
    return (await this.readVerifications()).filter((v) => v.reqIds.includes(reqId))
  }

  /** LED-009 — record a check. NOT_RUN is first-class and requires a reason. */
  async addVerification(input: {
    reqIds: string[]
    type: VerifyType
    command: string
    expected: string
    actual: string
    exitCode: number | null
    result: VerifyResult
    reason?: string
    durationMs?: number
  }): Promise<VerificationRecord> {
   return this.mutate(async () => {
    if (input.result === "NOT_RUN" && !input.reason?.trim()) {
      throw new ApexError(
        `NOT_RUN requires a reason — which tier could not run, and why. A silent skip is ` +
          `indistinguishable from a pass, and that is the failure this system exists to prevent.`,
        "MISSING_REASON",
      )
    }
    const all = await this.readVerifications()
    const record: VerificationRecord = {
      id: nextId("V", all.map((v) => v.id)),
      reqIds: input.reqIds,
      type: input.type,
      command: input.command,
      expected: input.expected || (input.result === "NOT_RUN" ? "—" : "exit code 0"),
      actual: bound(redact(input.actual ?? "")),
      exitCode: input.exitCode,
      result: input.result,
      reason: input.reason?.trim() ?? "",
      durationMs: input.durationMs ?? 0,
      timestamp: new Date().toISOString(),
    }
    all.push(record)
    await this.writeVerifications(all)

    // Link the evidence back onto every requirement it covers.
    if (record.reqIds.length) {
      const reqs = await this.readRequirements()
      let touched = false
      for (const r of reqs) {
        if (record.reqIds.includes(r.id) && !r.evidence.includes(record.id)) {
          r.evidence.push(record.id)
          touched = true
        }
      }
      if (touched) await this.writeRequirements(reqs)
    }
    event("verify.record", { id: record.id, result: record.result, type: record.type })
    return record
   })
  }

  // ── Progress and resume ──────────────────────────────────────────────────

  async appendProgress(entry: Partial<ProgressEntry>): Promise<void> {
   return this.mutate(async () => {
    const state = await this.readProgress()
    state.entries.push({
      timestamp: entry.timestamp ?? new Date().toISOString(),
      reqId: entry.reqId ?? "",
      what: entry.what ?? "",
      filesChanged: entry.filesChanged ?? [],
      commands: entry.commands ?? [],
      baseline: entry.baseline ?? "",
      result: entry.result ?? "",
      note: entry.note ?? "",
    })
    await writeText(this.file("PROGRESS.md"), renderProgress(state.entries, state.blocked, state.resume))
   })
  }

  async setResumePoint(rp: Partial<ResumePoint>): Promise<void> {
   return this.mutate(async () => {
    const state = await this.readProgress()
    const merged = { ...state.resume, ...rp }
    await writeText(this.file("PROGRESS.md"), renderProgress(state.entries, state.blocked, merged))
   })
  }

  async getResumePoint(): Promise<ResumePoint> {
    return (await this.readProgress()).resume
  }

  // ── Side records ─────────────────────────────────────────────────────────

  async addDecision(input: Omit<DecisionRecord, "id" | "timestamp">): Promise<DecisionRecord> {
   return this.mutate(async () => {
    const existing = await readTextOrNull(this.file("DECISIONS.md"))
    const ids = [...(existing ?? "").matchAll(/^## (DEC-\d+)/gm)].map((m) => m[1]!)
    const record: DecisionRecord = { ...input, id: nextId("DEC", ids), timestamp: new Date().toISOString() }
    const block = [
      ``,
      `## ${record.id} — ${record.timestamp}`,
      `- **Context:** ${record.context}`,
      `- **Problem:** ${record.problem}`,
      `- **Options:** ${record.options.join(" · ")}`,
      `- **Chose:** ${record.chose}`,
      `- **Why this does not violate the plan:** ${record.whyNotAViolation}`,
      `- **Affects:** ${record.affects.join(", ") || "—"}`,
      `- **Reversible:** ${record.reversible}`,
      ``,
    ].join("\n")
    await writeText(this.file("DECISIONS.md"), (existing ?? "# Decision Log\n") + block)
    event("decision.add", { id: record.id })
    return record
   })
  }

  async addFinding(input: Omit<Finding, "id">): Promise<Finding> {
   return this.mutate(async () => {
    const existing = await readTextOrNull(this.file("FINDINGS.md"))
    const ids = [...(existing ?? "").matchAll(/^## (F-\d+)/gm)].map((m) => m[1]!)
    const record: Finding = { ...input, id: nextId("F", ids) }
    const block = [
      ``,
      `## ${record.id} — ${record.what.split("\n")[0]}`,
      `**Where:** ${record.where}`,
      `**What:** ${record.what}`,
      `**Why not fixed now:** ${record.whyNotFixed}`,
      `**Recommend:** ${record.recommend}`,
      ``,
    ].join("\n")
    await writeText(this.file("FINDINGS.md"), (existing ?? "# Findings\n") + block)
    return record
   })
  }

  async listFindings(): Promise<Finding[]> {
    const text = (await readTextOrNull(this.file("FINDINGS.md"))) ?? ""
    const out: Finding[] = []
    for (const block of text.split(/^## /m).slice(1)) {
      const id = /^(F-\d+)/.exec(block)?.[1]
      if (!id) continue
      out.push({
        id,
        where: field(block, "Where"),
        what: field(block, "What"),
        whyNotFixed: field(block, "Why not fixed now"),
        recommend: field(block, "Recommend"),
      })
    }
    return out
  }

  async upsertSubagent(record: SubagentRecord): Promise<void> {
   return this.mutate(async () => {
    const all = await this.listSubagents()
    const idx = all.findIndex((s) => s.id === record.id)
    if (idx === -1) all.push(record)
    else all[idx] = record
    await writeText(this.file("SUBAGENTS.md"), renderSubagents(all))
    event("subagent.upsert", { id: record.id, state: record.state })
   })
  }

  async listSubagents(): Promise<SubagentRecord[]> {
    const text = (await readTextOrNull(this.file("SUBAGENTS.md"))) ?? ""
    const out: SubagentRecord[] = []
    for (const block of text.split(/^## /m).slice(1)) {
      // Any prefixed id: warden packets are W-0001, hand-written records are SUB-001.
      const id = /^([A-Z]+-[\w-]+)/.exec(block)?.[1]
      if (!id) continue
      out.push({
        id,
        parentReqIds: listField(block, "Parent"),
        sessionId: field(block, "Session"),
        scope: field(block, "Scope"),
        allowedPaths: listField(block, "Allowed"),
        forbiddenPaths: listField(block, "Forbidden"),
        acceptance: field(block, "Acceptance"),
        state: (field(block, "State") || "ASSIGNED") as SubagentState,
        checkpoint: field(block, "Checkpoint"),
        filesChanged: listField(block, "Files changed"),
        parentVerification: field(block, "Parent verification"),
        failureClass: field(block, "Failure class"),
        attempt: Number(field(block, "Attempt") || "1"),
        maxAttempts: Number(field(block, "Max attempts") || "2"),
        nextStrategy: field(block, "Next strategy"),
        model: field(block, "Model"),
        fleetId: field(block, "Fleet"),
      })
    }
    return out
  }

  // ── Status, handoff, archive ─────────────────────────────────────────────

  async status(): Promise<LedgerStatus> {
    const reqs = await this.readRequirements()
    const totals = computeTotals(reqs)
    const active = reqs.find((r) => r.status === "IN_PROGRESS") ?? null
    const runtime = await readJson<{ level?: number }>(this.file("runtime.json"), {})
    return {
      totals,
      totalRequirements: reqs.length,
      activeRequirement: active?.id ?? null,
      blocked: reqs.filter((r) => r.status === "BLOCKED").map((r) => ({ id: r.id, reason: r.reason })),
      resumePoint: await this.getResumePoint(),
      level: (runtime.level === 2 ? 2 : runtime.level === 1 ? 1 : 0) as 0 | 1 | 2,
    }
  }

  async activeRequirement(): Promise<string | null> {
    return (await this.status()).activeRequirement
  }

  /** LED-012 — generated FROM STATE. Never from a model's summary. */
  async generateHandoff(extra: { architecture?: string; environment?: string } = {}): Promise<string> {
    const config = await this.loadConfig()
    const reqs = await this.readRequirements()
    const totals = computeTotals(reqs)
    const resume = await this.getResumePoint()
    const subs = await this.listSubagents()
    const verifications = await this.readVerifications()

    const blocked = reqs.filter((r) => r.status === "BLOCKED")
    const unverified = reqs.filter((r) => r.status === "IMPLEMENTED_NOT_VERIFIED")
    const openSubs = subs.filter((s) => !["VERIFIED_ACCEPTED", "ABANDONED_BLOCKED"].includes(s.state))
    const failedChecks = verifications.filter((v) => v.result === "FAIL" || v.result === "NOT_RUN")
    const cmds = Object.entries(config.verifyCommands).filter(([, v]) => v)

    const lines = [
      `# Handoff — ${new Date().toISOString()}`,
      ``,
      `## Objective`,
      config.sourcesOfTruth.length
        ? `Implement: ${config.sourcesOfTruth.join(", ")}`
        : `(objective not recorded in config.sourcesOfTruth)`,
      `Project root: ${config.projectRoot}`,
      ``,
      `## Sources of truth`,
      config.sourcesOfTruth.length ? config.sourcesOfTruth.map((s) => `- ${s}`).join("\n") : "- (none recorded)",
      ``,
      `## User restrictions`,
      `- Never read: ${config.doNotRead.join(", ") || "(none)"}`,
      `- Never modify: ${config.doNotTouch.join(", ") || "(none)"}`,
      `- Autonomy: ${config.autonomy}`,
      ``,
      `## State`,
      `${totals.VERIFIED_COMPLETE}/${reqs.length} requirements verified. Full table: REQUIREMENTS.md`,
      Object.entries(totals)
        .filter(([, n]) => n > 0)
        .map(([k, n]) => `- ${k}: ${n}`)
        .join("\n") || "- (no requirements recorded)",
      ``,
      `## Architecture you need to know`,
      extra.architecture ?? "(not recorded — add what is not obvious from any single file)",
      ``,
      `## Commands`,
      cmds.length ? cmds.map(([k, v]) => `- ${k}: \`${v}\``).join("\n") : "- (none detected)",
      ``,
      `## Environment`,
      extra.environment ?? "(not recorded)",
      ``,
      `## Known failures`,
      blocked.length
        ? blocked.map((r) => `- ${r.id} BLOCKED — ${r.reason}`).join("\n")
        : "- none",
      unverified.length
        ? unverified.map((r) => `- ${r.id} implemented but UNVERIFIED — ${r.reason || "no reason recorded"}`).join("\n")
        : "",
      failedChecks.length
        ? failedChecks.slice(-5).map((v) => `- ${v.id} ${v.result} — \`${v.command}\` ${v.reason}`).join("\n")
        : "",
      ``,
      `## Subagents`,
      openSubs.length
        ? openSubs
            .map(
              (s) =>
                `- ${s.id} (${s.state}, attempt ${s.attempt}/${s.maxAttempts}) — ${s.checkpoint || "no checkpoint"}. ` +
                `Do not restart from zero.`,
            )
            .join("\n")
        : "- none open",
      ``,
      `## RESUME`,
      `Start from: ${resume.nextAction || "(not recorded)"}`,
      `Do not redo: ${resume.doNotRedo || "(not recorded)"}`,
      `Verify first: ${resume.verifyFirst || "(not recorded)"}`,
      `Watch out: ${resume.watchOut || "—"}`,
      ``,
    ]
    const text = lines.filter((l) => l !== "").join("\n") + "\n"
    await writeText(this.file("HANDOFF.md"), text)
    return text
  }

  /** LED-013 — archive verified detail. Refuses to archive anything unresolved. */
  async archivePhase(phase: string, reqIds: string[]): Promise<{ archived: string[] }> {
    const reqs = await this.readRequirements()
    const unresolved = reqIds.filter((id) => {
      const r = reqs.find((x) => x.id === id)
      return !r || (r.status !== "VERIFIED_COMPLETE" && r.status !== "NOT_APPLICABLE")
    })
    if (unresolved.length) {
      throw new ApexError(
        `Refusing to archive ${phase}: ${unresolved.join(", ")} ${unresolved.length === 1 ? "is" : "are"} ` +
          `not resolved. Unresolved work is never archived.`,
        "ARCHIVE_UNRESOLVED",
      )
    }
    const verifications = await this.readVerifications()
    const relevant = verifications.filter((v) => v.reqIds.some((id) => reqIds.includes(id)))
    const target = path.join(this.dir, "archive", `${phase}.md`)
    const text = [
      `# Archive — ${phase}`,
      `Archived ${new Date().toISOString()}`,
      ``,
      `## Requirements`,
      ...reqIds.map((id) => renderRequirementDetail(reqs.find((r) => r.id === id)!)),
      ``,
      `## Evidence`,
      ...relevant.map(renderVerificationDetail),
    ].join("\n")
    await writeText(target, text)
    await this.appendProgress({ note: `Phase ${phase} detail archived → archive/${phase}.md` })
    return { archived: reqIds }
  }

  async writeRuntimeMarker(level: 1 | 2, version: string): Promise<void> {
    await writeJson(this.file("runtime.json"), { level, version, updatedAt: new Date().toISOString() })
  }

  // ── Storage: read ────────────────────────────────────────────────────────

  /** LED-016 — a corrupt ledger is recovered from its backup, with a warning. */
  private async readWithRecovery(name: string): Promise<string> {
    const file = this.file(name)
    const text = await readTextOrNull(file)
    if (text !== null) return text
    const bak = await readTextOrNull(`${file}.apex.bak`)
    if (bak !== null) {
      log.warn(`Recovered ${name} from backup — the primary file was missing.`)
      await writeText(file, bak)
      return bak
    }
    return ""
  }

  async readRequirements(): Promise<Requirement[]> {
    const text = await this.readWithRecovery("REQUIREMENTS.md")
    const out: Requirement[] = []
    for (const block of text.split(/^### /m).slice(1)) {
      const id = /^(REQ-[\w-]+)/.exec(block)?.[1]
      if (!id) continue
      const status = field(block, "Status") as ReqStatus
      out.push({
        id,
        source: field(block, "Source"),
        text: field(block, "Requirement"),
        component: field(block, "Component"),
        dependsOn: listField(block, "Depends on"),
        acceptance: field(block, "Acceptance"),
        verifyBy: stripTicks(field(block, "Verify by")),
        status: REQ_STATUSES.includes(status) ? status : "NOT_STARTED",
        evidence: listField(block, "Evidence"),
        files: listField(block, "Implemented in"),
        notes: field(block, "Notes"),
        reason: field(block, "Reason"),
      })
    }
    return out
  }

  async readVerifications(): Promise<VerificationRecord[]> {
    const text = await this.readWithRecovery("VERIFICATION.md")
    const out: VerificationRecord[] = []
    for (const block of text.split(/^### /m).slice(1)) {
      const id = /^(V-\d+)/.exec(block)?.[1]
      if (!id) continue
      const fence = /```text\n([\s\S]*?)\n```/.exec(block)
      const exit = field(block, "Exit code")
      out.push({
        id,
        reqIds: listField(block, "Requirements"),
        type: (field(block, "Type") || "manual") as VerifyType,
        command: stripTicks(field(block, "Command")),
        expected: field(block, "Expected"),
        actual: fence?.[1] ?? "",
        exitCode: exit === "" || exit === "null" ? null : Number(exit),
        result: (field(block, "Result") || "NOT_RUN") as VerifyResult,
        reason: field(block, "Reason"),
        durationMs: Number(field(block, "Duration") || "0"),
        timestamp: field(block, "Timestamp"),
      })
    }
    return out
  }

  private async readProgress(): Promise<{ entries: ProgressEntry[]; blocked: string[]; resume: ResumePoint }> {
    const text = await this.readWithRecovery("PROGRESS.md")
    const entries: ProgressEntry[] = []
    for (const block of text.split(/^### /m).slice(1)) {
      const head = /^(\S+) — (.*)$/m.exec(block)
      if (!head) continue
      entries.push({
        timestamp: head[1]!,
        reqId: field(block, "Requirement"),
        what: head[2]!,
        filesChanged: listField(block, "Changed"),
        commands: listField(block, "Ran"),
        baseline: field(block, "Baseline"),
        result: field(block, "Result"),
        note: field(block, "Note"),
      })
    }
    const section = /## RESUME POINT\n([\s\S]*?)(?:\n## |\n*$)/.exec(text)?.[1] ?? ""
    const resume: ResumePoint = {
      nextAction: line(section, "Next action"),
      doNotRedo: line(section, "Do not redo"),
      verifyFirst: line(section, "Verify first"),
      watchOut: line(section, "Watch out"),
    }
    return { entries, blocked: [], resume }
  }

  // ── Storage: write ───────────────────────────────────────────────────────

  private async writeRequirements(reqs: Requirement[]): Promise<void> {
    await writeText(this.file("REQUIREMENTS.md"), renderRequirements(reqs))
  }

  private async writeVerifications(records: VerificationRecord[]): Promise<void> {
    await writeText(this.file("VERIFICATION.md"), renderVerifications(records))
  }
}

// ── Rendering ───────────────────────────────────────────────────────────────

function computeTotals(reqs: Requirement[]): Record<ReqStatus, number> {
  const totals = Object.fromEntries(REQ_STATUSES.map((s) => [s, 0])) as Record<ReqStatus, number>
  for (const r of reqs) totals[r.status]++
  return totals
}

export function renderRequirements(reqs: Requirement[]): string {
  const totals = computeTotals(reqs)
  const summary =
    `${reqs.length} total · ${totals.VERIFIED_COMPLETE} verified · ` +
    `${totals.IMPLEMENTED_NOT_VERIFIED} implemented-unverified · ${totals.IN_PROGRESS} in-progress · ` +
    `${totals.NOT_STARTED} not-started · ${totals.BLOCKED} blocked · ${totals.NOT_APPLICABLE} n/a`

  const rows = reqs.length
    ? reqs
        .map((r) => `| ${r.id} | ${cell(r.text)} | ${r.status} | ${r.evidence.join(", ") || "—"} |`)
        .join("\n")
    : "| — | (no requirements recorded yet) | — | — |"

  return [
    `# Requirements`,
    ``,
    `**Totals:** ${summary}`,
    `**Last updated:** ${new Date().toISOString()}`,
    ``,
    `> Invariants: no row is ever deleted · no ID is ever reused · every row has exactly one`,
    `> status · the totals line is regenerated from the detail blocks below, so it cannot disagree.`,
    ``,
    `| ID | Summary | Status | Evidence |`,
    `|---|---|---|---|`,
    rows,
    ``,
    `---`,
    ...reqs.map(renderRequirementDetail),
    ``,
  ].join("\n")
}

function renderRequirementDetail(r: Requirement): string {
  return [
    ``,
    `### ${r.id}`,
    `- **Source:** ${r.source}`,
    `- **Requirement:** ${r.text}`,
    `- **Component:** ${r.component}`,
    `- **Depends on:** ${r.dependsOn.join(", ")}`,
    `- **Acceptance:** ${r.acceptance}`,
    `- **Verify by:** \`${r.verifyBy}\``,
    `- **Status:** ${r.status}`,
    `- **Implemented in:** ${r.files.join(", ")}`,
    `- **Evidence:** ${r.evidence.join(", ")}`,
    `- **Notes:** ${r.notes}`,
    `- **Reason:** ${r.reason}`,
  ].join("\n")
}

export function renderVerifications(records: VerificationRecord[]): string {
  const rows = records.length
    ? records
        .map(
          (v) =>
            `| ${v.id} | ${v.reqIds.join(", ") || "—"} | ${v.type} | \`${cell(v.command)}\` | ` +
            `${cell(v.expected)} | ${cell(firstLine(v.actual) || v.reason)} | ${v.result} |`,
        )
        .join("\n")
    : "| — | — | — | — | — | — | — |"

  return [
    `# Verification Log`,
    ``,
    `| ID | REQ | Type | Command | Expected | Actual | Result |`,
    `|---|---|---|---|---|---|---|`,
    rows,
    ``,
    `> A log with no FAIL and no NOT_RUN rows over a long project is not excellence — it is`,
    `> evidence that verification was not really happening.`,
    ``,
    `## Evidence`,
    ...records.map(renderVerificationDetail),
    ``,
  ].join("\n")
}

function renderVerificationDetail(v: VerificationRecord): string {
  return [
    ``,
    `### ${v.id}`,
    `- **Requirements:** ${v.reqIds.join(", ")}`,
    `- **Type:** ${v.type}`,
    `- **Command:** \`${v.command}\``,
    `- **Expected:** ${v.expected}`,
    `- **Result:** ${v.result}`,
    `- **Exit code:** ${v.exitCode === null ? "null" : v.exitCode}`,
    `- **Duration:** ${v.durationMs}`,
    `- **Timestamp:** ${v.timestamp}`,
    `- **Reason:** ${v.reason}`,
    ``,
    "```text",
    v.actual,
    "```",
  ].join("\n")
}

function renderProgress(entries: ProgressEntry[], blocked: string[], resume: ResumePoint): string {
  return [
    `# Progress`,
    ``,
    `## Completed`,
    ...entries.map((e) =>
      [
        ``,
        `### ${e.timestamp} — ${e.what || e.note || "(entry)"}`,
        `- **Requirement:** ${e.reqId}`,
        `- **Changed:** ${e.filesChanged.join(", ")}`,
        `- **Ran:** ${e.commands.join(" · ")}`,
        `- **Baseline:** ${e.baseline}`,
        `- **Result:** ${e.result}`,
        `- **Note:** ${e.note}`,
      ].join("\n"),
    ),
    ``,
    `## Blocked`,
    blocked.length ? blocked.map((b) => `- ${b}`).join("\n") : "- (none)",
    ``,
    `## RESUME POINT`,
    `Next action: ${resume.nextAction}`,
    `Do not redo: ${resume.doNotRedo}`,
    `Verify first: ${resume.verifyFirst}`,
    `Watch out: ${resume.watchOut}`,
    ``,
  ].join("\n")
}

function renderSubagents(records: SubagentRecord[]): string {
  return [
    `# Subagent Log`,
    ...records.map((s) =>
      [
        ``,
        `## ${s.id}`,
        `- **Parent:** ${s.parentReqIds.join(", ")}`,
        `- **Fleet:** ${s.fleetId}`,
        `- **Session:** ${s.sessionId}`,
        `- **Model:** ${s.model}`,
        `- **Scope:** ${s.scope}`,
        `- **Allowed:** ${s.allowedPaths.join(", ")}`,
        `- **Forbidden:** ${s.forbiddenPaths.join(", ")}`,
        `- **Acceptance:** ${s.acceptance}`,
        `- **State:** ${s.state}`,
        `- **Checkpoint:** ${s.checkpoint}`,
        `- **Files changed:** ${s.filesChanged.join(", ")}`,
        `- **Parent verification:** ${s.parentVerification}`,
        `- **Failure class:** ${s.failureClass}`,
        `- **Attempt:** ${s.attempt}`,
        `- **Max attempts:** ${s.maxAttempts}`,
        `- **Next strategy:** ${s.nextStrategy}`,
      ].join("\n"),
    ),
    ``,
  ].join("\n")
}

// ── Parsing helpers — lenient in, canonical out (LED-015) ───────────────────

function field(block: string, name: string): string {
  // `[ \t]*` deliberately, NOT `\s*`: `\s` matches newlines, so an empty field would
  // swallow the following line and report the next field's text as its own value.
  const re = new RegExp(`^[-*]?[ \\t]*\\*\\*${escapeRe(name)}:\\*\\*[ \\t]*(.*)$`, "mi")
  return (re.exec(block)?.[1] ?? "").trim()
}

function listField(block: string, name: string): string[] {
  const raw = field(block, name)
  if (!raw || raw === "—" || raw === "-") return []
  return raw
    .split(",")
    .map((s) => stripTicks(s.trim()))
    .filter(Boolean)
}

function line(section: string, name: string): string {
  const re = new RegExp(`^${escapeRe(name)}:[ \\t]*(.*)$`, "mi")
  const v = (re.exec(section)?.[1] ?? "").trim()
  return v === "(not recorded)" || v === "—" ? "" : v
}

function stripTicks(s: string): string {
  return s.replace(/^`+|`+$/g, "").trim()
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Table cells must not contain raw pipes or newlines. */
function cell(s: string): string {
  return (s || "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ").slice(0, 160)
}

function firstLine(s: string): string {
  return (s || "").split(/\r?\n/).find((l) => l.trim()) ?? ""
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)]
}

/** Monotonic id allocation. IDs are never reused, even after a gap. */
export function nextId(prefix: string, existing: string[]): string {
  let max = 0
  for (const id of existing) {
    const n = Number(new RegExp(`^${prefix}-(\\d+)$`).exec(id)?.[1] ?? 0)
    if (n > max) max = n
  }
  return `${prefix}-${String(max + 1).padStart(3, "0")}`
}
