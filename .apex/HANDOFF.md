# HANDOFF

Where the build stopped, and the single next action. Read after `EXECUTE.md`,
`.apex/upgrade/STATE.json`, and the last two WORKLOG entries (`52 §7`).

## State

- Branch `upgrade/army-v4`, ~55 commits ahead of baseline 7c217ec.
- Phases 0–4 COMPLETE (WP-001..006, WP-010..019, WP-015b, WP-020..029, WP-025b,
  WP-030..037, WP-040..049). 46 of 92 packets DONE.
- Suite at last verify: 970 pass, 0 fail, exit 0 (EVD-042). Node v24.16.0, win32 x64.
- Phase 4 exit gate met: a verified reusable procedure can be learned (extractor ->
  forge -> catalog), and failed or untrusted skills cannot silently become active
  (gate-before-learning, deny-never-overridable, hash-bound trust, no self-trust).
- New subsystems this phase: skill-store parser/linter, skill-catalog (3 disclosure
  levels), trust-store, skill-activation, learning-extractor, skill-forge, usage
  sidecar, skill-curator, child-result validation in warden, skills CLI,
  core/15-SKILLS.md doctrine (ships in payload).

## Single next action

Start **WP-050 — Capability registry and effects taxonomy**. Per `49`: docs `21 §3`,
`42 §6`. Files: `+src/stores/capability-registry.ts`, `+test/stores/capability-registry.test.ts`.
NOTE: the Governor's operation kinds are `read|write|delete|bash|network|deploy|payment|message`
(42 §6) — use the 42 §6 mapping, NOT the names in 21.

## Pointers

- Plan: `D:/APEX/army-update-plan/` (EXECUTE.md is the work order; 49 = packets).
- Machine truth: `.apex/upgrade/STATE.json` (92 packets, deps, statuses).
- Evidence: `.apex/upgrade/EVIDENCE/EVD-001..042`.
- Lessons that WILL bite again (from WORKLOG Surprises):
  - write source files with the FILE TOOL ONLY — bash heredocs truncate mid-file and
    eat backslashes (`\\` becomes `\`, corrupting regex literals — three hits so far);
    python replace() writes real newlines for literal \n. Both corrupted files.
  - spawn children via `--input-type=module -e "import; call()"`; direct `node file.ts`
    spawns silently drop argv in this sandbox.
  - new-file headers: splice the canonical 18 lines byte-for-byte from an existing
    store file (sourcescan test enforces it).
  - stores must not contain `new Date(`/`Math.random(` tokens — injected clock +
    `toIsoString` from core/ids.ts.
  - `node:test` timeout goes in `test(name, {timeout}, fn)`.
  - Cortex reads a REAL Ledger or COR-007 short-circuits before custom sections render.
  - newId is entropy-unique even on a fixed clock — assert deterministic CONTENT, not ids.
  - the ledger enforces the VERIFIED_COMPLETE ladder itself (IN_PROGRESS ->
    IMPLEMENTED_NOT_VERIFIED -> passing verification record linked to the req).
  - MEM-CON-T01 20-way race occasionally flakes on Windows (AV/indexer EPERM on lock
    open; WP-028-hardened retry). A single clean re-run is the known-good verdict.
  - stores ceiling 350 lines (MOD-T05); engines have no listed ceiling but keep sane.
