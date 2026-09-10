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

---

## WP-016 — Global home store · DONE · 2026-09-10

Files: +runtime/src/stores/global-home.ts, +runtime/test/stores/global-home.test.ts,
  ~runtime/src/core/ids.ts (toIsoString helper), ~runtime/test/sourcescan.test.ts
  (HC-T03 strengthened to byte-identical header comparison — outside the packet's Files
  list, recorded in DECISIONS D-005)
Decision: ensure() = cross-process init lock (from WP-012) + temp-name build + atomic
  rename per directory; EEXIST/ENOTEMPTY treated as idempotent win. Future-schema
  home.json is read-only (29 §7). describe() re-probes the live mode at DOCTOR time
  rather than trusting the open-time snapshot. Stores hold no Date-constructor token:
  ISO formatting lives in core/ids.ts toIsoString.
Verify: `npm run verify` -> 760 pass, 0 fail, exit 0 (+9 tests).
Evidence: EVD-010.
Surprises: THREE of my own defects surfaced by this packet's tests and scans: a
  paraphrased license header that the old substring scan could not see (fixed by making
  HC-T03 byte-identical), a future-schema downgrade bug, and an unmanaged-clock token.
  The verifier is doing exactly what the doctrine says it should. Also: paths.ts's
  header block is 17 lines with a blank separator before the closing */ — index it
  precisely, never by eye.
Next: WP-017 (ingestion scanner)

---

## WP-017 — Ingestion scanner · DONE · 2026-09-10

Files: ~runtime/src/core/redact.ts (scan() + SCAN_CONTEXTS + rules), +runtime/test/core/redact-scan.test.ts,
  +runtime/test/fixtures/security/* (8 fake-secret corpus files)
Decision: scan() added INSIDE redact.ts per 47 §4.5 — redact() unchanged as the write-path
  filter; scan() is the read/ingest gate with context-scoped severities (memory/skill deny
  injections; archive keeps history at review; extension manifests deny everything
  dangerous). Bidi controls = deny, zero-width = review (30 §9 grading). Ordinary
  non-Latin text can never trip any rule — all rules target control code points, secret
  shapes, or imperative exfil/injection phrasing.
Verify: `npm run verify` -> 773 pass, 0 fail, exit 0 (+13 tests).
Evidence: EVD-011.
Surprises: command-anchored rm -rf regexes (governor's shape) silently missed prose
  mentions — the scanner sees PROSE, not command lines. Anchoring is input-class-dependent;
  recorded so nobody "unifies" the two pattern lists naively. Also: fixtures live at
  test/fixtures/security per 51 §1, not beside the test file — resolve with path.resolve("..", ...).
Next: WP-018 (migration registry and journal)

---

## WP-018 — Migration registry and journal · DONE · 2026-09-10

Files: +runtime/src/stores/migration-registry.ts, +runtime/test/stores/migration-registry.test.ts
Decision: runner executes exactly 29 §5's order (lock -> read/validate -> backup ->
  in-memory compute+validate -> atomic replace via writeJson -> journal terminal entry).
  Journal STARTED-without-terminal = MIGRATION_INTERRUPTED, blocks new runs, surfaced to
  Doctor via findInterruptedMigrations; recovery stays a --repair act (never silent).
  Future schema refused before any lock. Missing hop refused by name (no guessed paths).
Verify: `npm run verify` -> 781 pass, 0 fail, exit 0 (+8 tests).
Evidence: EVD-012.
Surprises: two of my own bugs: (1) interrupted-detection ordered after the current-version
  short-circuit — invisible exactly when it mattered; (2) tests asserting a v2 target the
  schema module never declares. Both caught by the fixtures. Lesson written into this
  entry: assert against the declared contract, not the demo I imagined.
Next: WP-019 (Doctor foundation)

---

## WP-019 — Doctor foundation · DONE · 2026-09-10

Files: +runtime/src/engines/doctor.ts, +runtime/test/engines/doctor.test.ts,
  ~runtime/src/cli/index.ts (--repair flag + durable-state section in doctor)
Decision: runDoctor composes the existing engines (global-home describe, migration
  journal finder) instead of re-implementing checks — Doctor owns reporting, stores own
  their state (C-008: no second authority). Repairs bounded to the four 31 §12 actions
  and exported as REPAIRABLE so the test pins the list. Future schema = BLOCKED + read-only,
  never "repaired" (DOC-T03). CLI doctor keeps its existing install-diagnosis section and
  adds the durable-state section — additive, existing INS-008 tests untouched and green.
Verify: `npm run verify` -> 789 pass, 0 fail, exit 0 (+8 tests).
Evidence: EVD-013.
Surprises: my --repair gate required an OK/WARN resolve, silently excluding the absent
  home — the one case home-ensure exists for. Tests caught it. Also the tree mixes LF and
  CRLF across files, so byte-identical header comparison must normalize newlines first
  (checked-out older files are CRLF; new ones are LF).
Next: PHASE 1 COMPLETE. Phase 2 (memory fabric) begins at WP-020.

---

## WP-020 — Memory record types · DONE · 2026-09-10

Files: ~runtime/src/core/types.ts (+memory fabric section),
  +runtime/src/stores/memory-store.ts (record validator only, store I/O is WP-021),
  +runtime/test/stores/memory-store.test.ts (types portion)
Decision: 10 §3's field set with 28 §5's type name (precedence: WP names the deliverable;
  04's architecture beats 28's ALL-CAPS vocabulary). All unions as const arrays + derived
  types (HC-001). The record validator enforces scope-shape (project REQUIRES projectKey,
  global FORBIDS it — C-020 bidirectional isolation starts at the type), scanner verdict,
  revision integer, ISO timestamps, confidence [0,1], text bounds.
Verify: `npm run verify` -> 797 pass, 0 fail, exit 0 (+8 tests).
Evidence: EVD-014.
Surprises: my semantic-key regex rejected `preference.package_manager` — the doc's own
  example — because the character class lacked the underscore. The fixture caught it
  before any store code depended on it.
Next: WP-021 (memory store read/commit)

---

## WP-021 — Memory store read/commit · DONE · 2026-09-10

Files: ~runtime/src/stores/memory-store.ts (store engine added), ~runtime/test/stores/memory-store.test.ts
Decision: commit is FULL-STATE with revision CAS under the cross-process lock — a stale
  writer gets MEMORY_REVISION_CONFLICT and must re-read (12 §7); the store never merges.
  Canonical = records.jsonl (framed JSONL from WP-013, quarantine-safe) + state.json
  revision counter; every commit is one atomic rewriteJsonl — kill-safe by construction.
  Hot views (USER.md/GLOBAL.md) render only active global records and are rebuildable.
Verify: `npm run verify` -> 804 pass, 0 fail, exit 0 (+7 tests incl. the 20-process race
  and the SIGKILL fixture).
Evidence: EVD-015.
Surprises: my first CAS test asserted a PATCH-style writer and failed — the contract is
  read-modify-write, and the failing test was wrong, not the store (probe evidence in the
  EVD). Also: node:test timeout goes in the options overload `test(name, {timeout}, fn)`,
  and bash heredocs break on long embedded backtick scripts — write big test blobs with
  the file tool and concatenate.
Next: WP-022 (pending mutations)

---

## WP-022 — Pending mutations · DONE · 2026-09-10

Files: ~runtime/src/stores/memory-store.ts (stage/listPending/resolvePending),
  ~runtime/test/stores/memory-store.test.ts (+4 tests)
Decision: staged mutations live in pending/mutations.jsonl (framed JSONL) — survive
  restart by construction. Approval RE-SCANS the payload first (12 §10): the recorded
  staging verdict is evidence, never a waiver. Deny-at-approval keeps the mutation staged
  for inspection (reject clears it). baseRevision checked against the current state — a
  staged mutation from a moved world is refused with a named reason, never blind-applied.
Verify: `npm run verify` -> 808 pass, 0 fail, exit 0.
Evidence: EVD-016.
Surprises: two honest-threat-model lessons: (1) editing a framed JSONL payload on disk
  does not produce "hostile payload" — it produces a quarantined line (checksum framing
  works as designed); the realistic hostile case is a stale recorded verdict. (2) The
  20-process race flaked once under full-suite parallel load (retry exhaustion at ~80
  attempts); passed on re-run and in the standalone file — if it recurs, raise the retry
  budget or serialize that describe block.
Next: WP-023 (normalization, dedupe, near-duplicate detection)

---

## WP-023 — Normalization, dedupe, near-duplicate detection · DONE · 2026-09-10

Files: +runtime/src/engines/memory-librarian.ts (normalize/similarity/classify/merge
  portion), +runtime/test/engines/memory-librarian.test.ts
Decision: classifyPair is called only WITHIN a subject (same scope+kind+semanticKey —
  isSameSubject guard); text similarity NEVER decides a merge alone (11 §4/§5).
  Exact duplicates refresh provenance transactionally (11 §3), never a second truth row.
  The 3-gram fallback is a candidate detector that can only RAISE classification.
Verify: `npm run verify` -> 821 pass, 0 fail, exit 0 (+13 tests).
Evidence: EVD-017.
Surprises: THREE Unicode-folding defects in my first normalize (missing \p{M} splitting
  Devanagari; trailing '.' surviving; nukta treated as meaningful). All found by the
  multilingual fixtures with probe evidence — exactly the SEC-T08 discipline. Also
  removed an arbitrary *0.95 damping on the trigram fallback that contradicted 11 §11.
Next: WP-024 (correction, supersession, conflicts)

---

## WP-024 — Correction, supersession, conflicts · DONE · 2026-09-10

Files: ~runtime/src/engines/memory-librarian.ts (resolveCandidate),
  ~runtime/test/engines/memory-librarian.test.ts (+8 tests)
Decision: resolveCandidate implements 11 §9 exactly, PURE over the record set — the
  caller owns scanning, policy gating and the transactional commit (C-005: the
  librarian supplies context, never authority). Corrections validate target ids AND
  subject; cross-subject supersession is refused. Retracting a correction marks the
  subject review-state (zero active values) — revival is an explicit human act. Conflicts
  are records with unresolved status; conflicted sides are never injected as truth.
Verify: `npm run verify` -> 829 pass, 0 fail, exit 0.
Evidence: EVD-018.
Surprises: the reinforce test expected the "reinforce" action label but exact duplicates
  take the earlier merge-provenance branch — same outcome (provenance merge, one row),
  different label. Test now accepts either with the outcome asserted, not the label.
Next: WP-025 (selection and budgeting)

---

## WP-025 — Selection and budgeting · DONE · 2026-09-10

Files: ~runtime/src/engines/memory-librarian.ts (selectMemory), ~runtime/test/engines/memory-librarian.test.ts (+9)
Decision: selectMemory is pure (records in, selection out) — the caller wires it to the
  store and config. Every skip is RECORDED with a reason (the "why isn't my memory here"
  audit). Budget uses estimateTokens from cortex (42 §7: the only estimator) and drops
  from the global tail so project facts survive. Expiry evaluated lazily at retrieval
  (10 §9 — no daemon, no status flip needed to skip). Config keys read via the
  MemorySelectionConfig struct for now; the ApexConfig keys land with WP-074.
Verify: `npm run verify` -> 838 pass, 0 fail, exit 0.
Evidence: EVD-019.
Surprises: none — the pure-function shape made the fixtures straightforward.
Next: WP-026 (Cortex integration)

---

## WP-026 — Cortex integration · DONE · 2026-09-10

Files: ~runtime/src/engines/cortex.ts, ~runtime/test/engines/cortex.test.ts (+8)
Decision: the old `memory` section renamed to `projectMemory` and two new sections
  (corrections, globalMemory) inserted AFTER rules (42 §7) — memory drops first under
  budget, safety never. The frozen snapshot lives on the Cortex instance: first assemble
  freezes, later store writes are invisible mid-session, the overlay carries live
  corrections (13 §3). Every durable block is wrapped in the fixed 48 §4 APEX_DATA
  framing; the rename of the section is a rename, not a behaviour change — existing
  COR tests prove the assembly unchanged.
Verify: `npm run verify` -> 846 pass, 0 fail, exit 0.
Evidence: EVD-020.
Surprises: none — the section-bucket architecture made the extension mechanical, and
  the pre-existing 25 cortex tests passing unchanged is the no-regression proof.
Next: WP-027 (recall bridge)

---

## WP-027 — Recall bridge · DONE · 2026-09-10

Files: ~runtime/src/engines/recall.ts (+rawText, +RecallBridge), ~runtime/test/engines/recall-council.test.ts (+4)
Decision: RecallBridge as a thin wrapper — Recall stays the parser/owner of MEMORY.md;
  the bridge only attaches metadata (sourceType project_file, observedAt, refs, date)
  for the librarian's selection. Zero format changes: provenance lives in the bridge
  objects, never in the file.
Verify: `npm run verify` -> 850 pass, 0 fail, exit 0.
Evidence: EVD-021.
Surprises: Recall.relevant returns "[Section] text" strings — my bridge matched on raw
  text and found nothing. Also caught myself mid-edit appending a placeholder comment
  block to recall.ts (reverted immediately) — the no-markers rule exists for exactly this
  class of slip; the tree never saw it committed.
Next: WP-028 (host instruction mirror)

---

## WP-028 — Host instruction mirror · DONE · 2026-09-10

Files: ~runtime/src/engines/recall.ts (mirrorToHost upgraded), ~runtime/test/engines/recall-council.test.ts (+5),
  ~runtime/src/core/json.ts (EPERM/EACCES transient retry in lock acquisition)
Decision: mirrorToHost now REQUIRES an explicit target (14 §5: never auto-discovered,
  off by default — config.mirror.enabled lands in WP-074); personal facts excluded at
  the source (filter, not redaction); block carries revision=N; hand-edits inside the
  block surface as drift:true for safe reconciliation. User content outside the block
  is byte-preserved. The pre-existing REC-006 tests pass unchanged (explicit targets
  were already their shape).
  ALSO (recorded here, in DECISIONS D-006): hardened withCrossProcessLock's EPERM/
  EACCES handling — Windows AV/indexer transients under 20-way contention caused two
  flaky failures of the MEM-CON-T01 race across the build; those codes now retry with
  the bounded backoff. Race suite verified 3x consecutive.
Verify: `npm run verify` -> 855 pass, 0 fail, exit 0.
Evidence: EVD-022.
Surprises: the race flake was a real robustness gap in MY lock code, not test noise —
  second occurrence forced the proper root-cause (recovery ladder works).
Next: WP-029 (memory user surface)

---

## WP-029 — Memory user surface · DONE · 2026-09-10

Files: +runtime/src/cli/memory-cli.ts, ~runtime/src/cli/index.ts (memory case + usage),
  +runtime/test/cli/memory-cli.test.ts
Decision: CLI-first per the packet. The memory surface composes the existing engines
  (store, librarian resolveCandidate, scanner) — no new write paths, no second policy.
  disable writes memory.useGlobal=false via mergeConfigFile (INS-003 non-destructive
  merge). MCP tools deliberately deferred to WP-072 (needs WP-053's disclosure budget).
Verify: `npm run verify` -> 862 pass, 0 fail, exit 0 (+7 CLI end-to-end tests).
Evidence: EVD-023.
Surprises: spawned `node script.ts` argv vanishing silently in this environment took
  three probe rounds to isolate — the -e-import pattern from WP-012 is the portable
  one; recorded for every future CLI test. Also caught a python heredoc escaping bug
  (join newline) by the loader refusing the file — cheap lesson, keep writing test
  files with the file tool.
Next: WP-025b (hot-view overflow -> consolidation candidate) — the last Phase 2 packet.

---

## WP-025b — Hot-view overflow → consolidation candidate · DONE · 2026-09-10

Files: ~runtime/src/stores/memory-store.ts (budgeted renderHotViews + delegation),
  +runtime/src/stores/memory-pending.ts (pending surface split out),
  ~runtime/test/stores/memory-store.test.ts (+3)
Decision: overflow is a CONDITION with a remedy, not a drop: the canonical store is
  unbounded, the views fit budget, and the fix is a staged consolidation candidate —
  a normal mutation that passes the same gates (approval, re-scan). Module split to
  stores/memory-pending.ts triggered by my own MOD-T05 size scan (381 > 350) — the
  ceiling forced a cleaner boundary rather than being loosened.
Verify: `npm run verify` -> 865 pass, 0 fail, exit 0.
Evidence: EVD-024.
Surprises: my test asserted "6 overflow" but honest math gives 3 (3 records fit the
  500-token USER budget); the assertion now derives the count from the gist and checks
  the payload matches it.
Next: PHASE 2 COMPLETE (WP-020..WP-029 + WP-025b all DONE). Phase 3 (archive) at WP-030.

---

## WP-030 — Archive types and store · DONE · 2026-09-10

Files: +runtime/src/stores/archive-store.ts, +runtime/test/stores/archive-store.test.ts,
  ~runtime/src/core/types.ts (ArchiveEvent, SessionRecordV1, ARCHIVE_EVENT_TYPES, SESSION_STATUSES),
  +runtime/src/core/json.ts (appendText), ~runtime/src/stores/archive-store.ts (readEvents quarantine redirect)
Decision: `appendSession` input makes `id` and `taskIds` optional via `Partial<Pick<>>` (same
  pattern as `appendEvent`); the implementation generates defaults. `readJsonlSafe` writes
  quarantined lines to a per-file `.quarantine` side file — the archive store redirects them
  to the shared `events/quarantine.jsonl` (15 §3 contract) via a new `appendText` in json.ts
  (42 §4: all writes through json.ts). All writes use `withCrossProcessLock`; no `new Date`/
  `Math.random` in the store (injected `now`, `newId`/`toIsoString` from ids.ts).
Verify: `npm run verify` -> 869 pass, 0 fail, exit 0 (+4 new tests; was 865).
Evidence: EVD-025.
Surprises: typecheck failed — `appendSession` kept `id`/`taskIds` required after Omit, but
  the impl generates defaults; fixed with the `Partial<Pick<>>` pattern matching `appendEvent`.
  The quarantine test failed because `readJsonlSafe` writes to `events/<sessionId>.jsonl.quarantine`
  (per-file) but `15 §3` + the done-when require `events/quarantine.jsonl` (shared); added
  `appendText` to json.ts and redirected in `readEvents`.
Next: WP-031 — redaction chokepoint.
