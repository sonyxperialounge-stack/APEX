/**
 * CORTEX — system-prompt assembly (COR-001..007).
 *
 * The highest-leverage engine in the system. A model does not so much "forget" its
 * instructions as have them pushed out by distance and compaction. Re-stating the active
 * requirement, the protected paths, and the last three failures on EVERY request removes
 * the decay mechanism entirely.
 *
 * Two properties make it safe to run on every turn:
 *   - deterministic given identical state, so it caches and it tests (COR-005);
 *   - budgeted, degrading from the bottom, so safety content is never the part that
 *     gets dropped (COR-002, COR-003).
 */

import type { Ledger } from "./ledger.ts"
import type { ApexConfig, Requirement, VerificationRecord } from "../core/types.ts"
import { redact } from "../core/redact.ts"
import { log } from "../core/log.ts"

/**
 * Section priority. Index 0 is dropped LAST.
 *
 * Protected paths and autonomy outrank everything: a truncated prompt that loses the
 * requirement costs a wasted turn, one that loses the protected paths costs the user's
 * files.
 */
export const SECTION_ORDER = [
  "protected",
  "autonomy",
  "active",
  "failures",
  "state",
  "rules",
  "memory",
] as const

export type SectionName = (typeof SECTION_ORDER)[number]

export interface AssembleContext {
  sessionId?: string
  activeReq?: string | null
  files?: string[]
  /** Approximate token ceiling. Default 2000. */
  budget?: number
  level?: 0 | 1 | 2
}

export interface AssembledPrompt {
  text: string
  sections: SectionName[]
  dropped: SectionName[]
  estimatedTokens: number
}

/** Rough token estimate: ~4 characters per token. Deliberately cheap and stable. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export class Cortex {
  private ledger: Ledger
  /** Optional memory source. Injected so the engine stays testable alone. */
  private memory: { relevant(files: string[], limit: number): Promise<string[]> } | null

  constructor(ledger: Ledger, memory: { relevant(files: string[], limit: number): Promise<string[]> } | null = null) {
    this.ledger = ledger
    this.memory = memory
  }

  async assemble(ctx: AssembleContext = {}): Promise<AssembledPrompt> {
    const budget = ctx.budget ?? 2000

    let config: ApexConfig
    let requirements: Requirement[] = []
    let verifications: VerificationRecord[] = []
    try {
      config = await this.ledger.loadConfig()
      requirements = await this.ledger.readRequirements()
      verifications = await this.ledger.readVerifications()
    } catch (err) {
      // COR-007 — an unreadable ledger still yields a usable prompt.
      log.warn("cortex: ledger unreadable, falling back to the static doctrine summary", {
        err: String(err),
      })
      const fallback = [header(ctx.level ?? 0), "", rulesSection()].join("\n")
      return { text: fallback, sections: ["rules"], dropped: [], estimatedTokens: estimateTokens(fallback) }
    }

    const activeId = ctx.activeReq ?? requirements.find((r) => r.status === "IN_PROGRESS")?.id ?? null
    const active = activeId ? (requirements.find((r) => r.id === activeId) ?? null) : null

    const memoryFacts = this.memory ? await this.memory.relevant(ctx.files ?? [], 5).catch(() => []) : []

    const built: Record<SectionName, string> = {
      protected: protectedSection(config),
      autonomy: autonomySection(config),
      active: activeSection(active, config),
      failures: failuresSection(verifications, requirements),
      state: stateSection(requirements),
      rules: rulesSection(),
      memory: memorySection(memoryFacts),
    }

    // COR-002/003 — drop from the bottom of the priority list until it fits.
    const keep: SectionName[] = SECTION_ORDER.filter((name) => built[name].length > 0)
    const dropped: SectionName[] = []
    const head = header(ctx.level ?? 0)

    let text = render(head, keep, built)
    while (estimateTokens(text) > budget && keep.length > 1) {
      const removed = keep.pop()!
      dropped.push(removed)
      text = render(head, keep, built)
    }

    return {
      // COR-006 — nothing leaves this engine unredacted.
      text: redact(text),
      sections: keep,
      dropped,
      estimatedTokens: estimateTokens(text),
    }
  }

  /**
   * The compaction anchor: the subset that must survive a context summarisation.
   * Deliberately smaller and harder-edged than the full prompt.
   */
  async assembleCompactionAnchor(): Promise<string> {
    const { text } = await this.assemble({ budget: 700 })
    return text
  }
}

// ── sections ────────────────────────────────────────────────────────────────

function header(level: 0 | 1 | 2): string {
  return `=== APEX ACTIVE (L${level}) ===`
}

function render(head: string, keep: SectionName[], built: Record<SectionName, string>): string {
  return [head, "", ...keep.map((name) => built[name]).filter(Boolean)].join("\n").trimEnd() + "\n"
}

function protectedSection(config: ApexConfig): string {
  if (!config.doNotTouch.length && !config.doNotRead.length) return ""
  const lines = ["PROTECTED — these operations are blocked. Do not attempt them or route around them:"]
  if (config.doNotTouch.length) lines.push(`  never modify: ${config.doNotTouch.join(", ")}`)
  if (config.doNotRead.length) lines.push(`  never read:   ${config.doNotRead.join(", ")}`)
  return lines.join("\n") + "\n"
}

function autonomySection(config: ApexConfig): string {
  const behaviour: Record<string, string> = {
    MANUAL: "propose every change; execute nothing without an explicit yes",
    GUARDED: "read, write and test freely; ask once before deleting, git operations, or installing dependencies",
    AUTO: "proceed without asking; snapshot before every risky edit",
    FULL_AUTO: "uninterrupted execution; only the hard blocklist stops you",
  }
  return `AUTONOMY: ${config.autonomy} — ${behaviour[config.autonomy] ?? ""}\n`
}

function activeSection(active: Requirement | null, config: ApexConfig): string {
  if (!active) {
    const verify = config.verifyCommands?.suite ?? config.verifyCommands?.unit
    return [
      "NO ACTIVE REQUIREMENT.",
      "  Before implementing anything: record what you are building with apex_req_add,",
      "  including its acceptance criterion and the command that would prove it.",
      verify ? `  This project verifies with: ${verify}` : "",
      "",
    ]
      .filter(Boolean)
      .join("\n")
  }
  return [
    `ACTIVE REQUIREMENT — ${active.id}`,
    `  ${active.text}`,
    `  Acceptance: ${active.acceptance}`,
    `  Prove with: ${active.verifyBy || "(no command recorded — find one before claiming this works)"}`,
    active.dependsOn.length ? `  Depends on: ${active.dependsOn.join(", ")}` : "",
    "",
  ]
    .filter(Boolean)
    .join("\n")
}

/**
 * The anti-loop section. Showing the last failures every turn is what stops the third
 * identical attempt — the model cannot "forget" what it already tried.
 */
function failuresSection(verifications: VerificationRecord[], requirements: Requirement[]): string {
  const failed = verifications.filter((v) => v.result === "FAIL").slice(-3)
  const blocked = requirements.filter((r) => r.status === "BLOCKED")
  if (!failed.length && !blocked.length) return ""

  const lines = ["RECENT FAILURES — do not repeat these:"]
  failed.forEach((v, i) => {
    const summary = firstLine(v.reason || v.actual) || "no detail recorded"
    lines.push(`  ${i + 1}. ${v.reqIds.join(",") || "unscoped"} · \`${v.command}\` → ${summary}`)
  })
  for (const r of blocked) lines.push(`  BLOCKED ${r.id} — ${r.reason}`)
  if (failed.length >= 2) {
    lines.push("  → Two failures means your model of the problem is wrong. A third attempt at the")
    lines.push("    same approach is prohibited. Change strategy, or isolate the failing component.")
  }
  return lines.join("\n") + "\n"
}

function stateSection(requirements: Requirement[]): string {
  if (!requirements.length) return ""
  const counts = requirements.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1
    return acc
  }, {})
  const parts = Object.entries(counts).map(([k, v]) => `${v} ${k.toLowerCase().replace(/_/g, "-")}`)
  return `STATE: ${requirements.length} requirements · ${parts.join(" · ")}\n`
}

function rulesSection(): string {
  return [
    "OPERATING RULES",
    "  Evidence over assertion. Never say it works without running it — give the command",
    "    and its literal output.",
    "  Requirements have IDs and exactly one status. Nothing silently disappears.",
    "  Build what was specified. Do not simplify, substitute, or improve it.",
    "  Two identical failures → change the strategy. Never a third identical attempt.",
    "  Delegated work is unverified work. Read the diff and re-run the checks yourself.",
    "  State lives in files, not in this conversation.",
    '  "Complete" requires the gate to pass. Nothing else earns the word.',
    "",
  ].join("\n")
}

function memorySection(facts: string[]): string {
  if (!facts.length) return ""
  return ["PROJECT MEMORY (relevant to this work)", ...facts.map((f) => `  · ${f}`), ""].join("\n")
}

function firstLine(text: string): string {
  return (text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find(Boolean)
    ?.slice(0, 140) ?? ""
}
