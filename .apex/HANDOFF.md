# HANDOFF

Where the build stopped, and the single next action. Read after `EXECUTE.md`,
`.apex/upgrade/STATE.json`, and the last two WORKLOG entries (`52 §7`).

## State

- Branch `upgrade/army-v4`, ~119 commits ahead of baseline 7c217ec.
- Phases 0–6 DONE: Phase 6 closed WP-060 (TaskContract envelope,
  TASK-T01..T06), WP-061 (domain verifiers, AUT-T01/T02), WP-062
  (deliverable validation, AUT-T07), WP-063 (capability-first planning,
  AUT-T03), WP-064 (failure taxonomy + ladder, RCV-T01..T06), WP-065
  (delegation contracts, FLT-T01/T03/T05/T06), WP-065b (child limits,
  FLT-T07..T11), WP-066 (council triggers, FLT-T04), WP-067 (completion
  states + Gate), WP-068 (durable-state doctrine + payload sync).
- Suite at last verify: 1313 pass, 0 fail, exit 0 (EVD-068, WP-068).
  Node v24.16.0, win32 x64.
- Phase-6 exit gate met: code, research, artifact and system-operation
  scenarios run through one governed loop (EVD-068 gate section).

## Single next action

Start **Phase 7A at WP-070 — START-HERE V2** (Dep WP-068; Doc `48`).
Per `49`: rewrite START-HERE to the V2 spec (B0–B11 boot, durable-state
map section, readiness contract, 6,000-token ceiling SH-T01) with payload
sync. Then WP-071..WP-075 in `packetOrder`.

## Pointers

- Plan: `D:/APEX/army-update-plan/` (EXECUTE.md is the work order; 49 = packets).
- Machine truth: `.apex/upgrade/STATE.json` (92 packets, deps, statuses).
- Evidence: `.apex/upgrade/EVIDENCE/EVD-001..068`.
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
