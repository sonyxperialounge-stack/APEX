/**
 * V-009 — record the green CI matrix as fresh evidence for REQ-089 (REQ-PROD-006).
 * One-off record tool: runs against the project ledger in the repo root.
 * Cites docs/RELEASE-VERIFICATION.md §3 (a scanned dated source of the
 * traceability gate) and the GitHub Actions run that proved the full grid.
 */
import path from "node:path"
import { fileURLToPath } from "node:url"
import { Ledger } from "../src/engines/ledger.ts"

const RELEASE_DOC = "docs/RELEASE-VERIFICATION.md"
const CI_RUN = "https://github.com/sonyxperialounge-stack/APEX/actions/runs/34677168477"

const RUNTIME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const REPO = path.resolve(RUNTIME, "..")
const ledger = new Ledger(REPO)
await ledger.init()

await ledger.addVerification({
  reqIds: ["REQ-089"],
  type: "runtime",
  command:
    "GitHub Actions workflow verify (ref upgrade/army-v4, commit 34988d3): source verify on {windows, ubuntu, macos} x {node 22.6.0, 22, 24} + packed artifact smoke on {ubuntu, windows}",
  expected: "all matrix jobs green: 1438 tests per source leg, zero failures; packed tarball installs and smokes clean",
  actual:
    "run 34677168477 — 11/11 jobs success (9 source verify legs + 2 packed artifact legs); all 1438 tests green on every OS x Node leg; POSIX concurrency scenarios A-G exercised on ubuntu and macos; dated record: " +
    RELEASE_DOC +
    " §3; run URL: " +
    CI_RUN,
  exitCode: 0,
  result: "PASS",
  context: "remote",
})

console.log("V-009 recorded")
const totals = await ledger.totals()
console.log("totals:", JSON.stringify(totals))
