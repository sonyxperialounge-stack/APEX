# HANDOFF

Where the build stopped, and the single next action. Read after `EXECUTE.md`,
`.apex/upgrade/STATE.json`, and the last two WORKLOG entries (`52 §7`).

## State

- Branch `upgrade/army-v4`, one commit ahead of baseline `7c217ec`.
- Phase 0 complete: **phase0: PASSED** (see STATE.json). WP-001..WP-006 all DONE.
- Baseline: 671/671 tests green, exit 0 (EVD-001). Zero failures, nothing to classify.
- Upgrade Ledger open at `.apex/`: 112 requirement rows seeded from `50` + `54 §22`;
  REQ-084 (= REQ-PROD-001) VERIFIED_COMPLETE via V-001; 111 NOT_STARTED.
- `npm run verify` in `runtime/` was green at last run and the tree has not touched
  runtime sources yet.

## Single next action

Start **WP-010 — ID generation** (Phase 1, first packet). Per `49`:
read docs `43 §7` and `47 §4.1`, create `runtime/src/core/ids.ts` + `runtime/test/core/ids.test.ts`
(+ additive types in `src/core/types.ts` only if needed), implement `newId`, `isValidId`,
`projectKey` with injected clock and RNG; then run `npm run verify` in `runtime/` and record
EVD-003 → V-002 → worklog → STATE.json DONE → commit `WP-010 id generation`.

## Pointers

- Plan package: `D:/APEX/army-update-plan/` (EXECUTE.md there is the work order).
- Build state: `.apex/upgrade/STATE.json` (packets, deps, status) — the machine truth.
- Evidence: `.apex/upgrade/EVIDENCE/EVD-001.md` (baseline verify), `EVD-002.md` (ledger).
- Frozen: `.apex/upgrade/BASELINE.md`, `.apex/upgrade/NO-REGRESSION.md`.
- Watch out: every new `.ts` file needs the byte-identical license header (HC-004); all
  disk writes go through `src/core/json.ts` (HC-002); no `enum`/param-properties/`namespace`
  (HC-001); root doctrine edits require `npm run sync:payload` in the same commit (HC-010).
