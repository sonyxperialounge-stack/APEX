/**
 * Documentation ↔ build agreement (WP-075, 53 §8 UX-T03).
 *
 * "Every documented command exists; every internal link resolves" was checked by hand
 * before this file, which is to say it drifted. README described commands the build did
 * not have, and the build grew commands no document mentioned, both without anyone
 * noticing. The docs are parsed here against the REAL surface — the COMMAND_HELP table
 * and the group dispatchers in src/cli/ — so the two can only move together.
 */

import { test, describe } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { CURRENT_SCHEMA, STORE_NAMES } from "../../src/core/schema.ts"

const RUNTIME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..")
const PROJECT = path.resolve(RUNTIME, "..")

/** The documentation surface a reader can be expected to follow. */
const DOC_FILES = [
  "README.md",
  "EXAMPLES.md",
  "START-HERE.md",
  "CHANGELOG.md",
  "install/ATTACH.md",
  "docs/SCHEMA-CHANGELOG.md",
  "runtime/README.md",
] as const

const DOCS = DOC_FILES.map((rel) => {
  const file = path.join(PROJECT, ...rel.split("/"))
  assert.ok(fs.existsSync(file), `documentation file missing: ${rel}`)
  return { rel, text: fs.readFileSync(file, "utf8") }
})

/** Top-level commands = the per-command help table in the CLI entry point. */
const TOP = [...fs.readFileSync(path.join(RUNTIME, "src", "cli", "index.ts"), "utf8").matchAll(/^ {2}([a-z]+): `$/gm)].map((m) => m[1]!) as string[]

/** A group's subcommands = its dispatch cases in its own module (aliases included).
 *  Two dispatch styles exist: `case "x":` labels and `sub === "x"` chains. */
function groupSubs(group: string): string[] {
  const src = fs.readFileSync(path.join(RUNTIME, "src", "cli", `${group}-cli.ts`), "utf8")
  const cases = [
    ...src.matchAll(/\bcase "([a-z][a-z0-9-]*)":/g),
    ...src.matchAll(/\bsub === "([a-z][a-z0-9-]*)"/g),
  ].map((m) => m[1]!)
  return [...new Set(cases.filter((c) => c !== "help" && c !== "--help" && c !== "-h"))]
}

const GROUPS = TOP.filter((c) => fs.existsSync(path.join(RUNTIME, "src", "cli", `${c}-cli.ts`)))

/** Alternate spellings of a documented subcommand; they exist and need no own mention. */
const ALIASES = new Set(["inspect", "view", "disable"])

describe("docs — every documented command exists in the build", () => {
  test("the parsed build surface is the expected shape", () => {
    assert.ok(TOP.length >= 12, `expected the full top-level surface, got: ${TOP.join(", ")}`)
    for (const required of ["attach", "detach", "doctor", "memory", "skills", "session", "archive", "home", "init", "status", "gate", "mcp"]) {
      assert.ok(TOP.includes(required), `top-level ${required} missing from COMMAND_HELP parse`)
    }
    assert.deepEqual(GROUPS.sort(), ["archive", "home", "memory", "session", "skills"])
    assert.ok(groupSubs("memory").includes("retract"), "memory dispatch parse works")
  })

  test("every apex-agent invocation in the docs names a real command and subcommand", () => {
    // Single-space separators only: a wrapped line or an aligned comment column is
    // prose, not an invocation, and must not be parsed as one.
    const offenders: string[] = []
    for (const { rel, text } of DOCS) {
      for (const m of text.matchAll(/apex-agent(?:@[\w.-]+)? ([a-z][a-z0-9-]*)(?: ([a-z][a-z0-9-]*))?/gi)) {
        const cmd = m[1]!.toLowerCase()
        if (!TOP.includes(cmd) && cmd !== "version") {
          offenders.push(`${rel}: "apex-agent ${cmd}" — no such command`)
          continue
        }
        const sub = m[2]?.toLowerCase()
        if (sub && GROUPS.includes(cmd) && !groupSubs(cmd).includes(sub)) {
          offenders.push(`${rel}: "apex-agent ${cmd} ${sub}" — no such subcommand (have: ${groupSubs(cmd).join(", ")})`)
        }
      }
    }
    assert.deepEqual(offenders, [], `documented commands that do not exist:\n  ${offenders.join("\n  ")}`)
  })
})

describe("docs — no shipped command is undocumented (UX-T03)", () => {
  test("every top-level command is documented as an invocation somewhere", () => {
    const missing: string[] = []
    for (const cmd of TOP) {
      const re = new RegExp(`apex-agent(?:@[\\w.-]+)?\\s+${cmd}\\b`, "i")
      if (!DOCS.some(({ text }) => re.test(text))) missing.push(cmd)
    }
    if (!DOCS.some(({ text }) => /apex-agent --version/.test(text))) missing.push("version")
    assert.deepEqual(missing, [], `shipped commands documented nowhere: ${missing.join(", ")}`)
  })

  test("every subcommand of a group appears in that group's documentation", () => {
    // A group's documentation = fenced blocks and single lines that invoke it. Subs are
    // matched as words there, so a doc that lists a group's vocabulary counts for the
    // whole group; a doc that names the group but hides what it can do does not.
    const missing: string[] = []
    for (const group of GROUPS) {
      const re = new RegExp(`apex-agent(?:@[\\w.-]+)?\\s+${group}\\b`, "i")
      let docText = ""
      for (const { text } of DOCS) {
        const blocks = text.split("```")
        for (let i = 1; i < blocks.length; i += 2) if (re.test(blocks[i]!)) docText += blocks[i] + "\n"
        for (const line of text.split(/\r?\n/)) if (re.test(line)) docText += line + "\n"
      }
      for (const sub of groupSubs(group)) {
        if (ALIASES.has(sub)) continue
        if (!new RegExp(`\\b${sub}\\b`).test(docText)) missing.push(`${group} ${sub}`)
      }
    }
    assert.deepEqual(missing, [], `shipped subcommands documented nowhere: ${missing.join(", ")}`)
  })
})

describe("docs — every internal markdown link resolves", () => {
  test("relative link targets exist on disk", () => {
    const broken: string[] = []
    for (const { rel, text } of DOCS) {
      const dir = path.dirname(path.join(PROJECT, ...rel.split("/")))
      for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) {
        const raw = m[1]!
        if (/^(https?:|mailto:|#)/.test(raw)) continue
        const target = path.resolve(dir, raw.split("#")[0]!)
        if (!fs.existsSync(target)) broken.push(`${rel} -> ${raw}`)
      }
    }
    assert.deepEqual(broken, [], `broken internal links:\n  ${broken.join("\n  ")}`)
  })
})

describe("docs — schema changelog agrees with the schema registry", () => {
  test("the config writer version and every store are named with their real versions", () => {
    const sc = DOCS.find(({ rel }) => rel === "docs/SCHEMA-CHANGELOG.md")
    assert.ok(sc, "docs/SCHEMA-CHANGELOG.md is part of the documentation surface")
    const row = /\|\s*`config`\s*\|\s*\*\*(\d+)\*\*/.exec(sc.text)
    assert.ok(row, "SCHEMA-CHANGELOG has a config row with its writer version")
    assert.equal(Number(row[1]), CURRENT_SCHEMA.config, "SCHEMA-CHANGELOG config version drifted from core/schema.ts")
    for (const store of STORE_NAMES) {
      assert.ok(sc.text.includes(`\`${store}\``), `SCHEMA-CHANGELOG does not name store "${store}"`)
    }
  })
})

describe("docs — 43 §8 approved terminology in the documentation", () => {
  const FORBIDDEN: Array<[term: string, why: string]> = [
    ["playbook", "say skill (reusable procedure)"],
    ["long-term memory", "say global memory (durable personal store)"],
    ["\\bLTM\\b", "say global memory"],
    ["scratch memory", "say session overlay (immediate correction)"],
    ["temp memory", "say session overlay"],
    ["history DB", "say session archive"],
    ["transcript store", "say session archive"],
    ["permission level", "say autonomy mode"],
  ]

  for (const [term, why] of FORBIDDEN) {
    test(`docs never say "${term.replace(/\\b/g, "")}" (${why})`, () => {
      const re = new RegExp(term, "i")
      const bad = DOCS.filter(({ text }) => re.test(text)).map(({ rel }) => rel)
      assert.deepEqual(bad, [], `"${term}" in: ${bad.join(", ")} — ${why}`)
    })
  }
})
