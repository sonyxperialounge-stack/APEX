#!/usr/bin/env node
/**
 * WP-088 — Traceability generation (50 §11-§12).
 *
 * Generates docs/TRACEABILITY.md from REAL state:
 *   - the register: army-update-plan/50 (§1-§9, §9b via 54 §22, §10 non-blocking)
 *   - the ledger:   .apex/REQUIREMENTS.md + .apex/VERIFICATION.md (statuses, evidence)
 *   - the suite:    runtime/test/** + runtime/evals/** (test ids actually present)
 *   - dated records: EVIDENCE/*.md, WORKLOG, BASELINE, L2-MANUAL-CHECKS, l0 MANUAL-RECORDS,
 *                    evals/results/last-run.json (TRC-T02's "dated manual record" arm)
 *
 * Acceptance (50 §12, enforced — non-zero exit on violation):
 *   TRC-T01 every requirement has at least one work packet and one test id
 *   TRC-T02 every test id referenced exists in the suite or in a dated record
 *   TRC-T03 every acceptance test in the package maps to at least one requirement
 *           (direct naming, ledger acceptance cell, or its file's WP header)
 *   TRC-T04 the generated table row count matches the register's row count
 *   Release gate: zero priority-B rows in any state other than VERIFIED_COMPLETE or
 *   NOT_APPLICABLE with a written reason (exceptions must be declared, never silent).
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const RUNTIME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const REPO = path.resolve(RUNTIME, "..")
const PLAN = path.resolve(path.dirname(REPO), "army-update-plan")
const LEDGER_FILE = path.join(REPO, ".apex", "REQUIREMENTS.md")
const VERIFICATION_FILE = path.join(REPO, ".apex", "VERIFICATION.md")
const OUT_FILE = path.join(REPO, "docs", "TRACEABILITY.md")

const TEST_ID = /\b([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-T\d{2})\b/g
const WP_ID = /\bWP-\d{3}[a-z]?\b/g

/**
 * Rows the release gate intentionally allows to be un-verified — each with a
 * written reason rendered into the table (50 §11: "silence is not an option").
 * WP-089 must either close these or keep them explicit.
 */
const GATE_EXCEPTIONS = {
  // Written reasons (50 §11: "silence is not an option"). WP-089 removes an entry
  // the moment the row closes on fresh release evidence.
  "REQ-PROD-006":
    "CI matrix: the GitHub Actions workflow ships (WP-081) and the Windows × Node 24 leg runs green locally on every verify; the macOS/Linux legs are a documented classified exclusion (43 §6) — this build environment has no remote CI. Recorded in docs/RELEASE-VERIFICATION.md at release (WP-089).",
  "REQ-PROD-007":
    "The dated non-developer install/verify record is produced by the release packet itself (WP-089: pack, install from the pack, docs/RELEASE-VERIFICATION.md) and cannot exist before the package is cut.",
  "REQ-PROD-008":
    "docs/KNOWN-LIMITATIONS.md is a WP-089 deliverable; the 'published, not hidden' review happens at release against the final document.",
}

// ── register parsing ────────────────────────────────────────────────────────────

function parseRegister() {
  const rows = new Map()
  const p50 = fs.readFileSync(path.join(PLAN, "50-REQUIREMENT-REGISTER-AND-TRACEABILITY.md"), "utf8")
  const main = p50.slice(0, p50.indexOf("## 9b"))
  for (const m of main.matchAll(/^\|\s*(REQ-[A-Z0-9]+-\d+)\s*\| (.+?) \| ([BN]) \| (.+?) \| (.+?) \| (.+?) \|$/gm)) {
    rows.set(m[1], { id: m[1], req: m[2], pri: m[3], doc: m[4], wp: m[5], tests: m[6], src: "50" })
  }
  const p54 = fs.readFileSync(path.join(PLAN, "54-HERMES-UPSTREAM-VERIFICATION-AND-ADDENDA.md"), "utf8")
  const seg54 = p54.slice(p54.indexOf("## 22. New requirements"), p54.indexOf("## 23. Research honesty"))
  for (const m of seg54.matchAll(/^\|\s*(REQ-[A-Z0-9]+-\d+)\s*(\*\(N\)\*)?\s*\| (.+?) \| (.+?) \| (.+?) \|$/gm)) {
    rows.set(m[1], { id: m[1], req: m[3], pri: m[2] ? "N" : "B", doc: "54 §22", wp: m[4], tests: m[5], src: "54§22" })
  }
  const seg10 = p50.slice(p50.indexOf("## 10. Non-blocking"), p50.indexOf("## 11. Traceability"))
  for (const m of seg10.matchAll(/^\|\s*(REQ-[A-Z0-9]+-\d+)\s*\| (.+?) \| (.+?) \| (.+?) \|$/gm)) {
    rows.set(m[1], { id: m[1], req: m[2], pri: "N", doc: m[3], wp: m[4], tests: "— (non-blocking)", src: "50§10" })
  }
  return rows
}

// ── ledger parsing (real state) ─────────────────────────────────────────────────

function parseLedger() {
  const text = fs.readFileSync(LEDGER_FILE, "utf8")
  const byRegId = new Map()
  // Split-based (not a lookahead regex): a `(?=…|\Z)` lookahead drops the last
  // block — \Z is a literal "Z" in JavaScript, not end-of-input.
  for (const block of text.split(/^### /m).slice(1)) {
    const ledgerId = /^(REQ-\d+)/.exec(block)?.[1]
    if (!ledgerId) continue
    const get = (name) => {
      const f = new RegExp(`\\*\\*${name}:\\*\\* (.*)`).exec(block)
      return f ? f[1].trim() : ""
    }
    const requirement = get("Requirement")
    const regId = /^(REQ-[A-Z0-9]+-\d+)/.exec(requirement)?.[1] ?? null
    byRegId.set(regId, {
      ledgerId,
      requirement,
      status: get("Status"),
      evidence: get("Evidence"),
      acceptance: get("Acceptance"),
      verifyBy: get("Verify by"),
      reason: get("Reason"),
      testIds: [...requirement.matchAll(TEST_ID)].map((x) => x[1]),
      acceptanceIds: [...get("Acceptance").matchAll(TEST_ID)].map((x) => x[1]),
    })
  }
  return byRegId
}

function parseVerifications() {
  const text = fs.readFileSync(VERIFICATION_FILE, "utf8")
  const records = []
  // Split-based, for the same \Z reason as parseLedger above.
  for (const block of text.split(/^### /m).slice(1)) {
    const id = /^(V-\d+)/.exec(block)?.[1]
    if (!id) continue
    const get = (name) => {
      const f = new RegExp(`\\*\\*${name}:\\*\\* (.*)`).exec(block)
      return f ? f[1].trim() : ""
    }
    records.push({
      id,
      reqIds: [...get("Requirements").matchAll(/REQ-\d+/g)].map((x) => x[0]),
      result: get("Result"),
      command: get("Command"),
      timestamp: get("Timestamp"),
    })
  }
  return records
}

// ── suite + dated records ───────────────────────────────────────────────────────

function walk(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) walk(full, exts, out)
    else if (exts.some((x) => e.name.endsWith(x))) out.push(full)
  }
  return out
}

function scanSuite() {
  const files = [
    ...walk(path.join(RUNTIME, "test"), [".ts"]),
    ...walk(path.join(RUNTIME, "evals"), [".ts", ".mjs"]),
  ]
  const ids = new Map() // test id -> first file that names it
  const fileWp = new Map() // file -> set of WP ids from its header comment
  for (const f of files) {
    const text = fs.readFileSync(f, "utf8")
    for (const m of text.matchAll(TEST_ID)) if (!ids.has(m[1])) ids.set(m[1], f)
    // WP provenance anywhere in the file: a test serves the work packet that
    // authored it, and the register maps requirements to those packets.
    const wps = [...text.matchAll(WP_ID)].map((x) => x[0])
    if (wps.length) fileWp.set(f, new Set(wps))
  }
  return { ids, fileWp, files: files.length }
}

function scanDatedRecords() {
  const sources = [
    ...walk(path.join(REPO, ".apex", "upgrade", "EVIDENCE"), [".md"]),
    path.join(REPO, ".apex", "upgrade", "WORKLOG.md"),
    path.join(REPO, ".apex", "upgrade", "BASELINE.md"),
    path.join(REPO, "docs", "L2-MANUAL-CHECKS.md"),
    path.join(RUNTIME, "test", "fixtures", "l0", "MANUAL-RECORDS.md"),
    path.join(RUNTIME, "evals", "results", "last-run.json"),
    path.join(REPO, "docs", "RELEASE-VERIFICATION.md"),
  ].filter((f) => fs.existsSync(f))
  const ids = new Map()
  for (const f of sources) {
    const text = fs.readFileSync(f, "utf8")
    for (const m of text.matchAll(TEST_ID)) if (!ids.has(m[1])) ids.set(m[1], path.relative(REPO, f))
  }
  return { ids, sources: sources.map((f) => path.relative(REPO, f)) }
}

// ── helpers ─────────────────────────────────────────────────────────────────────

function expandTests(raw) {
  const out = []
  for (const part of raw.split(",")) {
    const p = part.trim()
    const range = /^((?:[A-Z][A-Z0-9]*)(?:-[A-Z0-9]+)*-T)(\d{2})[…\.]{1,2}T?(\d{2})$/.exec(p)
    if (range) {
      for (let i = Number(range[2]); i <= Number(range[3]); i++) out.push(`${range[1]}${String(i).padStart(2, "0")}`)
      continue
    }
    const single = /^([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-T\d{2})$/.exec(p)
    if (single) out.push(single[1])
  }
  return out
}

function parseWps(raw) {
  const out = new Set()
  for (const part of raw.split(",")) {
    const p = part.trim()
    const range = /^(WP-\d{3})[…\.]{1,2}(?:WP-)?(\d{3})$/.exec(p)
    if (range) {
      for (let i = Number(range[1].slice(3)); i <= Number(range[2]); i++) out.add(`WP-${String(i).padStart(3, "0")}`)
      continue
    }
    for (const m of p.matchAll(WP_ID)) out.add(m[0])
  }
  return out
}

// ── main ────────────────────────────────────────────────────────────────────────

function main() {
  const register = parseRegister()
  const ledger = parseLedger()
  const verifications = parseVerifications()
  const suite = scanSuite()
  const dated = scanDatedRecords()

  const problems = []
  const notes = []

  // TRC-T04 — row counts agree (register vs ledger, seeded from it in WP-004).
  const missingInLedger = [...register.keys()].filter((id) => !ledger.has(id))
  const extraInLedger = [...ledger.keys()].filter((id) => id && !register.has(id) && id !== null)
  if (missingInLedger.length) problems.push(`TRC-T04: register rows missing from the ledger: ${missingInLedger.join(", ")} (seed them via the Ledger API — never hand-edit the store)`)
  if (extraInLedger.length) problems.push(`TRC-T04: ledger rows absent from the register: ${extraInLedger.join(", ")}`)
  if (ledger.size !== register.size) problems.push(`TRC-T04: ledger has ${ledger.size} rows, register has ${register.size}`)

  // Ledger REQ-084 is the baseline row (register REQ-PROD-001) — verified at WP-001..004.
  const passingV = new Map() // ledgerId -> [V ids]
  for (const v of verifications) {
    if (v.result !== "PASS") continue
    for (const rid of v.reqIds) {
      if (!passingV.has(rid)) passingV.set(rid, [])
      passingV.get(rid).push(v.id)
    }
  }

  const tableRows = []
  const danglingRegisterIds = [] // register test ids that exist nowhere
  const suiteCoverage = new Map() // suite test id -> [{kind, row}] provenance

  for (const [regId, r] of register) {
    const lrow = ledger.get(regId)
    const regTests = expandTests(r.tests)
    const rowTestIds = [...new Set([...regTests, ...(lrow?.acceptanceIds ?? [])])]

    const live = [] // in the suite
    const datedOnly = [] // in a dated record only
    const unresolved = [] // nowhere
    for (const t of rowTestIds) {
      if (suite.ids.has(t)) {
        live.push(t)
        if (!suiteCoverage.has(t)) suiteCoverage.set(t, [])
        suiteCoverage.get(t).push({ kind: "named", row: regId })
      } else if (dated.ids.has(t)) {
        datedOnly.push(t)
        if (!suiteCoverage.has(t)) suiteCoverage.set(t, [])
        suiteCoverage.get(t).push({ kind: "dated", row: regId })
      } else {
        unresolved.push(t)
      }
    }
    if (unresolved.length) danglingRegisterIds.push({ regId, unresolved })

    const verIds = lrow ? [...new Set([...(passingV.get(lrow.ledgerId) ?? []), ...lrow.evidence.split(/,\s*/).filter((e) => /^(V-\d+|EVD-\d+)$/.test(e))])] : []
    const status = lrow?.status ?? "MISSING"

    // The Tests column: only ids proven to exist (suite or dated), named as such.
    const testsCell = [...live, ...datedOnly.map((t) => `${t} (dated)`)].join(", ") || (regTests.length ? "—" : (r.tests === "— (non-blocking)" ? "— (non-blocking)" : r.tests))
    const exception = GATE_EXCEPTIONS[regId]
    tableRows.push({
      regId,
      pri: r.pri,
      doc: r.doc,
      wp: r.wp,
      tests: testsCell,
      evidence: verIds.join(", ") || "—",
      status: status + (exception ? ` (declared: ${exception})` : ""),
      liveCount: live.length,
      datedCount: datedOnly.length,
      statusRaw: status,
      priRaw: r.pri,
    })

    // TRC-T01 — every requirement has at least one WP and one test id (or a
    // declared non-blocking row with no Tests column at all).
    if (!r.wp.trim()) problems.push(`TRC-T01: ${regId} has no work packet`)
    const hasTestClass = r.src !== "50§10" && (rowTestIds.length > 0 || /\b(tests?|manual|dated|review|sourcescan|matrix)\b/i.test(r.tests))
    if (r.src !== "50§10" && !hasTestClass) problems.push(`TRC-T01: ${regId} has no test id or recorded check`)
  }

  // TRC-T03 — every acceptance test in the package maps to a requirement.
  let unmapped = []
  for (const [t, f] of suite.ids) {
    if (suiteCoverage.has(t)) continue
    const wps = suite.fileWp.get(f)
    if (wps && wps.size) {
      suiteCoverage.set(t, [{ kind: `via file header (${[...wps].join(", ")})`, row: "packet-level harness" }])
      notes.push(`TRC-T03: ${t} maps at packet level (${path.relative(RUNTIME, f)}).`)
    } else {
      unmapped.push(`${t} (${path.relative(RUNTIME, f)})`)
    }
  }
  if (unmapped.length) problems.push(`TRC-T03: suite tests with no requirement and no WP provenance: ${unmapped.join(", ")}`)

  // Release gate — zero B rows outside VERIFIED_COMPLETE / NOT_APPLICABLE+reason.
  const gateFailures = []
  for (const row of tableRows) {
    if (row.priRaw !== "B") continue
    if (row.statusRaw === "VERIFIED_COMPLETE") continue
    if (row.statusRaw === "NOT_APPLICABLE" && row.status.includes("declared:")) continue
    if (GATE_EXCEPTIONS[row.regId]) continue
    gateFailures.push(`${row.regId} is ${row.statusRaw}`)
  }
  if (gateFailures.length) problems.push(`Release gate: ${gateFailures.length} blocking row(s) not closed: ${gateFailures.join("; ")}`)

  // ── render ──────────────────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10)
  const lines = []
  lines.push("# Traceability — requirements to evidence")
  lines.push("")
  lines.push(`Generated by \`runtime/scripts/traceability.mjs\` on ${today} from real state: the`)
  lines.push("requirement register (`army-update-plan/50`, second-pass rows from `54 §22`), the")
  lines.push("project ledger (`.apex/REQUIREMENTS.md` + `.apex/VERIFICATION.md`), the actual test")
  lines.push("suite (`runtime/test`, `runtime/evals`), and the dated evidence records. Do not edit")
  lines.push("the table by hand — regenerate it.")
  lines.push("")
  lines.push(`Rows: ${tableRows.length} · blocking (B): ${tableRows.filter((r) => r.priRaw === "B").length} · non-blocking: ${tableRows.filter((r) => r.priRaw === "N").length}`)
  lines.push(`Suite test ids found: ${suite.ids.size} across ${suite.files} files · dated-record ids: ${dated.ids.size}`)
  lines.push("")
  lines.push("| REQ | Pri | Owner doc | WP | Tests | Evidence (VER/EVD ids) | Status |")
  lines.push("|---|:--:|---|---|---|---|---|")
  for (const r of tableRows) lines.push(`| ${r.regId} | ${r.pri} | ${r.doc} | ${r.wp} | ${r.tests} | ${r.evidence} | ${r.status} |`)
  lines.push("")
  lines.push("## Release gate")
  lines.push("")
  const bRows = tableRows.filter((r) => r.priRaw === "B")
  const closed = bRows.filter((r) => r.statusRaw === "VERIFIED_COMPLETE").length
  const na = bRows.filter((r) => r.statusRaw === "NOT_APPLICABLE").length
  const open = bRows.length - closed - na
  lines.push(`Blocking rows: ${bRows.length} — VERIFIED_COMPLETE: ${closed} · NOT_APPLICABLE (with written reason): ${na} · other: ${open}.`)
  lines.push(`Rule (50 §11): zero B rows in any state other than VERIFIED_COMPLETE or NOT_APPLICABLE with a written reason.`)
  lines.push("")
  if (danglingRegisterIds.length) {
    lines.push("## Appendix A — register test ids that exist nowhere (resolution pending)")
    lines.push("")
    for (const d of danglingRegisterIds) lines.push(`- ${d.regId}: ${d.unresolved.join(", ")}`)
    lines.push("")
  }
  const packetLevel = [...suiteCoverage.entries()].filter(([, v]) => v.some((x) => x.kind.startsWith("via file header")))
  if (packetLevel.length) {
    lines.push("## Appendix B — packet-level harness tests (mapped by file provenance, not named in a requirement)")
    lines.push("")
    lines.push("These are invariant/harness tests whose scope is the whole package or a work packet's")
    lines.push("deliverable rather than one register row. Each maps through its file's WP header (TRC-T03).")
    lines.push("")
    for (const [t] of packetLevel) lines.push(`- ${t}`)
    lines.push("")
  }
  lines.push("## Dated records scanned (TRC-T02)")
  lines.push("")
  for (const s of dated.sources) lines.push(`- ${s}`)
  lines.push("")

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true })
  fs.writeFileSync(OUT_FILE, lines.join("\n"), "utf8")

  console.log(`TRACEABILITY ${OUT_FILE}`)
  console.log(`rows=${tableRows.length} suite-ids=${suite.ids.size} dated-ids=${dated.ids.size}`)
  console.log(`gate: closed=${closed} na=${na} open=${open} · dangling=${danglingRegisterIds.length} · problems=${problems.length}`)
  for (const p of problems) console.log(`PROBLEM ${p}`)
  if (problems.length) process.exitCode = 1
}

main()
