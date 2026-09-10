# Upgrade Worklog

One entry per closed packet. Append-only. Written when a packet closes, never in advance.

---

## WP-001 — Capture tree fingerprint · DONE · 2026-09-10

Files: +.apex/upgrade/BASELINE.md
Decision: none needed — every field of `02 §2` was observable directly.
Verify: `git rev-parse HEAD`, `node -v`, `npm -v`, `git status --porcelain`, `sha256sum START-HERE.md`
  — all literal outputs pasted into BASELINE.md §1–§2.
Evidence: EVD-001 (fingerprint fields recorded alongside the suite output).
Surprises: none. Tree matches `42 §1` exactly (same facts, same commit lineage).
Next: WP-002

## WP-002 — Execute the untouched baseline suite · DONE · 2026-09-10

Files: ~.apex/upgrade/BASELINE.md
Decision: ran `npm run verify` end-to-end once (all five steps) rather than only `npm test`,
  because the catalogue's default verify command is the full pipeline and BASE-T01 demands
  execution, not inference.
Verify: `npm run verify` -> 671 pass, 0 fail, 0 cancelled, exit 0, 25.7s.
Evidence: EVD-001.
Surprises: none. The earlier standalone `npm test` run reproduced identical counts.
Next: WP-003

## WP-003 — Reconcile the runtime support policy · DONE · 2026-09-10

Files: ~.apex/upgrade/BASELINE.md (§5)
Decision: the packaged floor and the contributor floor are identical (`>=22.6.0`) because the
  test toolchain itself requires native type stripping — no split floors to publish. The
  22.6.x floor is NOT_RUN locally (only Node v24.16.0 installed); it is covered by the
  existing CI matrix (node 22 + 24 on windows/ubuntu/macos, packed-tarball install), which
  already matches `43 §6`. Defer floor-specific evidence to CI (WP-081), per `02 §6`.
Verify: matrix comparison against `.github/workflows/verify.yml` (read, confirmed) — recorded
  in BASELINE.md §5. No local 22.x run: recorded `NOT_RUN` with the reason.
Surprises: none. The plan's `43 §6` and the tree's existing CI already agree.
Next: WP-004

## WP-004 — Classify pre-existing failures · DONE · 2026-09-10

Files: ~.apex/upgrade/BASELINE.md (§6), +.apex/REQUIREMENTS.md (seeded)
Decision: baseline suite had ZERO failures, so there is nothing to classify as
  product-defect / environment-drift / harness-incompatibility. The upgrade's blocking
  requirements were seeded into a NEW project Ledger at the repository root `.apex/`
  (the runtime package's `runtime/.apex/` is the runtime's own dogfooding ledger and was
  left untouched — using it would have mixed two projects' truth). Seeding used the product's
  own `Ledger` engine so row shape, id rules and the totals line come from the real code.
Surprises: the repository had no root `.apex/` before this packet; one was created by init.
  The pre-existing untracked file `apex-army-v3.md` at the root was left untouched (not
  project source, not modified by the upgrade).
Next: WP-005

## WP-005 — Open the upgrade ledger · DONE · 2026-09-10

Files: +.apex/upgrade/STATE.json, +.apex/upgrade/WORKLOG.md
Decision: STATE.json additionally carries `packetOrder` and a full `dependencies` map
  (catalogue + `54 §21` insertions) so a successor agent can select the next packet
  mechanically without re-reading 49/54 to reconstruct the graph — `52`'s schema is extended
  additively, all its fields kept. 92 packets enumerated (77 primary + 15 second-pass),
  `WPC-T05` satisfied. Every dependency edge was validated (no unknown ids, no cycles,
  all packets reachable from the phase structure).
Verify: `node -e \"JSON.parse(require('fs').readFileSync('.apex/upgrade/STATE.json','utf8'))\"`
  -> valid JSON (exit 0). See EVD-002.
Evidence: EVD-002.
Surprises: `49` lists 75 primary packet ids in phase sections but also names WP-057 in the
  Phase 5 gate and second-pass packets reference each other; the enumeration was built from
  the phase tables plus the dependency summary plus `54 §21`, then cross-checked: every id in
  49 appears, plus the 15 from 54.
Next: WP-006

## WP-006 — Freeze the no-regression contract · DONE · 2026-09-10

Files: +.apex/upgrade/NO-REGRESSION.md
Decision: each `42 §11` behaviour is listed with its proving test file and the named test
  ids that appeared in the WP-002 run output. The run output shows suite-level counts; the
  per-test ids were taken from the test sources' describe/test names, all of which executed
  in the 671-test green run.
Verify: the named tests are part of the suite that produced the WP-002 result (EVD-001,
  exit 0). See NO-REGRESSION.md for the table.
Evidence: EVD-001.
Surprises: none.
Next: Phase 0 exit gate recorded — phase0: PASSED in STATE.json. Begin Phase 1 (WP-010).

---

## WP-010 — ID generation · DONE · 2026-09-10

Files: +runtime/src/core/ids.ts, +runtime/test/core/ids.test.ts (types.ts untouched — no new shared types were needed)
Decision: ids are STATELESS — the spec's determinism requirement ("identical injected inputs
  yield identical ids", 43 §7) rules out any module-level monotonic counter, so uniqueness is
  time + 36^6 random alone, and the time part is zero-padded to 9 base36 digits so string
  sort equals numeric sort. Used canonicalCase+realpathSafe from paths.ts (existing) rather
  than a new canonicalisation; ApexError with code BAD_ID_PREFIX per HC-012.
Verify: `npm run verify` -> 680 pass, 0 fail, exit 0 (was 671; +9 new tests).
Evidence: EVD-003.
Surprises: first typecheck failed on destructuring under noUncheckedIndexedAccess
  (`string | undefined`); the codebase style is `x!` assertions. My first draft also
  invented helpers that don't exist — re-read paths.ts before writing, always.
Next: WP-011 (schema classification)

---

## WP-011 — Schema classification · DONE · 2026-09-10

Files: +runtime/src/core/schema.ts, +runtime/test/core/schema.test.ts
Decision: null (no schema marker) classifies as legacy 0 per 29 §8 (adopt non-destructively,
  never assume current). All six stores start at CURRENT_SCHEMA 1 — no migrations exist yet;
  bumps land with the packets that change store shapes. classifySchema is the single
  classifier (one effects-taxonomy-style ownership rule).
Verify: `npm run verify` -> 687 pass, 0 fail, exit 0 (+7 tests).
Evidence: EVD-004.
Surprises: none — 47 §4.2's contract is exact and matched the plan.
Next: WP-012 (cross-process lock)

---

## WP-012 — Cross-process lock · DONE · 2026-09-10

Files: ~runtime/src/core/json.ts, +runtime/test/core/json-lock.test.ts
Decision: lock lives INSIDE json.ts per 42 §3/HC-009 — no new module, CORE-005 scan untouched.
  Release is token-checked (a recovery successor's lock is never deleted by the old holder,
  LOCK_NOT_OWNED). Stale policy = 12 §5 in full: same host + well-formed record + pid
  demonstrably absent + age past staleAfterMs; pidAlive uses signal-0 probe (EPERM = alive).
  Recovery audited via log.event("lock.stale_recovered"). Lock writes use fsp.open("wx")
  exclusive-create + handle sync — inside the already-sanctioned json.ts.
Verify: focused 8/8; `npm run verify` -> 695 pass, 0 fail, exit 0 (+8 tests).
Evidence: EVD-005.
Surprises: Windows dynamic import() of an absolute path needs a file:// URL
  (ERR_UNSUPPORTED_ESM_URL_SCHEME) — child scripts take URLs for import specifiers but PLAIN
  paths for function arguments; mixing them broke mkdir. Also spawnSync waits for exit, so a
  "live holder" test must use async spawn — a spawnSync sleeper is indistinguishable from a
  crashed writer. Both recorded here for the next Windows test author.
Next: WP-013 (JSONL primitives)

---

## WP-013 — JSONL primitives · DONE · 2026-09-10

Files: ~runtime/src/core/json.ts, +runtime/test/core/json-jsonl.test.ts
Decision: appendJsonl uses fsp.open(file, "a") + handle.writeFile inside json.ts (the
  CORE-005 sanctioned module) — no sourcescan SANCTIONED edit was needed. Framing is
  {seq, sha8, record} per 47 §4.3. Malformed lines quarantine to `<file>.quarantine`
  (raw, append-only) + a jsonl.quarantine event; reads never throw.
Verify: `npm run verify` -> 702 pass, 0 fail, exit 0 (+7 tests).
Evidence: EVD-006.
Surprises: REAL BUG caught by the torn-tail test — appending after a truncated write
  glued the new frame onto the fragment (both lines lost). Root cause: append assumes the
  file ends with \n. Fix: prepend a repair \n when the last byte is not a newline.
  Truncation recovery now works as 12 §6 demands. Recorded in .apex/MEMORY.md later
  (Phase 2 wiring); noted here for the next agent.
Next: WP-014 (source-scan invariant extensions)

---

## WP-014 — Source-scan invariant extensions · DONE · 2026-09-10

Files: ~runtime/test/sourcescan.test.ts
Decision: legacy engines (the 7 pre-upgrade files) are exempt from the new injected-clock
  rule — 47 §5 governs NEW modules and their existing behaviour is load-bearing and tested;
  exemption list is explicit in the test. Size budgets warning-grade per 47 §3 ("soft
  ceilings"): enforced as scan failures for NEW files; existing files grandfathered at
  current size (json.ts 599 lines exceeds the 400 core ceiling but predates the rule —
  splitting it would violate "additive, not a rewrite"). Each scan ships a planted-violation
  self-test asserting the PATTERN catches what it claims to catch.
Verify: `npm run verify` -> 723 pass, 0 fail, exit 0 (+21 tests).
Evidence: EVD-007.
Surprises: TypeScript control-flow analysis narrows a closure-written variable to its
  initial type at the read point — `cycle ? cycle.join(...) : ""` is a `never` error even
  with an explicit null-union. Reading through an object wrapper defeats the narrowing.
  Cost me three typecheck round-trips; second failure per the ladder made me probe TS in
  isolation instead of guessing again.
Next: WP-015 (path and home resolution)

---

## WP-015 — Path and home resolution · DONE · 2026-09-10

Files: ~runtime/src/core/paths.ts, +runtime/test/core/paths-home.test.ts
Decision: apexHome REFUSES hard (HOME_UNSAFE_PATH) on root/system/drive-relative/empty
  paths — no silent fallback, because a fallback writes where the user did not choose.
  Degrades honestly on soft conditions: absent->VOLATILE, unwritable->READ_ONLY,
  synced/networked/inside-project -> risks+warnings, never exceptions. apexHome creates
  NOTHING (47 §4.4) — creation is WP-016's lock-guarded ensure(). Writability probe =
  exclusive-create + delete of a hidden probe file, residue-free. Added two refusals the
  plan text did not name but 09 §2 implies: drive-relative paths ("D:") and Windows
  system-wide directories (C:\Windows etc).
Verify: `npm run verify` -> 742 pass, 0 fail, exit 0 (+19 tests; existing 45 paths tests
  still green — no regression).
Evidence: EVD-008.
Surprises: UNC probe took 2.7s on this machine (network path stat timeout) — expected on
  win32; noted so nobody thinks it is a hang. Git-bash heredoc mangles backslashes — write
  probe scripts as .mjs files, not -e strings, when testing Windows path literals.
Next: WP-015b (sensitive-path read denylist)

---

## WP-015b — Sensitive-path read denylist · DONE · 2026-09-10

Files: +runtime/src/core/sensitive.ts, ~runtime/src/engines/governor.ts (isProtectedRead),
  +runtime/test/core/sensitive.test.ts
Decision: implemented as core/sensitive.ts (pure functions) wired into Governor.isProtectedRead
  — the read rule of decide() already runs blocklist-first in every mode, so the denylist is
  enforced wherever reads are decided, including L2 plugin paths. security.allowSensitiveRead
  is read defensively (optional field) because the config key itself lands in WP-074 per 44.
  Overrides validate as exact absolute paths; globs and relative paths are rejected with
  READ_DENIED_SENSITIVE; every override use is audited via log.warn.
Verify: `npm run verify` -> 751 pass, 0 fail, exit 0 (+9 tests; governor suite green).
Evidence: EVD-009.
Surprises: `**/*credentials.json` glob also matches a docs file named credentials-guide.md?
  No — globMatch handles the extension boundary correctly; the false-positive corpus test
  passes. One typecheck round on tuple destructuring (noUncheckedIndexedAccess) — typed the
  corpus array explicitly.
Next: WP-016 (global home store)
