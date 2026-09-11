# Evals — behavioural scenarios (54 §16, WP-085b)

Behaviour evals are separate from the unit suite on purpose. Unit tests prove the
engines; evals walk the *scenarios* a real session would walk — across simulated
sessions, mid-task failures, budget pressure — and assert the outcomes deterministically.

## Run

```bash
npm run evals
```

Every scenario runs in its own process; the matrix prints and a run record is
written to `results/last-run.json` (date, node, platform, per-scenario status).

## What a result does — and does not — prove

A PASS proves that, in THIS run, on THIS node, the runtime engines produced the
required outcome for the scenario's inputs. It does **not** prove that any given
model complies with the doctrine in a live conversation (33 §6's honesty rule).
Where a scenario could involve a live model, the eval header says so explicitly,
and the recorded matrix carries `model: none — deterministic engine simulation`.

The live-model half of L0 conformance is tracked in
`test/fixtures/l0/MANUAL-RECORDS.md` — a scenario is only "conformed" when its
deterministic check passes AND a dated live transcript is recorded.

## Scenarios

| Directory | Behaviour under test |
|---|---|
| `l0-conformance/` | A fresh model receives only START-HERE: ordered boot, referenced files ship, degraded-mode hatch, no wizard |
| `memory-lifecycle/` | learn → correct → supersede chain → corrected retrieval across simulated sessions |
| `resume-across-models/` | session A writes the ledger; session B resumes from disk alone; no model-identity field exists |
| `capability-degradation/` | tool fails mid-task: DEGRADED recorded, `select` refuses, only re-discovery lifts it, re-plan script present |
| `delegation-scope/` | child cannot interact/schedule/write-global; misscoped writer refused; depth bound holds |
| `skill-promotion/` | failed work promotes nothing; lint blocks first; verified work promotes ACTIVE with an honest sidecar |
| `budget-pressure/` | tight budget evicts skills/memory first from the bottom; protected/autonomy/active survive; drops are named |

## Adding a scenario

Create `evals/<name>/eval.ts`: declare inputs, simulated host constraints and the
deterministic assertions in the header comment; print one `EVAL <name> PASS — …`
line on success; exit non-zero on failure. The runner picks it up automatically.
