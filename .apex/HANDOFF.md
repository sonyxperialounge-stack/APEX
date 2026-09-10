# HANDOFF

Where the build stopped, and the single next action. Read after `EXECUTE.md`,
`.apex/upgrade/STATE.json`, and the last two WORKLOG entries (`52 §7`).

## State

- Branch `upgrade/army-v4`, ~99 commits ahead of baseline 7c217ec.
- Phases 0–4 primary packets DONE (WP-001..006, WP-010..019, WP-015b, WP-020..029,
  WP-025b, WP-030..037, WP-040..049). 46 of 92 packets DONE.
- **Still PENDING inside those phases — NOT optional (`49` second-pass list):**
  WP-026b, WP-041b, WP-042b, WP-047b, WP-049b, WP-049c. All have their
  dependencies satisfied. They must land before the Phase-6 gate (or be
  explicitly descoped in STATE.json with a reason — see QUESTIONS.md #5).
- Suite at last verify: 973 pass, 0 fail, exit 0 (EVD-043, audit repair run).
  Node v24.16.0, win32 x64.
- Phase-4 exit gate met: a verified reusable procedure can be learned (extractor ->
  forge -> catalog), and failed or untrusted skills cannot silently become active
  (gate-before-learning, deny-never-overridable, hash-bound trust, no self-trust).
- 2026-09-11 owner-requested audit of all DONE work (WORKLOG "AUDIT" entry,
  EVD-043): hard constraints, STATE/evidence integrity, and acceptance-id sweep
  re-verified; five defects fixed at root cause, including the real cause of the
  MEM-CON-T01 Windows flake (lock holder-read EPERM now retried in json.ts) and
  two missing 12 §13 concurrency tests (MEM-CON-T02/T03 now exist and are green).

## Single next action

Start **WP-026b — attached-context 25/50 guard** (first PENDING packet in
`packetOrder` whose dependencies are DONE), then WP-041b, WP-042b, WP-047b,
WP-049b, WP-049c, then Phase 5 at **WP-050**. Per `49`: WP-026b's doc is `13 §4`;
the Governor's operation kinds are `read|write|delete|bash|network|deploy|payment|message`
(42 §6) — use the 42 §6 mapping, NOT the names in 21.

## Pointers

- Plan: `D:/APEX/army-update-plan/` (EXECUTE.md is the work order; 49 = packets).
- Machine truth: `.apex/upgrade/STATE.json` (92 packets, deps, statuses).
- Evidence: `.apex/upgrade/EVIDENCE/EVD-001..043`.
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
