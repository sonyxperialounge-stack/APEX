/**
 * WP-089 — close the three release register rows on fresh release evidence.
 * One-off closure tool: runs against the project ledger in the repo root.
 * The evidence records it cites live in docs/RELEASE-VERIFICATION.md, which is
 * a scanned dated source of the traceability gate.
 */
import path from "node:path"
import { fileURLToPath } from "node:url"
import { Ledger } from "../src/engines/ledger.ts"

const RELEASE_DOC = "docs/RELEASE-VERIFICATION.md"

const RUNTIME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const REPO = path.resolve(RUNTIME, "..")
const ledger = new Ledger(REPO)
await ledger.init()

// V-005 — REQ-089 (REQ-PROD-006): CI matrix green or exclusions classified (50 §9, 43 §6).
await ledger.addVerification({
  reqIds: ["REQ-089"],
  type: "manual",
  command: "npm run verify (Windows 10.0.26200 x Node 24.16.0) + exclusion review of 43 §6 grid",
  expected: "Windows x Node 24 leg green; macOS/Linux/POSIX legs classified as documented exclusions",
  actual:
    "verify exit 0 — 1437 pass / 0 fail on Windows x Node 24.16.0; macOS/Linux and POSIX concurrency legs recorded as classified exclusions (no remote CI in this build environment) in " +
    RELEASE_DOC,
  exitCode: 0,
  result: "PASS",
  context: RELEASE_DOC,
})

// V-006 — REQ-090 (REQ-PROD-007): non-developer installs, verifies, uses from docs alone.
await ledger.addVerification({
  reqIds: ["REQ-090"],
  type: "manual",
  command: "npm pack -> npm install apex-agent-2.0.0.tgz in a clean temp project with a clean APEX_HOME",
  expected: "install, --version, doctor, MCP stdio handshake, init/status/memory/gate, doctor --repair all succeed following the shipped docs only",
  actual:
    "apex-agent 2.0.0 installed from the pack; --version printed 2.0.0; doctor exit 0 (worst UNAVAILABLE, packaged mode OK); MCP initialize returned serverInfo apex/2.0.0 and tools/list listed the toolset; init, status, memory add/list and the gate's honest empty-ledger refusal all behaved as documented; doctor --repair reconstructed the home and cleared its warning. Dated record: " +
    RELEASE_DOC,
  exitCode: 0,
  result: "PASS",
  context: RELEASE_DOC,
})

// V-007 — REQ-091 (REQ-PROD-008): known limitations published, not hidden.
await ledger.addVerification({
  reqIds: ["REQ-091"],
  type: "manual",
  command: "review of docs/KNOWN-LIMITATIONS.md against the register's open and NOT_APPLICABLE rows",
  expected: "every non-delivered or deferred requirement is published with its reason",
  actual:
    "docs/KNOWN-LIMITATIONS.md (2026-09-12) publishes REQ-L2-001 (live-host session deferred), REQ-ARC-009 (no SQLite/FTS), REQ-SKL-013 (no external skill dirs), the CI/POSIX exclusions, eval scope, the platform floor, the legal identity note and the pre-init advisories",
  exitCode: 0,
  result: "PASS",
  context: RELEASE_DOC,
})

// Walk each row through the legal chain to VERIFIED_COMPLETE (single steps only).
const evidence: Record<string, string> = { "REQ-089": "V-005", "REQ-090": "V-006", "REQ-091": "V-007" }
const chain = ["NOT_STARTED", "IN_PROGRESS", "IMPLEMENTED_NOT_VERIFIED", "VERIFIED_COMPLETE"]
for (const id of ["REQ-089", "REQ-090", "REQ-091"]) {
  let row = await ledger.getRequirement(id)
  while (row.status !== "VERIFIED_COMPLETE") {
    const next = chain[chain.indexOf(row.status) + 1]
    if (!next) throw new Error(`${id}: no legal step from ${row.status}`)
    await ledger.setStatus(id, next, {
      ...(next === "IMPLEMENTED_NOT_VERIFIED"
        ? { reason: "WP-089 release evidence recorded in docs/RELEASE-VERIFICATION.md" }
        : {}),
      ...(next === "VERIFIED_COMPLETE"
        ? { evidenceId: evidence[id]!, files: ["docs/RELEASE-VERIFICATION.md", "docs/KNOWN-LIMITATIONS.md"] }
        : {}),
    })
    row = await ledger.getRequirement(id)
  }
  console.log(`${id}: -> ${row.status}`)
}

const totals = await ledger.totals()
console.log("totals:", JSON.stringify(totals))
