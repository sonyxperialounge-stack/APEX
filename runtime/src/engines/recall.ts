/*
 * APEX — ARMY V3 — Copyright (c) 2026 Lalit. All rights reserved.
 * Licensed under the APEX Personal Use License 1.0 (see the LICENSE file).
 * Not open source: personal, non-commercial use of unmodified copies only.
 * Modification, resale, commercial use, and renaming are prohibited.
 * Removing this notice or the LICENSE grants no rights whatsoever.
 */

/**
 * RECALL — project memory (REC-001..007).
 *
 * The only part of APEX that gets BETTER over time rather than merely staying disciplined.
 *
 * The rule for what belongs here: facts that were expensive to learn and are not obvious
 * from the code. Not what the code already says, not what git history records, and never
 * a secret.
 */

import path from "node:path"
import type { Ledger } from "./ledger.ts"
import { readTextOrNull, writeText, existsSync } from "../core/json.ts"
import { containsSecret, redact } from "../core/redact.ts"
import { event } from "../core/log.ts"

export const MEMORY_SECTIONS = [
  "Environment",
  "Commands",
  "Architecture",
  "Traps",
  "Failed approaches",
  "User preferences",
] as const

export type MemorySection = (typeof MEMORY_SECTIONS)[number]

export interface MemoryFact {
  section: MemorySection
  text: string
  /** Paths or commands the fact refers to — used for relevance and staleness. */
  refs: string[]
  date: string
}

export interface StaleEntry {
  fact: MemoryFact
  reason: string
}

const MAX_FACTS = 150

export class Recall {
  private root: string
  private ledger: Ledger

  constructor(root: string, ledger: Ledger) {
    this.root = root
    this.ledger = ledger
  }

  private file(): string {
    return this.ledger.file("MEMORY.md")
  }

  // ── REC-001 — read / write ────────────────────────────────────────────────

  async read(): Promise<MemoryFact[]> {
    const text = (await readTextOrNull(this.file())) ?? ""
    const facts: MemoryFact[] = []
    let section: MemorySection | null = null

    for (const line of text.split(/\r?\n/)) {
      const heading = /^##\s+(.+?)\s*$/.exec(line)
      if (heading) {
        const name = heading[1]!.trim()
        section = (MEMORY_SECTIONS as readonly string[]).includes(name) ? (name as MemorySection) : null
        continue
      }
      const item = /^[-*]\s+(.+)$/.exec(line)
      if (!item || !section) continue
      const body = item[1]!.trim()
      if (!body) continue
      const dated = /\((\d{4}-\d{2}-\d{2})[^)]*\)/.exec(body)
      facts.push({
        section,
        text: body,
        refs: extractRefs(body),
        date: dated?.[1] ?? "",
      })
    }
    return facts
  }

  /**
   * REC-005 — a fact that carries a secret is refused outright rather than redacted
   * into something misleading. Memory must be trustworthy to be useful.
   */
  async capture(section: MemorySection, text: string): Promise<{ written: boolean; reason: string }> {
    const clean = text.trim().replace(/\s+/g, " ")
    if (!clean) return { written: false, reason: "empty" }
    if (containsSecret(clean)) {
      return { written: false, reason: "refused: the fact contains something that looks like a credential" }
    }

    const existing = await this.read()
    // Dedupe on normalised text so the same lesson is not recorded twice.
    const key = normalise(clean)
    if (existing.some((f) => normalise(f.text) === key)) {
      return { written: false, reason: "already recorded" }
    }

    const current = (await readTextOrNull(this.file())) ?? "# Project Memory\n"
    const heading = `## ${section}`
    const line = `- ${redact(clean)}`
    const next = current.includes(heading)
      ? current.replace(heading, `${heading}\n${line}`)
      : `${current.trimEnd()}\n\n${heading}\n${line}\n`

    await writeText(this.file(), next)
    event("recall.capture", { section })
    return { written: true, reason: "" }
  }

  // ── REC-002 — automatic capture from real events ──────────────────────────

  /**
   * Derive facts from things that actually happened, not from the model remembering to
   * write them down. This is what makes memory compound.
   */
  async captureFromEvent(ev: {
    kind: "command_succeeded" | "tool_missing" | "third_failure" | "user_correction" | "coupled_files"
    command?: string
    tool?: string
    approach?: string
    reason?: string
    reqId?: string
    correction?: string
    files?: string[]
  }): Promise<{ written: boolean; reason: string }> {
    const today = new Date().toISOString().slice(0, 10)
    switch (ev.kind) {
      case "command_succeeded":
        // It worked, so it is true — no model judgment involved.
        return this.capture("Commands", `${ev.command} — verified working`)
      case "tool_missing":
        return this.capture("Environment", `${ev.tool} is not available in this environment`)
      case "third_failure":
        return this.capture(
          "Failed approaches",
          `${ev.approach} (${today}${ev.reqId ? `, ${ev.reqId}` : ""}): ${ev.reason ?? "failed three times"}`,
        )
      case "user_correction":
        return this.capture("User preferences", ev.correction ?? "")
      case "coupled_files":
        return this.capture("Architecture", `${(ev.files ?? []).join(" and ")} must be changed together`)
      default:
        return { written: false, reason: "unknown event kind" }
    }
  }

  // ── REC-003 — relevance ───────────────────────────────────────────────────

  /**
   * Deliberately simple: filename overlap, symbol overlap, and section weight. No
   * embeddings — that is a dependency and a complexity cost for a corpus of ~100 short
   * lines. Revisit only if the corpus outgrows it.
   */
  async relevant(files: string[] = [], limit = 5): Promise<string[]> {
    const facts = await this.read()
    if (!facts.length) return []

    // Generic directory names are not identity. Scoring on "src" would make every fact
    // about any file look relevant to every other file.
    const GENERIC = new Set(["src", "lib", "app", "test", "tests", "pkg", "internal", "cmd", "core", "main"])
    const tokens = new Set(
      files
        .flatMap((f) => [
          path.basename(f),
          path.basename(f).replace(/\.[^.]+$/, ""),
          ...f.split(/[/\\]/).filter(Boolean),
        ])
        .filter((t) => t.length > 2 && !GENERIC.has(t.toLowerCase())),
    )

    const scored = facts.map((fact) => {
      let score = 0
      // Environment, Commands and Failed approaches are useful even without a file match.
      if (fact.section === "Environment" || fact.section === "Commands") score += 3
      if (fact.section === "Failed approaches") score += 4
      if (fact.section === "Traps") score += 2
      for (const ref of fact.refs) {
        for (const token of tokens) {
          if (ref.includes(token)) score += 5
        }
      }
      for (const token of tokens) {
        if (token.length > 3 && fact.text.includes(token)) score += 2
      }
      return { fact, score }
    })

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => `[${s.fact.section}] ${s.fact.text}`)
  }

  // ── REC-004 — staleness ───────────────────────────────────────────────────

  /** Stale memory is worse than none, because it is believed. */
  async detectStale(): Promise<StaleEntry[]> {
    const facts = await this.read()
    const stale: StaleEntry[] = []
    for (const fact of facts) {
      for (const ref of fact.refs) {
        // Only project-relative paths can be checked. A bare filename could live
        // anywhere, and guessing it sits at the root would produce false staleness —
        // which is worse than not checking, because a wrong flag discredits the file.
        if (!looksLikePath(ref)) continue
        if (existsSync(path.resolve(this.root, ref))) continue
        // A bare filename that is mentioned by a longer, existing path is not stale.
        if (fact.refs.some((other) => other !== ref && other.endsWith(ref) && existsSync(path.resolve(this.root, other)))) {
          continue
        }
        stale.push({ fact, reason: `references ${ref}, which no longer exists` })
        break
      }
    }
    return stale
  }

  // ── REC-006 — mirror to the host's native memory file ─────────────────────

  /**
   * Mirrors stable facts into AGENTS.md / CLAUDE.md so they load for free every session.
   * The user's own content is preserved: only the APEX block between markers is replaced.
   */
  async mirrorToHost(target = "AGENTS.md"): Promise<{ written: boolean; preservedBytes: number }> {
    const facts = await this.read()
    const stable = facts.filter((f) => f.section !== "User preferences")
    if (!stable.length) return { written: false, preservedBytes: 0 }

    const START = "<!-- APEX:MEMORY:START -->"
    const END = "<!-- APEX:MEMORY:END -->"
    const block = [
      START,
      "## Project notes (maintained by APEX — edit .apex/MEMORY.md instead)",
      ...MEMORY_SECTIONS.filter((s) => s !== "User preferences")
        .map((section) => {
          const items = stable.filter((f) => f.section === section)
          return items.length ? [`### ${section}`, ...items.map((f) => `- ${f.text}`), ""].join("\n") : ""
        })
        .filter(Boolean),
      END,
    ].join("\n")

    const file = path.join(this.root, target)
    const current = (await readTextOrNull(file)) ?? ""
    const preservedBytes = current.replace(new RegExp(`${START}[\\s\\S]*?${END}`), "").length

    const next = current.includes(START)
      ? current.replace(new RegExp(`${START}[\\s\\S]*?${END}`), block)
      : `${current.trimEnd()}\n\n${block}\n`.trimStart()

    await writeText(file, next)
    return { written: true, preservedBytes }
  }

  // ── REC-007 — size discipline ─────────────────────────────────────────────

  async audit(): Promise<{ count: number; overCap: boolean; suggestion: string; stale: StaleEntry[] }> {
    const facts = await this.read()
    const stale = await this.detectStale()
    return {
      count: facts.length,
      overCap: facts.length > MAX_FACTS,
      suggestion:
        facts.length > MAX_FACTS
          ? `Memory holds ${facts.length} facts (cap ${MAX_FACTS}). Remove what is no longer true, ` +
            `merge duplicates, and delete what has become obvious. Never truncate silently, and ` +
            `keep "Failed approaches" — those do not expire.`
          : "",
      stale,
    }
  }
}

// ── helpers ─────────────────────────────────────────────────────────────────

function normalise(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

/** Backtick-quoted spans, path-like tokens, and command names. */
export function extractRefs(text: string): string[] {
  const refs = new Set<string>()
  for (const m of text.matchAll(/`([^`]+)`/g)) refs.add(m[1]!.trim())
  for (const m of text.matchAll(/\b([\w.-]+\/[\w./-]+)\b/g)) refs.add(m[1]!)
  for (const m of text.matchAll(/\b([\w-]+\.(?:py|ts|tsx|js|jsx|go|rs|json|toml|yaml|yml|md))\b/g)) refs.add(m[1]!)
  return [...refs]
}

function looksLikePath(ref: string): boolean {
  return /[/\\]/.test(ref) || /\.\w{1,5}$/.test(ref)
}
