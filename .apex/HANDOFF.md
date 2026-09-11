# HANDOFF

Where the build stopped, and the single next action. Read after `EXECUTE.md`,
`.apex/upgrade/STATE.json`, and the last two WORKLOG entries (`52 §7`).

## State

- Branch `upgrade/army-v4`, ~101 commits ahead of baseline 7c217ec.
- Phases 0–5 DONE (WP-001..006, WP-010..019 + WP-015b, WP-020..029 + WP-025b/WP-026b,
  WP-030..037, WP-040..049 + WP-041b/WP-042b/WP-047b/WP-049b/WP-049c,
  WP-050..059 + WP-050b/WP-056b/WP-058). Phase 6 started: WP-060 DONE.
- Suite at last verify: 1272 pass, 0 fail, exit 0 (EVD-060, WP-060).
  Node v24.16.0, win32 x64.
- Phase-6 entry met: TaskContract envelope only (no second goal DB),
  parent/child close guard, fingerprint-forced revalidation, auditable
  supersession, pointer-rich handoff — TASK-T01..T06 green.

## Single next action

Start **WP-061 — domain verifier registry** (Dep WP-060; Doc `24 §3`,
`40 §10`, `41 §16`). Per `49`: registry returning
`PASS|FAIL|NOT_RUN|NOT_APPLICABLE`, existing code verification stays
authoritative, **no write path added** (`42 §4`). Then WP-062..WP-068 in
`packetOrder`.

## Pointers

- Plan: `D:/APEX/army-update-plan/` (EXECUTE.md is the work order; 49 = packets).
- Machine truth: `.apex/upgrade/STATE.json` (92 packets, deps, statuses).
- Evidence: `.apex/upgrade/EVIDENCE/EVD-001..060`.
- Lessons that WILL bite again (from WORKLOG Surprises):
  - write source files with the FILE TOOL ONLY — bash heredocs truncate mid-file and
    eat backslashes (`\\` becomes `\`, corrupting regex literals — three hits so far);
    python replace() writes real newlines for literal \n. Both corrupted files.
  - **grep silently hides matches in any file containing NUL bytes** —
    cortex.test.ts embeds an intentional `"\u0000\u0000 garbage"` corruption fixture,
    so grep-based id scans report its CTX-T03..T06 as missing. Do acceptance sweeps
    with node `readFileSync` (binary-safe), never bare grep.
  - spawn children via `--input-type=module -e "import; call()"`; direct `node file.ts`
    spawns silently drop argv in this sandbox. Never interpolate `process.env.X` into
    the child script string from the parent — it resolves at build time (undefined).
  - new-file headers: splice the canonical 17 lines byte-for-byte from an existing
    store file (sourcescan test enforces it).
  - stores must not contain `new Date(`/`Math.random(` tokens — injected clock +
    `toIsoString` from core/ids.ts.
  - `node:test` timeout goes in `test(name, {timeout}, fn)`.
  - Cortex reads a REAL Ledger or COR-007 short-circuits before custom sections render.
  - newId is entropy-unique even on a fixed clock — assert deterministic CONTENT, not ids.
  - the ledger enforces the VERIFIED_COMPLETE ladder itself (IN_PROGRESS ->
    IMPLEMENTED_NOT_VERIFIED -> passing verification record linked to the req);
    batch promotion to VERIFIED_COMPLETE is planned at WP-088 (QUESTIONS.md #6).
  - MEM-CON-T01's Windows EPERM flake was root-caused 2026-09-11 (lock holder-read
    retried in json.ts); 6/6 stress runs green. If a transient file error ever
    surfaces again, capture the exact syscall and code before generalising.
  - stores ceiling 350 lines (MOD-T05); engines have no listed ceiling but keep sane.
