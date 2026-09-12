/**
 * The eval runner (54 §16, WP-085b).
 *
 * EVAL-T01 — this suite runs every `evals/<name>/eval.ts` scenario in its own
 * process, prints the result matrix, and records a run to
 * `evals/results/last-run.json`. Evals are NOT a
 * release gate on their own and are NOT part of `npm test`; they run separately
 * via `npm run evals`. Honesty rule (33 §6): a result proves the deterministic
 * engine behaviour of THIS run — never universal model compliance.
 */

import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const EVALS_DIR = path.dirname(fileURLToPath(import.meta.url))
const RESULTS_DIR = path.join(EVALS_DIR, "results")

const scenarios = fs
  .readdirSync(EVALS_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory() && !["results", "node_modules"].includes(e.name))
  .map((e) => e.name)
  .sort()

if (process.argv.includes("--list")) {
  console.log(scenarios.join("\n"))
  process.exit(0)
}

const results = []
let failures = 0

for (const name of scenarios) {
  const file = path.join(EVALS_DIR, name, "eval.ts")
  const t0 = performance.now()
  const run = spawnSync(process.execPath, ["--experimental-strip-types", file], {
    encoding: "utf8",
    timeout: 120_000,
  })
  const durationMs = Math.round(performance.now() - t0)
  const passed = run.status === 0
  if (!passed) failures += 1
  const detail = passed
    ? (run.stdout ?? "").trim().split("\n").filter((l) => l.startsWith("EVAL ")).at(-1) ?? "ok"
    : `${run.stderr ?? ""}${run.stdout ?? ""}`.trim().split("\n").slice(-6).join(" | ")
  results.push({ scenario: name, status: passed ? "PASS" : "FAIL", durationMs, detail })
  console.log(`${passed ? "✔" : "✖"} ${name.padEnd(24)} ${passed ? "PASS" : "FAIL"}  ${durationMs}ms`)
  if (!passed) console.log(`    ${detail}`)
}

const record = {
  recordedAt: new Date().toISOString(),
  node: process.version,
  platform: `${process.platform}-${process.arch}`,
  model: "none — deterministic engine simulation (54 §16); no live-model claim is made",
  scenarios: results.length,
  failures,
  results,
}

fs.mkdirSync(RESULTS_DIR, { recursive: true })
fs.writeFileSync(path.join(RESULTS_DIR, "last-run.json"), JSON.stringify(record, null, 2) + "\n")

console.log(`\nevals: ${results.length - failures}/${results.length} pass, ${failures} fail — recorded to evals/results/last-run.json`)
process.exit(failures > 0 ? 1 : 0)
