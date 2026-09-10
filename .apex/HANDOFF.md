# HANDOFF

Where the build stopped, and the single next action. Read after `EXECUTE.md`,
`.apex/upgrade/STATE.json`, and the last two WORKLOG entries (`52 §7`).

## State

- Branch `upgrade/army-v4`, ~30 commits ahead of baseline 7c217ec.
- Phases 0–2 COMPLETE (WP-001..006, WP-010..019, WP-015b, WP-020..029, WP-025b).
- Phase 3 in progress: WP-032 (resume capsule) is the current packet. WP-030..031 DONE.
- Suite at last verify: 871 pass, 0 fail, exit 0 (EVD-026). Node v24.16.0, win32 x64.
- All Phase 2 packets have commit shas + evidence ids + worklog entries (BLD-T04/05).

## Single next action

Start **WP-034 — Derived index and rebuild**. Per `49`: read docs `16 §1`, `16 §3`.
Files: `~runtime/src/engines/archive-index.ts`.
Done-when: deleting the index loses no data and search still works. WP-030..033 DONE
(archive types, redaction chokepoint, resume capsule, deterministic search —
880 pass, 0 fail, EVD-028).

## Pointers

- Plan: `D:/APEX/army-update-plan/` (EXECUTE.md is the work order; 49 = packets).
- Machine truth: `.apex/upgrade/STATE.json` (92 packets, deps, statuses).
- Evidence: `.apex/upgrade/EVIDENCE/EVD-001..028`.
- Lessons that WILL bite again (from WORKLOG Surprises):
  - write big code/test blobs with the file tool + concatenate; bash heredocs truncate.
  - spawn children via `--input-type=module -e "import; call()"`; direct `node file.ts`
    spawns silently drop argv in this sandbox.
  - new-file headers: splice the 17-line canonical from an existing store file.
  - `node:test` timeout goes in `test(name, {timeout}, fn)`.
  - stores must not contain `new Date(`/`Math.random(` tokens — use injected clock
    and `toIsoString` from core/ids.ts.
