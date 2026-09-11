# EVD-085b — WP-085b: runtime/evals behavioural suite

## Packet
WP-085b — a behavioural eval suite, separate from unit tests (54 §16). Dep: WP-085.
Files: `+runtime/evals/**` (7 scenarios, runner, README), `~package.json` (`evals` script),
`~test/cli/packaging.test.ts` (EVAL-T02 assertion).

## What was built
`runtime/evals/` — each scenario declares its inputs, simulated host constraints and
deterministic assertions in its header, drives the REAL engines end-to-end in a tempdir,
and prints one `EVAL <name> PASS — …` line. `npm run evals` runs all seven in separate
processes, prints the matrix, and records the run to `evals/results/last-run.json`
(date, node, platform, `model: none — deterministic engine simulation`; 54 §16 honesty
rule: no live-model claim is made).

| Scenario | Deterministic assertion highlights |
|---|---|
| budget-pressure | Tight budget evicts skills+globalMemory from the bottom; protected/autonomy/active/state survive; the requirement TEXT survives; drops are named; estimateTokens = ⌈chars/4⌉ |
| capability-degradation | Structural failure marks DEGRADED; `select` refuses (no pretend call); only re-registration lifts it; the "UNAVAILABLE, effect, fallback" re-plan script ships |
| delegation-scope | CHILD_ALWAYS_BLOCKED (user.ask/message/schedule/cron/memory.write.global/deploy) refuses; SCOPED_WRITE with no allowedPaths is misscoped; scoped contract passes; WORKER cannot nest |
| l0-conformance | Boot sequence ordered 1..7; every repository file START-HERE names ships; degraded-mode hatch; readiness contract bounded and honest; no wizard |
| memory-lifecycle | learn → explicit correct supersedes transactionally (11 §7 chain) → retrieval returns the corrected text, never the stale one; the original is retained, marked superseded |
| resume-across-models | Session B reads exactly what A wrote (REQ-001, proof command verbatim); no model-identity field exists in any ledger JSON — any model may resume |
| skill-promotion | Unevidenced candidate refused (insufficient-evidence) and ships NOTHING; lint fails before evidence matters; verified candidate promotes ACTIVE with `verified: true` sidecar |

## EVAL-T01 / EVAL-T02
- **EVAL-T01**: every eval has deterministic assertions; `evals/results/last-run.json` records
  the run (7/7 pass, recorded 2026-09-11). Evals run via `npm run evals`, separate from
  `npm test`, and are not a release gate on their own (54 §16).
- **EVAL-T02**: PKG-T03 now asserts the tarball contains no `evals/` tree — the eval suite is
  a repository harness, never shipped (`files` never listed it; now it is locked by test).

## Mutation check (protocol §6 JUDGE)
Disabled `Cortex.assemble`'s eviction loop (`while … && false`) → **budget-pressure eval
fails**: `the budget is hard: 1310 > 600`. Restored byte-identical; evals back to 7/7.

## Verify (fresh, this packet)
Full `npm run verify` → **1426 pass / 0 fail** (unchanged — evals are deliberately outside
the unit suite). `npm run evals` → **7/7 pass, 0 fail**, matrix recorded. Windows local,
Node 22.x.

## Harness notes
- `AssembleContext.skills` is `skillIndex` (metadata only, 18 §5) — bodies never travel in
  the prompt; the eval asserts on the index, not a body.
- A fresh requirement is NOT_STARTED: the "active" section renders "NO ACTIVE REQUIREMENT"
  until `setStatus(id, "IN_PROGRESS")` — the eval moves it so the text actually renders.
- `generateHandoff` reports totals and points at REQUIREMENTS.md (LED-012: generated FROM
  STATE, never from a model's summary) — the eval asserts the pointer, not a fabricated summary.
