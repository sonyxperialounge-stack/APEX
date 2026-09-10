# HANDOFF

Where the build stopped, and the single next action. Read after `EXECUTE.md`,
`.apex/upgrade/STATE.json`, and the last two WORKLOG entries (`52 §7`).

## State

- Branch `upgrade/army-v4`, ~40 commits ahead of baseline 7c217ec.
- Phases 0–3 COMPLETE (WP-001..006, WP-010..019, WP-015b, WP-020..029, WP-025b, WP-030..037).
- Suite at last verify: 906 pass, 0 fail, exit 0 (EVD-032). Node v24.16.0, win32 x64.
- Phase 3 exit gate met: a prior session is findable by real recorded content with
  provenance, and resumable via the capsule — no database service anywhere.
- All packets have commit shas + evidence ids + worklog entries (BLD-T04/05).

## Single next action

Start **WP-040 — Skill format, parser, linter**. Per `49`: read docs `18 §§3–8`, `41 §10`.
Files: `+src/stores/skill-store.ts`, `+test/stores/skill-store.test.ts`.
Do: minimal frontmatter subset parser (no dependency), header validation, body section
check. Done-when: see packet in `49`.

## Pointers

- Plan: `D:/APEX/army-update-plan/` (EXECUTE.md is the work order; 49 = packets).
- Machine truth: `.apex/upgrade/STATE.json` (92 packets, deps, statuses).
- Evidence: `.apex/upgrade/EVIDENCE/EVD-001..032`.
- Lessons that WILL bite again (from WORKLOG Surprises):
  - write big code/test blobs with the file tool + concatenate; bash heredocs truncate.
  - spawn children via `--input-type=module -e "import; call()"`; direct `node file.ts`
    spawns silently drop argv in this sandbox.
  - new-file headers: splice the 17-line canonical from an existing store file.
  - `node:test` timeout goes in `test(name, {timeout}, fn)`.
  - stores must not contain `new Date(`/`Math.random(` tokens — use injected clock
    and `toIsoString` from core/ids.ts.
  - the index's n-gram fallback scores 1 on trigram coincidences — filter at the
    user surface, never in the engine (WP-037).
  - sub-CLIs re-parse argv from main(); include --project/-p in any closed flag set
    so flag values never leak into positional text (WP-037).
