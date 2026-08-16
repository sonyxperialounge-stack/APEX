# Verification Log

| ID | REQ | Type | Command | Expected | Actual | Result |
|---|---|---|---|---|---|---|
| V-001 | REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-011 | parse | `` | — | No parse command is configured for this project. | NOT_RUN |
| V-002 | REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-011 | types | `npx tsc --noEmit` | exit code 0 |  | PASS |
| V-003 | REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-011 | lint | `` | — | No lint command is configured for this project. | NOT_RUN |
| V-004 | REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-011 | unit | `` | — | No unit command is configured for this project. | NOT_RUN |
| V-005 | REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-011 | suite | `npm test` | exit code 0 | > apex-agent@1.0.0 test | PASS |
| V-006 | REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-011 | build | `npm run build` | exit code 0 | > apex-agent@1.0.0 build | PASS |
| V-007 | REQ-005, REQ-008 | parse | `` | — | No parse command is configured for this project. | NOT_RUN |
| V-008 | REQ-005, REQ-008 | types | `npx tsc --noEmit` | exit code 0 |  | PASS |
| V-009 | REQ-005, REQ-008 | lint | `` | — | No lint command is configured for this project. | NOT_RUN |
| V-010 | REQ-005, REQ-008 | unit | `` | — | No unit command is configured for this project. | NOT_RUN |
| V-011 | REQ-005, REQ-008 | suite | `npm test` | exit code 0 | > apex-agent@1.0.0 test | PASS |
| V-012 | REQ-005, REQ-008 | build | `npm run build` | exit code 0 | > apex-agent@1.0.0 build | PASS |
| V-013 | REQ-005, REQ-008 | parse | `` | — | No parse command is configured for this project. | NOT_RUN |
| V-014 | REQ-005, REQ-008 | types | `npx tsc --noEmit` | exit code 0 |  | PASS |
| V-015 | REQ-005, REQ-008 | lint | `` | — | No lint command is configured for this project. | NOT_RUN |
| V-016 | REQ-005, REQ-008 | unit | `` | — | No unit command is configured for this project. | NOT_RUN |
| V-017 | REQ-005, REQ-008 | suite | `npm test` | exit code 0 | > apex-agent@1.0.0 test | PASS |
| V-018 | REQ-005, REQ-008 | parse | `` | — | No parse command is configured for this project. | NOT_RUN |
| V-019 | REQ-005, REQ-008 | types | `npx tsc --noEmit` | exit code 0 |  | PASS |
| V-020 | REQ-005, REQ-008 | lint | `` | — | No lint command is configured for this project. | NOT_RUN |
| V-021 | REQ-005, REQ-008 | unit | `` | — | No unit command is configured for this project. | NOT_RUN |
| V-022 | REQ-005, REQ-008 | suite | `npm test` | exit code 0 | > apex-agent@1.0.0 test | PASS |
| V-023 | REQ-005, REQ-008 | build | `npm run build` | exit code 0 | > apex-agent@1.0.0 build | PASS |

> A log with no FAIL and no NOT_RUN rows over a long project is not excellence — it is
> evidence that verification was not really happening.

## Evidence

### V-001
- **Requirements:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-011
- **Type:** parse
- **Command:** ``
- **Expected:** —
- **Result:** NOT_RUN
- **Exit code:** null
- **Duration:** 0
- **Timestamp:** 2026-08-16T01:55:44.470Z
- **Reason:** No parse command is configured for this project.

```text

```

### V-002
- **Requirements:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-011
- **Type:** types
- **Command:** `npx tsc --noEmit`
- **Expected:** exit code 0
- **Result:** PASS
- **Exit code:** 0
- **Duration:** 3510
- **Timestamp:** 2026-08-16T01:55:47.988Z
- **Reason:** 

```text

```

### V-003
- **Requirements:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-011
- **Type:** lint
- **Command:** ``
- **Expected:** —
- **Result:** NOT_RUN
- **Exit code:** null
- **Duration:** 0
- **Timestamp:** 2026-08-16T01:55:47.998Z
- **Reason:** No lint command is configured for this project.

```text

```

### V-004
- **Requirements:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-011
- **Type:** unit
- **Command:** ``
- **Expected:** —
- **Result:** NOT_RUN
- **Exit code:** null
- **Duration:** 0
- **Timestamp:** 2026-08-16T01:55:48.005Z
- **Reason:** No unit command is configured for this project.

```text

```

### V-005
- **Requirements:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-011
- **Type:** suite
- **Command:** `npm test`
- **Expected:** exit code 0
- **Result:** PASS
- **Exit code:** 0
- **Duration:** 14762
- **Timestamp:** 2026-08-16T01:56:02.780Z
- **Reason:** 

```text

> apex-agent@1.0.0 test
> node --test --experimental-strip-types "test/**/*.test.ts"

▶ arg parsing
  ✔ parses host and project (38.6301ms)
  ✔ rejects an unknown host with the real list (81.9752ms)
  ✔ detectProjectRoot walks up to a project marker (19.5742ms)
✔ arg parsing (142.8968ms)
▶ INS-003 — attach is non-destructive
  ✔ a rich pre-existing config survives untouched (510.8446ms)
  ✔ a deliberate user setting is not overridden (494.2398ms)
  ✔ INS-005 — a backup is written byte-for-byte (379.404ms)
  ✔ works when there is no pre-existing config at all (432.4483ms)
✔ INS-003 — attach is non-destructive (1817.9601ms)
▶ INS-004 — Windows paths never break the config
  ✔ every emitted path is JSON-safe and the file re-parses (422.987ms)
  ✔ emitted paths use forward slashes (417.7105ms)
  ✔ the historical failure mode still reproduces, proving the test is live (10.4216ms)
✔ INS-004 — Windows paths never break the config (851.9261ms)
▶ INS-006/007 — install record and clean detach
  ✔ the record lists exactly what changed (403.3338ms)
  ✔ detach restores the config byte-for-byte (455.3605ms)
  ✔ detach removes only what attach created (375.4495ms)
  ✔ detach leaves the project ledger alone (449.154ms)
  ✔ detach without an install record is a clean error (12.8403ms)
✔ INS-006/007 — install record and clean detach (1697.2022ms)
▶ INS-009 — the doctrine payload is installed
  ✔ payload files land in the host config directory (418.13ms)
  ✔ a pointer file tells any agent where the doctrine is (414.538ms)
  ✔ the config references the pointer so it loads automatically (449.3951ms)
✔ INS-009 — the doctrine payload is installed (1282.6566ms)
▶ INS-010 — idempotence
  ✔ a second attach is a no-op (1763.5842ms)
✔ INS-010 — idempotence (1763.8635ms)
▶ INS-013 — attach fails atomically
  ✔ a mid-attach failure restores everything and explains (192.8717ms)
✔ INS-013 — attach fails atomically (193.0824ms)
▶ INS-008 — doctor diagnoses seeded breakage
  ✔ reports a healthy install (845.3396ms)
  ✔ state 1 — not attached (650.3695ms)
  ✔ state 2 — invalid JSON in the host config (856.0235ms)
  ✔ state 3 — installed files went missing (869.7445ms)
  ✔ state 4 — no ledger in the project (880.5384ms)
  ✔ state 5 — no verification commands (762.3061ms)
✔ INS-008 — doctor diagnoses seeded breakage (4865.1243ms)
▶ INS-011/012 — no credentials, no network
  ✔ attach never writes anything credential-shaped (169.3137ms)
  ✔ attach succeeds with no network available (171.5073ms)
✔ INS-011/012 — no credentials, no network (341.0398ms)
▶ PLG-001 — the L2 plugin shim is installed correctly
  ✔ a shim is written, not a copy of the built plugin (192.1773ms)
  ✔ the shim imports a file:// URL, never a bare Windows path (172.9368ms)
  ✔ host companions land in the host's own directories, not inside apex/ (190.097ms)
  ✔ an L1-only host gets no plugin shim (168.3519ms)
✔ PLG-001 — the L2 plugin shim is installed correctly (723.9593ms)
▶ CORE-001 — the published package must actually run
  ✔ ships compiled JavaScript, not raw TypeScript (1.5804ms)
  ✔ a build step exists and prepack runs it (0.4537ms)
  ✔ the bin entry is plain JavaScript (0.4966ms)
  ✔ the bin entry prefers dist and falls back to src (0.6793ms)
  ✔ the compiled build exists and imports .js, never .ts (34.1897ms)
  ✔ the compiled build contains no TypeScript-only syntax (2.9478ms)
  ✔ the doctrine payload is published (55.1892ms)
  ✔ CORE-003 — no runtime dependencies (5.0856ms)
  ✔ the supported Node range is declared (8.1292ms)
✔ CORE-001 — the published package must actually run (114.2136ms)
▶ parseJsonLenient
  ✔ plain JSON (80.0479ms)
  ✔ strips a BOM (3.2291ms)
  ✔ strips line comments (2.5874ms)
  ✔ strips block comments (2.3725ms)
  ✔ strips trailing commas (5.395ms)
  ✔ does NOT strip comment-like text inside strings (3.1329ms)
  ✔ throws a useful error on real garbage (2.971ms)
✔ parseJsonLenient (113.0239ms)
▶ INS-004 — Windows path regression
  ✔ serialiseChecked escapes backslashes and round-trips (18.2497ms)
  ✔ emitted JSON contains no lone backslash escape (9.9282ms)
  ✔ toJsonPath produces forward slashes (2.288ms)
  ✔ the exact Army-V2 failure is now impossible (19.4495ms)
  ✔ writeJson re-reads and verifies what landed on disk (20.5624ms)
✔ INS-004 — Windows path regression (71.5353ms)
▶ writes are redacted (CORE-005)
  ✔ writeText redacts (14.8635ms)
  ✔ writeJson redacts nested values (54.1707ms)
✔ writes are redacted (CORE-005) (70.7217ms)
▶ backup
  ✔ returns null when there is nothing to back up (8.6083ms)
  ✔ copies byte-for-byte (INS-005) (34.6915ms)
✔ backup (43.7693ms)
▶ mergeConfigObjects — INS-003
  ✔ adds absent keys (5.3036ms)
  ✔ LEAVES an existing scalar alone (2.8303ms)
  ✔ unions arrays, existing order first (2.4389ms)
  ✔ does not duplicate an array entry that is already present (2.2247ms)
  ✔ shallow-merges objects with existing winning (2.0678ms)
  ✔ preserves every unknown key byte-for-byte (1.5619ms)
✔ mergeConfigObjects — INS-003 (17.44ms)
▶ mergeConfigFile
  ✔ merges into a rich pre-existing config and backs it up (56.447ms)
  ✔ creates the file when absent, with no backup (27.6367ms)
  ✔ tolerates a config with comments and trailing commas (97.9661ms)
✔ mergeConfigFile (182.612ms)
▶ isUnder
  ✔ identity (30.3404ms)
  ✔ direct child (0.484ms)
  ✔ deep child (0.9229ms)
  ✔ sibling is not under (0.5117ms)
  ✔ parent is not under child (0.6827ms)
  ✔ traversal that escapes is not under (2.1109ms)
  ✔ traversal that returns IS under (0.6083ms)
  ✔ a prefix-sharing sibling directory is not under (1.7825ms)
✔ isUnder (55.9219ms)
▶ globMatch
  ✔ config/prod.yaml vs config/prod.yaml -> true (4.4297ms)
  ✔ config/prod.yaml vs config/*.yaml -> true (0.8481ms)
  ✔ config/prod.yaml vs config/ -> true (0.5461ms)
  ✔ config/deep/prod.yaml vs config/ -> true (0.208ms)
  ✔ config/deep/prod.yaml vs config/*.yaml -> false (0.5246ms)
  ✔ config/deep/prod.yaml vs config/**/*.yaml -> true (0.311ms)
  ✔ src/a.ts vs **/*.ts -> true (0.1579ms)
  ✔ a.ts vs **/*.ts -> true (0.3802ms)
  ✔ migrations/001.sql vs migrations/ -> true (0.894ms)
  ✔ src/app.ts vs migrations/ -> false (0.2038ms)
  ✔ file.txt vs file.??? -> true (2.6625ms)
  ✔ file.txtx vs file.??? -> false (0.2608ms)
  ✔ node_modules/x/y.js vs node_modules/ -> true (1.057ms)
  ✔ src/node_modules_helper.ts vs node_modules/ -> false (0.3385ms)
  ✔ backslash separators are normalised (0.205ms)
  ✔ dots in the pattern are literal, not wildcards (0.2656ms)
✔ globMatch (20.168ms)
▶ toJsonPath
  ✔ converts every backslash (0.3508ms)
  ✔ leaves forward slashes alone (1.3298ms)
  ✔ handles UNC prefixes (0.3563ms)
✔ toJsonPath (2.7099ms)
▶ canonicalCase
  ✔ matches the platform convention (2.3146ms)
✔ canonicalCase (2.5494ms)
▶ resolveFrom
  ✔ keeps an absolute path absolute (0.3675ms)
  ✔ resolves a relative path against the root (0.2394ms)
✔ resolveFrom (1.0183ms)
▶ redact — provider key corpus
  ✔ removes anthropic (41.3481ms)
  ✔ removes openai (0.4428ms)
  ✔ removes openai-classic (0.2777ms)
  ✔ removes github-pat (0.5425ms)
  ✔ removes github-fine (0.8854ms)
  ✔ removes gitlab (0.641ms)
  ✔ removes slack (0.7217ms)
  ✔ removes stripe (11.9696ms)
  ✔ removes google (10.1885ms)
  ✔ removes sendgrid (2.1326ms)
  ✔ removes npm-token (0.6248ms)
  ✔ removes huggingface (5.0239ms)
  ✔ removes aws-access-key (0.3134ms)
  ✔ removes jwt (0.6648ms)
✔ redact — provider key corpus (92.656ms)
▶ redact — contextual shapes
  ✔ bearer header (0.8472ms)
  ✔ x-api-key header (0.2375ms)
  ✔ connection string password (0.1696ms)
  ✔ uppercase env assignment (0.1903ms)
  ✔ lowercase assignment (0.5756ms)
  ✔ private key block (1.3112ms)
  ✔ entropy blob after a secret keyword (0.5181ms)
✔ redact — contextual shapes (4.6311ms)
▶ redact — safety properties
  ✔ is idempotent (0.4561ms)
  ✔ leaves ordinary text untouched (0.354ms)
  ✔ does not mangle normal code (0.3278ms)
  ✔ handles null and undefined (0.9192ms)
  ✔ handles empty string (0.2202ms)
  ✔ containsSecr

… [25028 characters omitted from the middle — the tail is preserved] …

he SAME model (122.1198ms)
✔ FLT-011/012/013 — redistribution stays within the model class (465.7138ms)
▶ WAR-010 — parent verification is mandatory and complete
  ✔ all seven checks passing accepts (118.5959ms)
  ✔ a subagent's own claim never accepts on its own (72.4765ms)
  ✔ one unmet criterion out of two is a rejection (105.2997ms)
  ✔ out-of-scope writes are rejected (95.1412ms)
  ✔ a protected-path write is rejected (113.6371ms)
  ✔ no diff means the work could not be inspected (121.1599ms)
  ✔ evasions are detected in the diff (57.2087ms)
✔ WAR-010 — parent verification is mandatory and complete (684.8707ms)
▶ detectEvasions
  ✔ catches: +    @pytest.mark.skip (45.8653ms)
  ✔ catches: +  it.skip('x', () => {}) (44.6742ms)
  ✔ catches: +        assert True (34.9406ms)
  ✔ catches: +    raise NotImplementedError (34.5748ms)
  ✔ catches: +  # TODO finish this (35.9891ms)
  ✔ an honest diff is clean (43.4065ms)
  ✔ a removed assertion with no replacement is caught (41.7864ms)
✔ detectEvasions (282.2975ms)
▶ FLT-014/015 — the fleet report
  ✔ a reconciling tally reports clean (35.7568ms)
  ✔ FLT-014 — a mismatch is reported as corruption, not smoothed over (35.7576ms)
  ✔ FLT-015 — a model with zero calls is never reported as used (33.7957ms)
  ✔ the rendered report shows the unavailable model honestly (27.8815ms)
  ✔ FLT-017 — a host without subagents says so instead of claiming a fleet (26.3224ms)
✔ FLT-014/015 — the fleet report (160.1742ms)
▶ no host available
  ✔ dispatch fails with a clear message rather than pretending (29.6983ms)
✔ no host available (29.9098ms)
▶ MCP-001/002/003 — handshake
  ✔ initialize returns serverInfo and only implemented capabilities (16.9052ms)
  ✔ MCP-003 — an unknown protocol version negotiates down to a supported one (2.2034ms)
  ✔ an older supported version is honoured (2.4417ms)
  ✔ notifications get no response (5.0189ms)
  ✔ an unknown method returns a JSON-RPC error, not a crash (3.1359ms)
✔ MCP-001/002/003 — handshake (34.3808ms)
▶ MCP-004 — the tool surface
  ✔ every required tool is listed (14.735ms)
  ✔ every tool has a valid schema and a description that teaches (3.1689ms)
  ✔ apex_req_status describes the legal path and the evidence rule (2.1988ms)
  ✔ an unknown tool returns a rejection naming the real tools (10.0331ms)
✔ MCP-004 — the tool surface (31.4722ms)
▶ MCP-005 — teaching rejections, not exceptions
  ✔ an illegal transition returns a REJECTED message with the recipe (149.7027ms)
  ✔ BLOCKED without a reason is rejected with an explanation (87.6408ms)
  ✔ a rejection is not marked isError — it is a correction (53.4515ms)
✔ MCP-005 — teaching rejections, not exceptions (291.5022ms)
▶ MCP-006 — apex_gate
  ✔ an empty ledger fails the gate with reasons (165.8744ms)
  ✔ the gate names every unmet requirement individually (254.9003ms)
  ✔ a LATER failure supersedes an earlier pass — stale evidence cannot pass the gate (218.5697ms)
  ✔ a claimed VERIFIED_COMPLETE with no evidence is caught by the gate (165.0278ms)
✔ MCP-006 — apex_gate (805.13ms)
▶ MCP-007/008 — resources and prompts
  ✔ all resources are readable (101.7234ms)
  ✔ an unknown resource is an error, not a crash (2.058ms)
  ✔ all prompts are retrievable (115.6799ms)
  ✔ apex-review withholds the author's reasoning (2.179ms)
✔ MCP-007/008 — resources and prompts (222.2841ms)
▶ MCP-009 — malformed input never kills the server
  ✔ survives hostile message 0 (6.777ms)
  ✔ survives hostile message 1 (1.8568ms)
  ✔ survives hostile message 2 (1.5287ms)
  ✔ survives hostile message 3 (5.6684ms)
  ✔ survives hostile message 4 (9.6116ms)
  ✔ survives hostile message 5 (5.2657ms)
  ✔ survives hostile message 6 (13.0121ms)
  ✔ survives hostile message 7 (11.6594ms)
  ✔ survives hostile message 8 (1.7065ms)
  ✔ survives hostile message 9 (2.2099ms)
  ✔ still works after every hostile message (38.6798ms)
✔ MCP-009 — malformed input never kills the server (99.7842ms)
▶ MCP-011 — works with no host server present
  ✔ a full cycle runs on the filesystem alone (227.7814ms)
  ✔ apex_init on an existing ledger loads rather than overwrites (182.2127ms)
  ✔ apex_check blocks a protected path with an explanation (57.7988ms)
  ✔ apex_check reports bulk violations before the command runs (132.4761ms)
  ✔ snapshot and rollback round-trip through the tools (175.8163ms)
  ✔ memory round-trips and dedupes (80.9227ms)
  ✔ handoff is generated from real state (206.1579ms)
✔ MCP-011 — works with no host server present (1064.4058ms)
▶ real stdio subprocess round-trip
  ✔ spawns, initializes, lists tools, and calls one (359.1665ms)
✔ real stdio subprocess round-trip (359.5879ms)
▶ PLG-001 — the plugin loads and exports every hook
  ✔ returns a hook for each declared name (221.8673ms)
  ✔ PLG-015 — writes the level-2 runtime marker (228.8166ms)
  ✔ prefers the worktree over the directory (275.974ms)
  ✔ PLG-016 — the hook list is exported for a doctor diff (60.2213ms)
✔ PLG-001 — the plugin loads and exports every hook (790.1903ms)
▶ PLG-002 — a throw in any hook never breaks the session
  ✔ safe() swallows and logs (95.8586ms)
  ✔ safe() bounds a hanging hook (222.1088ms)
  ✔ every real hook survives a corrupt ledger (214.6971ms)
  ✔ a hook returning undefined is a degraded capability, not a crash (151.7056ms)
✔ PLG-002 — a throw in any hook never breaks the session (685.5149ms)
▶ PLG-003 — the doctrine is injected into every request
  ✔ APEX is prepended, and the host prompt is preserved (132.7482ms)
  ✔ protected paths are stated every turn (100.7886ms)
  ✔ the active requirement appears once one is in progress (221.151ms)
✔ PLG-003 — the doctrine is injected into every request (455.4411ms)
▶ PLG-004 — protected paths are hard-blocked
  ✔ a write to a protected path throws with an explanation (76.8459ms)
  ✔ reading a do_not_read path is blocked (66.7596ms)
  ✔ an ordinary edit proceeds (132.6907ms)
  ✔ GOV-006 — a bulk command reaching a protected path is blocked before it runs (141.2451ms)
  ✔ a bulk command confined to safe files proceeds (214.6828ms)
  ✔ a force push is blocked (91.9057ms)
  ✔ PLG-005 — a risky edit takes a snapshot first (73.0051ms)
  ✔ the intent is recorded for the after-hook (75.9435ms)
✔ PLG-004 — protected paths are hard-blocked (874.4521ms)
▶ PLG-006 — verification lands in the SAME turn as the edit
  ✔ a failing check is appended to the tool output before the model can claim success (981.7971ms)
  ✔ a passing check appends nothing (769.5168ms)
  ✔ a non-edit tool is not verified (35.2453ms)
  ✔ an unknown callID is ignored rather than throwing (30.5534ms)
  ✔ PLG-007 — the real change is recorded in the ledger (706.9931ms)
  ✔ REC-002 — a working command is captured into memory automatically (793.6349ms)
✔ PLG-006 — verification lands in the SAME turn as the edit (3318.3563ms)
▶ PLG-008 — each autonomy mode answers differently
  ✔ MANUAL: an ordinary edit -> ask (35.2303ms)
  ✔ GUARDED: an ordinary edit -> allow (34.3562ms)
  ✔ AUTO: an ordinary edit -> allow (36.7366ms)
  ✔ FULL_AUTO: an ordinary edit -> allow (36.8618ms)
  ✔ a protected path is DENIED in every mode, including FULL_AUTO (36.5564ms)
  ✔ GUARDED asks before a dependency install (32.4856ms)
  ✔ permissionToOperation maps host permission types (32.7182ms)
✔ PLG-008 — each autonomy mode answers differently (245.5857ms)
▶ PLG-009/010 — session lifecycle
  ✔ session.error triggers recovery (36.069ms)
  ✔ a child session is tracked (29.99ms)
  ✔ a top-level session is not tracked as a child (30.3023ms)
  ✔ an edit to a protected path is recorded as a finding (43.1234ms)
  ✔ an ordinary edit event is not a drift (37.7023ms)
  ✔ an unknown event is ignored (32.5443ms)
✔ PLG-009/010 — session lifecycle (210.4289ms)
▶ PLG-011 — constraints survive compaction
  ✔ the anchor carries protected paths and autonomy into the summary (36.9281ms)
✔ PLG-011 — constraints survive compaction (37.1855ms)
▶ PLG-012 — long sessions are re-anchored
  ✔ a short conversation is left alone (28.2206ms)
  ✔ a long conversation gets one anchor inserted before the last message (40.244ms)
✔ PLG-012 — long sessions are re-anchored (68.8224ms)
▶ PLG-013 — temperature by task class
  ✔ planning is warm when nothing is active (39.489ms)
  ✔ editing is cold once a requirement is in progress (38.2213ms)
  ✔ two failures switch to debugging (54.5536ms)
  ✔ the four classes have distinct temperatures (34.0941ms)
✔ PLG-013 — temperature by task class (166.9656ms)
▶ tool classification
  ✔ edit -> write (32.4111ms)
  ✔ write -> write (28.7191ms)
  ✔ patch -> write (32.8754ms)
  ✔ read -> read (31.2859ms)
  ✔ bash -> bash (34.1981ms)
  ✔ webfetch -> network (30.3827ms)
  ✔ edit tools are recognised case-insensitively (30.6917ms)
✔ tool classification (221.0877ms)
▶ companion files
  ✔ agents, commands and skills are all enumerated (36.1652ms)
✔ companion files (36.3533ms)
▶ PLG-017 — hook overhead
  ✔ system.transform stays well under the budget (116.4623ms)
  ✔ tool.execute.before stays fast for an ordinary edit (152.8328ms)
✔ PLG-017 — hook overhead (269.5103ms)
✔ the scan actually found source files (5.14ms)
▶ CORE-005 — every disk write goes through the chokepoint
  ✔ no direct file writes outside json.ts and log.ts (5.1384ms)
✔ CORE-005 — every disk write goes through the chokepoint (5.6544ms)
▶ CORE-009 / INS-011 — no credential handling
  ✔ does not reference ANTHROPIC_API_KEY (2.3262ms)
  ✔ does not reference OPENAI_API_KEY (2.2488ms)
  ✔ does not reference GOOGLE_API_KEY (0.6037ms)
  ✔ does not reference AWS_SECRET_ACCESS_KEY (0.4606ms)
  ✔ does not reference process.env.API_KEY (1.1587ms)
  ✔ never calls an auth endpoint (1.2569ms)
  ✔ no credential prompt (0.9505ms)
✔ CORE-009 / INS-011 — no credential handling (10.4731ms)
▶ GOV-010 — no destructive git commands anywhere
  ✔ source never emits "reset --hard" (1.0562ms)
  ✔ source never emits "clean -fd" (0.6567ms)
  ✔ source never emits "clean -f -d" (0.8885ms)
  ✔ source never emits "push --force" (1.1891ms)
  ✔ source never emits "checkout ." (1.1524ms)
  ✔ governor mentions them only inside its blocklist (4.094ms)
✔ GOV-010 — no destructive git commands anywhere (11.6284ms)
▶ CNC-001 — no hardcoded model or provider identifiers
  ✔ no model name literals (1.4456ms)
  ✔ the model-id pattern still catches a real violation (0.6478ms)
  ✔ no price tables (3.4853ms)
✔ CNC-001 — no hardcoded model or provider identifiers (6.0721ms)
▶ X-004 — no telemetry, no external network
  ✔ no external hostnames (1.0075ms)
  ✔ no analytics identifiers (3.1823ms)
✔ X-004 — no telemetry, no external network (4.5075ms)
▶ VER-012 — the verifier cannot modify tests
  ✔ verifier.ts has no write path (5.3924ms)
✔ VER-012 — the verifier cannot modify tests (7.1079ms)
▶ CNC-006 — no path from a vote to a requirement status
  ✔ council.ts never sets a status (1.0663ms)
✔ CNC-006 — no path from a vote to a requirement status (1.3041ms)
▶ FLT-004 — no code path substitutes a user-named model
  ✔ warden.ts has no automatic model picker (0.8518ms)
✔ FLT-004 — no code path substitutes a user-named model (1.0362ms)
▶ erasable-syntax discipline
  ✔ no TypeScript enums (not erasable — breaks native type stripping) (3.2033ms)
  ✔ no constructor parameter properties (0.7827ms)
  ✔ no namespaces (2.2103ms)
✔ erasable-syntax discipline (6.9938ms)
▶ CORE-003 — dependency discipline
  ✔ package.json declares no runtime dependencies (1.2246ms)
  ✔ source imports only node: builtins and relative paths (5.0721ms)
✔ CORE-003 — dependency discipline (6.611ms)
▶ MCP-001 — stdout is reserved for the protocol
  ✔ only the MCP server writes to stdout (1.0447ms)
✔ MCP-001 — stdout is reserved for the protocol (1.2018ms)
✔ no leftover TODO/FIXME/stub markers in shipped source (1.1465ms)
✔ the exempt detector mentions markers ONLY inside its detection code (2.643ms)
✔ CORPUS sanity: the scan reads real content (0.2454ms)
ℹ tests 609
ℹ suites 136
ℹ pass 609
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 14174.5254

```

### V-006
- **Requirements:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-011
- **Type:** build
- **Command:** `npm run build`
- **Expected:** exit code 0
- **Result:** PASS
- **Exit code:** 0
- **Duration:** 2225
- **Timestamp:** 2026-08-16T01:56:05.014Z
- **Reason:** 

```text

> apex-agent@1.0.0 build
> tsc -p tsconfig.build.json


```

### V-007
- **Requirements:** REQ-005, REQ-008
- **Type:** parse
- **Command:** ``
- **Expected:** —
- **Result:** NOT_RUN
- **Exit code:** null
- **Duration:** 0
- **Timestamp:** 2026-08-16T02:41:31.572Z
- **Reason:** No parse command is configured for this project.

```text

```

### V-008
- **Requirements:** REQ-005, REQ-008
- **Type:** types
- **Command:** `npx tsc --noEmit`
- **Expected:** exit code 0
- **Result:** PASS
- **Exit code:** 0
- **Duration:** 3024
- **Timestamp:** 2026-08-16T02:41:34.611Z
- **Reason:** 

```text

```

### V-009
- **Requirements:** REQ-005, REQ-008
- **Type:** lint
- **Command:** ``
- **Expected:** —
- **Result:** NOT_RUN
- **Exit code:** null
- **Duration:** 0
- **Timestamp:** 2026-08-16T02:41:34.621Z
- **Reason:** No lint command is configured for this project.

```text

```

### V-010
- **Requirements:** REQ-005, REQ-008
- **Type:** unit
- **Command:** ``
- **Expected:** —
- **Result:** NOT_RUN
- **Exit code:** null
- **Duration:** 0
- **Timestamp:** 2026-08-16T02:41:34.630Z
- **Reason:** No unit command is configured for this project.

```text

```

### V-011
- **Requirements:** REQ-005, REQ-008
- **Type:** suite
- **Command:** `npm test`
- **Expected:** exit code 0
- **Result:** PASS
- **Exit code:** 0
- **Duration:** 15953
- **Timestamp:** 2026-08-16T02:41:50.597Z
- **Reason:** 

```text

> apex-agent@1.0.0 test
> node --test --experimental-strip-types "test/**/*.test.ts"

▶ arg parsing
  ✔ parses host and project (111.7098ms)
  ✔ rejects an unknown host with the real list (27.3251ms)
  ✔ detectProjectRoot walks up to a project marker (31.247ms)
✔ arg parsing (172.7171ms)
▶ INS-003 — attach is non-destructive
  ✔ a rich pre-existing config survives untouched (466.7048ms)
  ✔ a deliberate user setting is not overridden (390.577ms)
  ✔ INS-005 — a backup is written byte-for-byte (419.694ms)
  ✔ works when there is no pre-existing config at all (435.0778ms)
✔ INS-003 — attach is non-destructive (1714.4545ms)
▶ INS-004 — Windows paths never break the config
  ✔ every emitted path is JSON-safe and the file re-parses (414.3527ms)
  ✔ emitted paths use forward slashes (383.6873ms)
  ✔ the historical failure mode still reproduces, proving the test is live (11.5155ms)
✔ INS-004 — Windows paths never break the config (810.3146ms)
▶ INS-006/007 — install record and clean detach
  ✔ the record lists exactly what changed (488.6906ms)
  ✔ detach restores the config byte-for-byte (488.605ms)
  ✔ detach removes only what attach created (539.5329ms)
  ✔ detach leaves the project ledger alone (376.4757ms)
  ✔ detach without an install record is a clean error (12.3147ms)
✔ INS-006/007 — install record and clean detach (1906.47ms)
▶ INS-009 — the doctrine payload is installed
  ✔ payload files land in the host config directory (368.6211ms)
  ✔ a pointer file tells any agent where the doctrine is (370.4133ms)
  ✔ the config references the pointer so it loads automatically (392.5776ms)
✔ INS-009 — the doctrine payload is installed (1132.1431ms)
▶ INS-010 — idempotence
  ✔ a second attach is a no-op (1877.4194ms)
✔ INS-010 — idempotence (1877.6742ms)
▶ INS-013 — attach fails atomically
  ✔ a mid-attach failure restores everything and explains (167.5548ms)
✔ INS-013 — attach fails atomically (167.7191ms)
▶ INS-008 — doctor diagnoses seeded breakage
  ✔ reports a healthy install (1113.446ms)
  ✔ state 1 — not attached (774.9359ms)
  ✔ state 2 — invalid JSON in the host config (1201.1276ms)
  ✔ state 3 — installed files went missing (996.7135ms)
  ✔ state 4 — no ledger in the project (967.0296ms)
  ✔ state 5 — no verification commands (887.8434ms)
✔ INS-008 — doctor diagnoses seeded breakage (5941.8264ms)
▶ INS-011/012 — no credentials, no network
  ✔ attach never writes anything credential-shaped (191.6551ms)
  ✔ attach succeeds with no network available (180.2769ms)
✔ INS-011/012 — no credentials, no network (372.1571ms)
▶ PLG-001 — the L2 plugin shim is installed correctly
  ✔ a shim is written, not a copy of the built plugin (182.1524ms)
  ✔ the shim imports a file:// URL, never a bare Windows path (209.5119ms)
  ✔ host companions land in the host's own directories, not inside apex/ (187.8333ms)
  ✔ an L1-only host gets no plugin shim (283.0907ms)
✔ PLG-001 — the L2 plugin shim is installed correctly (862.943ms)
▶ CORE-001 — the published package must actually run
  ✔ ships compiled JavaScript, not raw TypeScript (4.5661ms)
  ✔ a build step exists and prepack runs it (3.4525ms)
  ✔ the bin entry is plain JavaScript (0.7269ms)
  ✔ the bin entry prefers dist and falls back to src (0.9816ms)
  ✔ the compiled build exists and imports .js, never .ts (25.7011ms)
  ✔ the compiled build contains no TypeScript-only syntax (2.1155ms)
  ✔ the doctrine payload is published (0.6949ms)
  ✔ CORE-003 — no runtime dependencies (1.4748ms)
  ✔ the supported Node range is declared (5.8671ms)
✔ CORE-001 — the published package must actually run (76.59ms)
▶ parseJsonLenient
  ✔ plain JSON (67.9615ms)
  ✔ strips a BOM (4.5797ms)
  ✔ strips line comments (6.2908ms)
  ✔ strips block comments (6.6042ms)
  ✔ strips trailing commas (3.0554ms)
  ✔ does NOT strip comment-like text inside strings (2.562ms)
  ✔ throws a useful error on real garbage (4.8648ms)
✔ parseJsonLenient (98.9894ms)
▶ INS-004 — Windows path regression
  ✔ serialiseChecked escapes backslashes and round-trips (25.6225ms)
  ✔ emitted JSON contains no lone backslash escape (32.5541ms)
  ✔ toJsonPath produces forward slashes (29.5412ms)
  ✔ the exact Army-V2 failure is now impossible (49.9598ms)
  ✔ writeJson re-reads and verifies what landed on disk (46.1234ms)
✔ INS-004 — Windows path regression (186.8388ms)
▶ writes are redacted (CORE-005)
  ✔ writeText redacts (22.9329ms)
  ✔ writeJson redacts nested values (33.2107ms)
✔ writes are redacted (CORE-005) (57.736ms)
▶ backup
  ✔ returns null when there is nothing to back up (27.6188ms)
  ✔ copies byte-for-byte (INS-005) (27.1879ms)
✔ backup (55.3256ms)
▶ mergeConfigObjects — INS-003
  ✔ adds absent keys (3.5051ms)
  ✔ LEAVES an existing scalar alone (1.4912ms)
  ✔ unions arrays, existing order first (1.9459ms)
  ✔ does not duplicate an array entry that is already present (1.9428ms)
  ✔ shallow-merges objects with existing winning (2.5971ms)
  ✔ preserves every unknown key byte-for-byte (15.1453ms)
✔ mergeConfigObjects — INS-003 (27.5384ms)
▶ mergeConfigFile
  ✔ merges into a rich pre-existing config and backs it up (116.1258ms)
  ✔ creates the file when absent, with no backup (45.9167ms)
  ✔ tolerates a config with comments and trailing commas (31.924ms)
✔ mergeConfigFile (194.5596ms)
▶ isUnder
  ✔ identity (1.7181ms)
  ✔ direct child (8.1945ms)
  ✔ deep child (0.4858ms)
  ✔ sibling is not under (0.3035ms)
  ✔ parent is not under child (0.9394ms)
  ✔ traversal that escapes is not under (17.1165ms)
  ✔ traversal that returns IS under (0.6232ms)
  ✔ a prefix-sharing sibling directory is not under (2.135ms)
✔ isUnder (39.8027ms)
▶ globMatch
  ✔ config/prod.yaml vs config/prod.yaml -> true (9.4875ms)
  ✔ config/prod.yaml vs config/*.yaml -> true (7.5438ms)
  ✔ config/prod.yaml vs config/ -> true (0.6099ms)
  ✔ config/deep/prod.yaml vs config/ -> true (0.6183ms)
  ✔ config/deep/prod.yaml vs config/*.yaml -> false (2.8758ms)
  ✔ config/deep/prod.yaml vs config/**/*.yaml -> true (10.3289ms)
  ✔ src/a.ts vs **/*.ts -> true (0.3388ms)
  ✔ a.ts vs **/*.ts -> true (0.1799ms)
  ✔ migrations/001.sql vs migrations/ -> true (0.1707ms)
  ✔ src/app.ts vs migrations/ -> false (0.1523ms)
  ✔ file.txt vs file.??? -> true (0.1257ms)
  ✔ file.txtx vs file.??? -> false (0.1272ms)
  ✔ node_modules/x/y.js vs node_modules/ -> true (0.1633ms)
  ✔ src/node_modules_helper.ts vs node_modules/ -> false (0.1477ms)
  ✔ backslash separators are normalised (0.1701ms)
  ✔ dots in the pattern are literal, not wildcards (0.1636ms)
✔ globMatch (34.3951ms)
▶ toJsonPath
  ✔ converts every backslash (0.2515ms)
  ✔ leaves forward slashes alone (0.1393ms)
  ✔ handles UNC prefixes (0.1177ms)
✔ toJsonPath (0.7718ms)
▶ canonicalCase
  ✔ matches the platform convention (0.1927ms)
✔ canonicalCase (0.6009ms)
▶ resolveFrom
  ✔ keeps an absolute path absolute (0.6705ms)
  ✔ resolves a relative path against the root (0.5802ms)
✔ resolveFrom (1.6516ms)
▶ isFilesystemRoot
  ✔ recognises "/" as a root (0.4057ms)
  ✔ recognises "C:/" as a root (0.8013ms)
  ✔ recognises "C:\\" as a root (0.8845ms)
  ✔ recognises "c:\\" as a root (0.2434ms)
  ✔ recognises "//server/share" as a root (0.1486ms)
  ✔ recognises "\\\\server\\share" as a root (0.1301ms)
  ✔ an empty path is treated as a root (0.8185ms)
  ✔ /home/user/project is not a root (2.8887ms)
  ✔ C:/work/app is not a root (5.248ms)
  ✔ ./relative is not a root (0.2248ms)
✔ isFilesystemRoot (13.3261ms)
▶ safeProjectRoot
  ✔ rejects "/" and falls back (4.0401ms)
  ✔ rejects an empty value (5.6447ms)
  ✔ rejects a path that does not exist (0.6575ms)
  ✔ accepts a real directory unchanged (0.4721ms)
  ✔ a drive root never survives, whatever the separator (0.4757ms)
✔ safeProjectRoot (11.8879ms)
▶ redact — provider key corpus
  ✔ removes anthropic (5.3058ms)
  ✔ removes openai (0.377ms)
  ✔ removes openai-classic (0.2343ms)
  ✔ removes github-pat (0.2447ms)
  ✔ removes github-fine (0.1934ms)
  ✔ removes gitlab (0.1867ms)
  ✔ removes slack (0.1603ms)
  ✔ removes stripe (0.1887ms

… [27294 characters omitted from the middle — the tail is preserved] …

sed (30.8325ms)
  ✔ the rendered report shows the unavailable model honestly (37.7426ms)
  ✔ FLT-017 — a host without subagents says so instead of claiming a fleet (28.4177ms)
✔ FLT-014/015 — the fleet report (180.3321ms)
▶ no host available
  ✔ dispatch fails with a clear message rather than pretending (37.4114ms)
✔ no host available (37.6181ms)
▶ MCP-001/002/003 — handshake
  ✔ initialize returns serverInfo and only implemented capabilities (27.2407ms)
  ✔ MCP-003 — an unknown protocol version negotiates down to a supported one (7.4608ms)
  ✔ an older supported version is honoured (2.511ms)
  ✔ notifications get no response (2.168ms)
  ✔ an unknown method returns a JSON-RPC error, not a crash (3.1517ms)
✔ MCP-001/002/003 — handshake (45.8991ms)
▶ MCP-004 — the tool surface
  ✔ every required tool is listed (5.5349ms)
  ✔ every tool has a valid schema and a description that teaches (3.3558ms)
  ✔ apex_req_status describes the legal path and the evidence rule (5.14ms)
  ✔ an unknown tool returns a rejection naming the real tools (36.4005ms)
✔ MCP-004 — the tool surface (51.6463ms)
▶ MCP-005 — teaching rejections, not exceptions
  ✔ an illegal transition returns a REJECTED message with the recipe (161.9588ms)
  ✔ BLOCKED without a reason is rejected with an explanation (110.1277ms)
  ✔ a rejection is not marked isError — it is a correction (108.6481ms)
✔ MCP-005 — teaching rejections, not exceptions (381.3168ms)
▶ MCP-006 — apex_gate
  ✔ an empty ledger fails the gate with reasons (83.4692ms)
  ✔ the gate names every unmet requirement individually (118.0747ms)
  ✔ a LATER failure supersedes an earlier pass — stale evidence cannot pass the gate (237.5641ms)
  ✔ a claimed VERIFIED_COMPLETE with no evidence is caught by the gate (148.3454ms)
✔ MCP-006 — apex_gate (588.2061ms)
▶ MCP-007/008 — resources and prompts
  ✔ all resources are readable (145.7945ms)
  ✔ an unknown resource is an error, not a crash (8.0285ms)
  ✔ all prompts are retrievable (132.5128ms)
  ✔ apex-review withholds the author's reasoning (6.5414ms)
✔ MCP-007/008 — resources and prompts (293.8527ms)
▶ MCP-009 — malformed input never kills the server
  ✔ survives hostile message 0 (4.1226ms)
  ✔ survives hostile message 1 (3.3558ms)
  ✔ survives hostile message 2 (2.5442ms)
  ✔ survives hostile message 3 (5.982ms)
  ✔ survives hostile message 4 (8.0113ms)
  ✔ survives hostile message 5 (8.4677ms)
  ✔ survives hostile message 6 (8.5245ms)
  ✔ survives hostile message 7 (9.4872ms)
  ✔ survives hostile message 8 (1.5634ms)
  ✔ survives hostile message 9 (2.7247ms)
  ✔ still works after every hostile message (31.0811ms)
✔ MCP-009 — malformed input never kills the server (87.4998ms)
▶ MCP-011 — works with no host server present
  ✔ a full cycle runs on the filesystem alone (223.1673ms)
  ✔ apex_init on an existing ledger loads rather than overwrites (72.6127ms)
  ✔ apex_check blocks a protected path with an explanation (49.818ms)
  ✔ apex_check reports bulk violations before the command runs (145.8791ms)
  ✔ snapshot and rollback round-trip through the tools (222.7822ms)
  ✔ memory round-trips and dedupes (96.9845ms)
  ✔ handoff is generated from real state (178.513ms)
✔ MCP-011 — works with no host server present (990.9435ms)
▶ real stdio subprocess round-trip
  ✔ spawns, initializes, lists tools, and calls one (433.9992ms)
✔ real stdio subprocess round-trip (434.7737ms)
▶ MCP-004/010 + PLG-014 — restored after an external scan found them missing
  ✔ the four previously-missing tools exist and are callable (49.7725ms)
  ✔ apex_delegate records the packet even when the host cannot spawn (88.0892ms)
  ✔ apex_council DECLINES routine work (82.8226ms)
  ✔ MCP-010 — a heavy tier returns a task id instead of blocking (114.7301ms)
  ✔ MCP-010 — apex_task_result polls to completion (331.574ms)
  ✔ an unknown task id is a teaching rejection (4.0918ms)
  ✔ PLG-014 — the plugin registers the same tools natively (20.5704ms)
✔ MCP-004/010 + PLG-014 — restored after an external scan found them missing (692.752ms)
▶ PLG-001 — the plugin loads and exports every hook
  ✔ returns a hook for each declared name (296.1327ms)
  ✔ PLG-015 — writes the level-2 runtime marker (127.3861ms)
  ✔ prefers the worktree over the directory (332.0808ms)
  ✔ PLG-016 — the hook list is exported for a doctor diff (167.212ms)
✔ PLG-001 — the plugin loads and exports every hook (927.5305ms)
▶ PLG-002 — a throw in any hook never breaks the session
  ✔ safe() swallows and logs (163.5554ms)
  ✔ safe() bounds a hanging hook (273.6697ms)
  ✔ every real hook survives a corrupt ledger (334.0468ms)
  ✔ a hook returning undefined is a degraded capability, not a crash (186.4768ms)
✔ PLG-002 — a throw in any hook never breaks the session (961.1682ms)
▶ PLG-003 — the doctrine is injected into every request
  ✔ APEX is prepended, and the host prompt is preserved (129.8519ms)
  ✔ protected paths are stated every turn (155.6343ms)
  ✔ the active requirement appears once one is in progress (169.8969ms)
✔ PLG-003 — the doctrine is injected into every request (456.229ms)
▶ PLG-004 — protected paths are hard-blocked
  ✔ a write to a protected path throws with an explanation (135.4447ms)
  ✔ reading a do_not_read path is blocked (103.9459ms)
  ✔ an ordinary edit proceeds (94.6137ms)
  ✔ GOV-006 — a bulk command reaching a protected path is blocked before it runs (106.1575ms)
  ✔ a bulk command confined to safe files proceeds (81.9364ms)
  ✔ a force push is blocked (65.6983ms)
  ✔ PLG-005 — a risky edit takes a snapshot first (107.7531ms)
  ✔ the intent is recorded for the after-hook (97.4973ms)
✔ PLG-004 — protected paths are hard-blocked (794.7463ms)
▶ PLG-006 — verification lands in the SAME turn as the edit
  ✔ a failing check is appended to the tool output before the model can claim success (1014.8803ms)
  ✔ a passing check appends nothing (1104.4483ms)
  ✔ a non-edit tool is not verified (36.9604ms)
  ✔ an unknown callID is ignored rather than throwing (35.6679ms)
  ✔ PLG-007 — the real change is recorded in the ledger (1079.7171ms)
  ✔ REC-002 — a working command is captured into memory automatically (875.3986ms)
✔ PLG-006 — verification lands in the SAME turn as the edit (4147.8671ms)
▶ PLG-008 — each autonomy mode answers differently
  ✔ MANUAL: an ordinary edit -> ask (37.2165ms)
  ✔ GUARDED: an ordinary edit -> allow (32.4376ms)
  ✔ AUTO: an ordinary edit -> allow (38.3024ms)
  ✔ FULL_AUTO: an ordinary edit -> allow (46.5789ms)
  ✔ a protected path is DENIED in every mode, including FULL_AUTO (57.8084ms)
  ✔ GUARDED asks before a dependency install (53.3212ms)
  ✔ permissionToOperation maps host permission types (49.7231ms)
✔ PLG-008 — each autonomy mode answers differently (316.1212ms)
▶ PLG-009/010 — session lifecycle
  ✔ session.error triggers recovery (40.8729ms)
  ✔ a child session is tracked (46.1732ms)
  ✔ a top-level session is not tracked as a child (51.3883ms)
  ✔ an edit to a protected path is recorded as a finding (65.8473ms)
  ✔ an ordinary edit event is not a drift (49.9444ms)
  ✔ an unknown event is ignored (47.9392ms)
✔ PLG-009/010 — session lifecycle (302.8865ms)
▶ PLG-011 — constraints survive compaction
  ✔ the anchor carries protected paths and autonomy into the summary (56.0737ms)
✔ PLG-011 — constraints survive compaction (56.2607ms)
▶ PLG-012 — long sessions are re-anchored
  ✔ a short conversation is left alone (43.1166ms)
  ✔ a long conversation gets one anchor inserted before the last message (49.6698ms)
✔ PLG-012 — long sessions are re-anchored (93.0483ms)
▶ PLG-013 — temperature by task class
  ✔ planning is warm when nothing is active (33.1322ms)
  ✔ editing is cold once a requirement is in progress (39.9245ms)
  ✔ two failures switch to debugging (60.3648ms)
  ✔ the four classes have distinct temperatures (29.9999ms)
✔ PLG-013 — temperature by task class (163.7845ms)
▶ tool classification
  ✔ edit -> write (34.1233ms)
  ✔ write -> write (33.6099ms)
  ✔ patch -> write (35.5838ms)
  ✔ read -> read (32.1265ms)
  ✔ bash -> bash (29.1106ms)
  ✔ webfetch -> network (33.2631ms)
  ✔ edit tools are recognised case-insensitively (36.7044ms)
✔ tool classification (235.1966ms)
▶ companion files
  ✔ agents, commands and skills are all enumerated (33.929ms)
✔ companion files (34.0977ms)
▶ PLG-017 — hook overhead
  ✔ system.transform stays well under the budget (130.8983ms)
  ✔ tool.execute.before stays fast for an ordinary edit (157.0499ms)
✔ PLG-017 — hook overhead (288.2117ms)
▶ PLG-002/PLG-004 — a deliberate block propagates, a failure does not
  ✔ safe() re-throws a BlockedError (32.7641ms)
  ✔ safe() re-throws a block that lost its prototype across a module boundary (31.1917ms)
  ✔ safe() still swallows a genuine bug (35.0209ms)
  ✔ safe() still swallows a timeout (156.5331ms)
  ✔ isDeliberateBlock discriminates correctly (50.553ms)
  ✔ END TO END: the wrapped hook actually blocks a protected write (44.8075ms)
  ✔ END TO END: the wrapped hook still allows an ordinary edit (46.1586ms)
✔ PLG-002/PLG-004 — a deliberate block propagates, a failure does not (398.0526ms)
✔ the scan actually found source files (2.2405ms)
▶ CORE-005 — every disk write goes through the chokepoint
  ✔ no direct file writes outside json.ts and log.ts (4.7711ms)
✔ CORE-005 — every disk write goes through the chokepoint (5.7026ms)
▶ CORE-009 / INS-011 — no credential handling
  ✔ does not reference ANTHROPIC_API_KEY (1.0727ms)
  ✔ does not reference OPENAI_API_KEY (0.6422ms)
  ✔ does not reference GOOGLE_API_KEY (0.4119ms)
  ✔ does not reference AWS_SECRET_ACCESS_KEY (0.3726ms)
  ✔ does not reference process.env.API_KEY (0.6901ms)
  ✔ never calls an auth endpoint (0.7496ms)
  ✔ no credential prompt (1.8237ms)
✔ CORE-009 / INS-011 — no credential handling (7.5755ms)
▶ GOV-010 — no destructive git commands anywhere
  ✔ source never emits "reset --hard" (1.2389ms)
  ✔ source never emits "clean -fd" (0.4943ms)
  ✔ source never emits "clean -f -d" (0.3417ms)
  ✔ source never emits "push --force" (0.4088ms)
  ✔ source never emits "checkout ." (0.3978ms)
  ✔ governor mentions them only inside its blocklist (0.4834ms)
✔ GOV-010 — no destructive git commands anywhere (3.9067ms)
▶ CNC-001 — no hardcoded model or provider identifiers
  ✔ no model name literals (1.3109ms)
  ✔ the model-id pattern still catches a real violation (0.3122ms)
  ✔ no price tables (1.6776ms)
✔ CNC-001 — no hardcoded model or provider identifiers (3.6458ms)
▶ X-004 — no telemetry, no external network
  ✔ no external hostnames (1.0693ms)
  ✔ no analytics identifiers (2.7725ms)
✔ X-004 — no telemetry, no external network (4.2207ms)
▶ VER-012 — the verifier cannot modify tests
  ✔ verifier.ts has no write path (0.6099ms)
✔ VER-012 — the verifier cannot modify tests (0.9501ms)
▶ CNC-006 — no path from a vote to a requirement status
  ✔ council.ts never sets a status (0.464ms)
✔ CNC-006 — no path from a vote to a requirement status (0.679ms)
▶ FLT-004 — no code path substitutes a user-named model
  ✔ warden.ts has no automatic model picker (0.4897ms)
✔ FLT-004 — no code path substitutes a user-named model (0.6164ms)
▶ erasable-syntax discipline
  ✔ no TypeScript enums (not erasable — breaks native type stripping) (1.8966ms)
  ✔ no constructor parameter properties (0.8546ms)
  ✔ no namespaces (2.2945ms)
✔ erasable-syntax discipline (5.7005ms)
▶ CORE-003 — dependency discipline
  ✔ package.json declares no runtime dependencies (1.5131ms)
  ✔ source imports only node: builtins and relative paths (2.9836ms)
✔ CORE-003 — dependency discipline (4.8333ms)
▶ MCP-001 — stdout is reserved for the protocol
  ✔ only the MCP server writes to stdout (0.8174ms)
✔ MCP-001 — stdout is reserved for the protocol (0.9736ms)
✔ no leftover TODO/FIXME/stub markers in shipped source (0.7127ms)
✔ the exempt detector mentions markers ONLY inside its detection code (1.9112ms)
✔ CORPUS sanity: the scan reads real content (0.3974ms)
ℹ tests 640
ℹ suites 141
ℹ pass 640
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 15403.3975

```

### V-012
- **Requirements:** REQ-005, REQ-008
- **Type:** build
- **Command:** `npm run build`
- **Expected:** exit code 0
- **Result:** PASS
- **Exit code:** 0
- **Duration:** 2348
- **Timestamp:** 2026-08-16T02:41:52.957Z
- **Reason:** 

```text

> apex-agent@1.0.0 build
> tsc -p tsconfig.build.json


```

### V-013
- **Requirements:** REQ-005, REQ-008
- **Type:** parse
- **Command:** ``
- **Expected:** —
- **Result:** NOT_RUN
- **Exit code:** null
- **Duration:** 0
- **Timestamp:** 2026-08-16T03:14:18.157Z
- **Reason:** No parse command is configured for this project.

```text

```

### V-014
- **Requirements:** REQ-005, REQ-008
- **Type:** types
- **Command:** `npx tsc --noEmit`
- **Expected:** exit code 0
- **Result:** PASS
- **Exit code:** 0
- **Duration:** 3071
- **Timestamp:** 2026-08-16T03:14:21.246Z
- **Reason:** 

```text

```

### V-015
- **Requirements:** REQ-005, REQ-008
- **Type:** lint
- **Command:** ``
- **Expected:** —
- **Result:** NOT_RUN
- **Exit code:** null
- **Duration:** 0
- **Timestamp:** 2026-08-16T03:14:21.258Z
- **Reason:** No lint command is configured for this project.

```text

```

### V-016
- **Requirements:** REQ-005, REQ-008
- **Type:** unit
- **Command:** ``
- **Expected:** —
- **Result:** NOT_RUN
- **Exit code:** null
- **Duration:** 0
- **Timestamp:** 2026-08-16T03:14:21.269Z
- **Reason:** No unit command is configured for this project.

```text

```

### V-017
- **Requirements:** REQ-005, REQ-008
- **Type:** suite
- **Command:** `npm test`
- **Expected:** exit code 0
- **Result:** PASS
- **Exit code:** 0
- **Duration:** 16832
- **Timestamp:** 2026-08-16T03:14:38.117Z
- **Reason:** 

```text

> apex-agent@1.0.0 test
> node --test --experimental-strip-types "test/**/*.test.ts"

▶ arg parsing
  ✔ parses host and project (69.6497ms)
  ✔ rejects an unknown host with the real list (49.1206ms)
  ✔ detectProjectRoot walks up to a project marker (50.9154ms)
✔ arg parsing (172.5058ms)
▶ INS-003 — attach is non-destructive
  ✔ a rich pre-existing config survives untouched (594.7183ms)
  ✔ a deliberate user setting is not overridden (399.4931ms)
  ✔ INS-005 — a backup is written byte-for-byte (430.3153ms)
  ✔ works when there is no pre-existing config at all (412.9662ms)
✔ INS-003 — attach is non-destructive (1838.5008ms)
▶ INS-004 — Windows paths never break the config
  ✔ every emitted path is JSON-safe and the file re-parses (419.2564ms)
  ✔ emitted paths use forward slashes (385.7849ms)
  ✔ the historical failure mode still reproduces, proving the test is live (13.3733ms)
✔ INS-004 — Windows paths never break the config (819.3634ms)
▶ INS-006/007 — install record and clean detach
  ✔ the record lists exactly what changed (391.6984ms)
  ✔ detach restores the config byte-for-byte (487.0587ms)
  ✔ detach removes only what attach created (408.9305ms)
  ✔ detach leaves the project ledger alone (407.1265ms)
  ✔ detach without an install record is a clean error (12.5518ms)
✔ INS-006/007 — install record and clean detach (1708.284ms)
▶ INS-009 — the doctrine payload is installed
  ✔ payload files land in the host config directory (453.8549ms)
  ✔ a pointer file tells any agent where the doctrine is (469.5873ms)
  ✔ the config references the pointer so it loads automatically (381.8888ms)
✔ INS-009 — the doctrine payload is installed (1305.8611ms)
▶ INS-010 — idempotence
  ✔ a second attach is a no-op (1685.1879ms)
✔ INS-010 — idempotence (1685.4264ms)
▶ INS-013 — attach fails atomically
  ✔ a mid-attach failure restores everything and explains (161.348ms)
✔ INS-013 — attach fails atomically (161.52ms)
▶ INS-008 — doctor diagnoses seeded breakage
  ✔ reports a healthy install (838.2546ms)
  ✔ state 1 — not attached (689.0757ms)
  ✔ state 2 — invalid JSON in the host config (869.8395ms)
  ✔ state 3 — installed files went missing (889.2747ms)
  ✔ state 4 — no ledger in the project (891.5309ms)
  ✔ state 5 — no verification commands (783.2529ms)
✔ INS-008 — doctor diagnoses seeded breakage (4961.9306ms)
▶ INS-011/012 — no credentials, no network
  ✔ attach never writes anything credential-shaped (177.6356ms)
  ✔ attach succeeds with no network available (169.19ms)
✔ INS-011/012 — no credentials, no network (347.0268ms)
▶ PLG-001 — the L2 plugin shim is installed correctly
  ✔ a shim is written, not a copy of the built plugin (171.8757ms)
  ✔ the shim imports a file:// URL, never a bare Windows path (171.7999ms)
  ✔ host companions land in the host's own directories, not inside apex/ (181.3569ms)
  ✔ an L1-only host gets no plugin shim (168.5168ms)
✔ PLG-001 — the L2 plugin shim is installed correctly (694.0743ms)
▶ INS-001 — attach touches ONE host unless told otherwise
  ✔ attaches only to the deepest host and names the rest (634.5522ms)
  ✔ the untouched hosts really are untouched (651.4935ms)
  ✔ --all-hosts opts back in (680.3969ms)
  ✔ --host targets exactly one, even with several present (169.0091ms)
✔ INS-001 — attach touches ONE host unless told otherwise (2135.7999ms)
▶ CORE-001 — the published package must actually run
  ✔ ships compiled JavaScript, not raw TypeScript (14.0291ms)
  ✔ a build step exists and prepack runs it (0.5244ms)
  ✔ the bin entry is plain JavaScript (0.5277ms)
  ✔ the bin entry prefers dist and falls back to src (0.7402ms)
  ✔ the compiled build exists and imports .js, never .ts (45.6305ms)
  ✔ the compiled build contains no TypeScript-only syntax (0.9629ms)
  ✔ the doctrine payload is published (0.5418ms)
  ✔ CORE-003 — no runtime dependencies (1.8483ms)
  ✔ the supported Node range is declared (2.5829ms)
✔ CORE-001 — the published package must actually run (70.5225ms)
▶ payload integrity
  ✔ the payload exists and has real content (1.9411ms)
  ✔ nothing references a directory that does not ship (3.1465ms)
  ✔ every relative markdown link inside the payload resolves (1.8437ms)
  ✔ the payload is in sync with the doctrine source (117.6333ms)
  ✔ host companions ship for the L2 install (1.3381ms)
  ✔ the payload names no machine-specific path (2.2767ms)
✔ payload integrity (132.3727ms)
▶ parseJsonLenient
  ✔ plain JSON (34.1877ms)
  ✔ strips a BOM (2.8823ms)
  ✔ strips line comments (2.295ms)
  ✔ strips block comments (3.5787ms)
  ✔ strips trailing commas (8.3575ms)
  ✔ does NOT strip comment-like text inside strings (2.129ms)
  ✔ throws a useful error on real garbage (2.9493ms)
✔ parseJsonLenient (59.7634ms)
▶ INS-004 — Windows path regression
  ✔ serialiseChecked escapes backslashes and round-trips (28.7651ms)
  ✔ emitted JSON contains no lone backslash escape (4.7448ms)
  ✔ toJsonPath produces forward slashes (2.1762ms)
  ✔ the exact Army-V2 failure is now impossible (22.6276ms)
  ✔ writeJson re-reads and verifies what landed on disk (16.1212ms)
✔ INS-004 — Windows path regression (75.5071ms)
▶ writes are redacted (CORE-005)
  ✔ writeText redacts (8.9196ms)
  ✔ writeJson redacts nested values (45.9852ms)
✔ writes are redacted (CORE-005) (55.4745ms)
▶ backup
  ✔ returns null when there is nothing to back up (4.3481ms)
  ✔ copies byte-for-byte (INS-005) (21.0669ms)
✔ backup (25.9473ms)
▶ mergeConfigObjects — INS-003
  ✔ adds absent keys (3.2495ms)
  ✔ LEAVES an existing scalar alone (1.8213ms)
  ✔ unions arrays, existing order first (1.7149ms)
  ✔ does not duplicate an array entry that is already present (2.247ms)
  ✔ shallow-merges objects with existing winning (1.8383ms)
  ✔ preserves every unknown key byte-for-byte (2.2258ms)
✔ mergeConfigObjects — INS-003 (14.742ms)
▶ mergeConfigFile
  ✔ merges into a rich pre-existing config and backs it up (40.1167ms)
  ✔ creates the file when absent, with no backup (27.3121ms)
  ✔ tolerates a config with comments and trailing commas (20.9106ms)
✔ mergeConfigFile (88.923ms)
▶ isUnder
  ✔ identity (1.5989ms)
  ✔ direct child (0.493ms)
  ✔ deep child (0.3894ms)
  ✔ sibling is not under (0.3347ms)
  ✔ parent is not under child (0.3647ms)
  ✔ traversal that escapes is not under (0.3628ms)
  ✔ traversal that returns IS under (0.3502ms)
  ✔ a prefix-sharing sibling directory is not under (0.3531ms)
✔ isUnder (6.8271ms)
▶ globMatch
  ✔ config/prod.yaml vs config/prod.yaml -> true (1.1391ms)
  ✔ config/prod.yaml vs config/*.yaml -> true (0.7735ms)
  ✔ config/prod.yaml vs config/ -> true (0.4894ms)
  ✔ config/deep/prod.yaml vs config/ -> true (0.2559ms)
  ✔ config/deep/prod.yaml vs config/*.yaml -> false (0.2246ms)
  ✔ config/deep/prod.yaml vs config/**/*.yaml -> true (0.1966ms)
  ✔ src/a.ts vs **/*.ts -> true (0.1904ms)
  ✔ a.ts vs **/*.ts -> true (0.1547ms)
  ✔ migrations/001.sql vs migrations/ -> true (0.1426ms)
  ✔ src/app.ts vs migrations/ -> false (0.1312ms)
  ✔ file.txt vs file.??? -> true (0.1121ms)
  ✔ file.txtx vs file.??? -> false (0.1067ms)
  ✔ node_modules/x/y.js vs node_modules/ -> true (0.1314ms)
  ✔ src/node_modules_helper.ts vs node_modules/ -> false (0.1414ms)
  ✔ backslash separators are normalised (0.1654ms)
  ✔ dots in the pattern are literal, not wildcards (0.1936ms)
✔ globMatch (5.7239ms)
▶ toJsonPath
  ✔ converts every backslash (0.2933ms)
  ✔ leaves forward slashes alone (0.1323ms)
  ✔ handles UNC prefixes (0.119ms)
✔ toJsonPath (0.8032ms)
▶ canonicalCase
  ✔ matches the platform convention (0.1392ms)
✔ canonicalCase (0.2382ms)
▶ resolveFrom
  ✔ keeps an absolute path absolute (0.2436ms)
  ✔ resolves a relative path against the root (0.1826ms)
✔ resolveFrom (0.6267ms)
▶ isFilesystemRoot
  ✔ recognises "/" as a root (0.3672ms)
  ✔ recognises "C:/" as a root (0.1951ms)
  ✔ recognises "C:\\" as a root (0.1432ms)
  ✔ recognises "c:\\" as a root (0.0803ms)
  ✔ recognises "//server/share" as a root (0.1382ms)
  ✔ recognises "\\\\server\\share" as a root (0.17ms)
  ✔ an empty

… [28495 characters omitted from the middle — the tail is preserved] …

apabilities (20.7031ms)
  ✔ MCP-003 — an unknown protocol version negotiates down to a supported one (9.5169ms)
  ✔ an older supported version is honoured (9.3531ms)
  ✔ notifications get no response (5.8086ms)
  ✔ an unknown method returns a JSON-RPC error, not a crash (8.9861ms)
✔ MCP-001/002/003 — handshake (58.2293ms)
▶ MCP-004 — the tool surface
  ✔ every required tool is listed (13.4324ms)
  ✔ every tool has a valid schema and a description that teaches (4.9707ms)
  ✔ apex_req_status describes the legal path and the evidence rule (11.3143ms)
  ✔ an unknown tool returns a rejection naming the real tools (17.2308ms)
✔ MCP-004 — the tool surface (51.0512ms)
▶ MCP-005 — teaching rejections, not exceptions
  ✔ an illegal transition returns a REJECTED message with the recipe (153.4856ms)
  ✔ BLOCKED without a reason is rejected with an explanation (79.4084ms)
  ✔ a rejection is not marked isError — it is a correction (72.2784ms)
✔ MCP-005 — teaching rejections, not exceptions (305.7258ms)
▶ MCP-006 — apex_gate
  ✔ an empty ledger fails the gate with reasons (95.1238ms)
  ✔ the gate names every unmet requirement individually (220.5907ms)
  ✔ a LATER failure supersedes an earlier pass — stale evidence cannot pass the gate (300.4354ms)
  ✔ a claimed VERIFIED_COMPLETE with no evidence is caught by the gate (168.3374ms)
✔ MCP-006 — apex_gate (785.3846ms)
▶ MCP-007/008 — resources and prompts
  ✔ all resources are readable (306.7056ms)
  ✔ an unknown resource is an error, not a crash (3.534ms)
  ✔ all prompts are retrievable (171.5984ms)
  ✔ apex-review withholds the author's reasoning (2.8693ms)
✔ MCP-007/008 — resources and prompts (487.1163ms)
▶ MCP-009 — malformed input never kills the server
  ✔ survives hostile message 0 (3.8834ms)
  ✔ survives hostile message 1 (2.0875ms)
  ✔ survives hostile message 2 (1.6299ms)
  ✔ survives hostile message 3 (4.3685ms)
  ✔ survives hostile message 4 (8.5343ms)
  ✔ survives hostile message 5 (4.6984ms)
  ✔ survives hostile message 6 (13.902ms)
  ✔ survives hostile message 7 (11.9896ms)
  ✔ survives hostile message 8 (2.2732ms)
  ✔ survives hostile message 9 (1.7738ms)
  ✔ still works after every hostile message (36.3696ms)
✔ MCP-009 — malformed input never kills the server (93.3174ms)
▶ MCP-011 — works with no host server present
  ✔ a full cycle runs on the filesystem alone (222.025ms)
  ✔ apex_init on an existing ledger loads rather than overwrites (152.1336ms)
  ✔ apex_check blocks a protected path with an explanation (143.7459ms)
  ✔ apex_check reports bulk violations before the command runs (131.8505ms)
  ✔ snapshot and rollback round-trip through the tools (97.0945ms)
  ✔ memory round-trips and dedupes (142.856ms)
  ✔ handoff is generated from real state (167.8971ms)
✔ MCP-011 — works with no host server present (1059.5795ms)
▶ real stdio subprocess round-trip
  ✔ spawns, initializes, lists tools, and calls one (435.7313ms)
✔ real stdio subprocess round-trip (436.1446ms)
▶ MCP-004/010 + PLG-014 — restored after an external scan found them missing
  ✔ the four previously-missing tools exist and are callable (49.6622ms)
  ✔ apex_delegate records the packet even when the host cannot spawn (71.5857ms)
  ✔ apex_council DECLINES routine work (76.4318ms)
  ✔ MCP-010 — a heavy tier returns a task id instead of blocking (172.1177ms)
  ✔ MCP-010 — apex_task_result polls to completion (344.9202ms)
  ✔ an unknown task id is a teaching rejection (3.1872ms)
  ✔ PLG-014 — the plugin registers the same tools natively (14.1914ms)
✔ MCP-004/010 + PLG-014 — restored after an external scan found them missing (733.155ms)
▶ apex_models — FLT-004 pre-dispatch check
  ✔ returns a catalog and never suggests a substitute (34.865ms)
  ✔ is declared in the tool list (1.1469ms)
✔ apex_models — FLT-004 pre-dispatch check (36.2265ms)
▶ doc/code agreement — the mirror of the dropped-requirements bug
  ✔ no tool is documented in MCP-SERVER.md that the code does not implement (2.0847ms)
✔ doc/code agreement — the mirror of the dropped-requirements bug (2.2056ms)
▶ PLG-001 — the plugin loads and exports every hook
  ✔ returns a hook for each declared name (139.2274ms)
  ✔ PLG-015 — writes the level-2 runtime marker (181.0112ms)
  ✔ prefers the worktree over the directory (157.7277ms)
  ✔ PLG-016 — the hook list is exported for a doctor diff (126.2413ms)
✔ PLG-001 — the plugin loads and exports every hook (607.8091ms)
▶ PLG-002 — a throw in any hook never breaks the session
  ✔ safe() swallows and logs (174.5375ms)
  ✔ safe() bounds a hanging hook (248.6015ms)
  ✔ every real hook survives a corrupt ledger (280.9176ms)
  ✔ a hook returning undefined is a degraded capability, not a crash (151.8353ms)
✔ PLG-002 — a throw in any hook never breaks the session (857.0739ms)
▶ PLG-003 — the doctrine is injected into every request
  ✔ APEX is prepended, and the host prompt is preserved (125.7204ms)
  ✔ protected paths are stated every turn (122.8118ms)
  ✔ the active requirement appears once one is in progress (93.1643ms)
✔ PLG-003 — the doctrine is injected into every request (343.5197ms)
▶ PLG-004 — protected paths are hard-blocked
  ✔ a write to a protected path throws with an explanation (63.5695ms)
  ✔ reading a do_not_read path is blocked (94.4855ms)
  ✔ an ordinary edit proceeds (99.6829ms)
  ✔ GOV-006 — a bulk command reaching a protected path is blocked before it runs (129.6141ms)
  ✔ a bulk command confined to safe files proceeds (84.8843ms)
  ✔ a force push is blocked (56.3646ms)
  ✔ PLG-005 — a risky edit takes a snapshot first (67.1227ms)
  ✔ the intent is recorded for the after-hook (134.3925ms)
✔ PLG-004 — protected paths are hard-blocked (731.4029ms)
▶ PLG-006 — verification lands in the SAME turn as the edit
  ✔ a failing check is appended to the tool output before the model can claim success (891.7644ms)
  ✔ a passing check appends nothing (768.9831ms)
  ✔ a non-edit tool is not verified (37.477ms)
  ✔ an unknown callID is ignored rather than throwing (33.4712ms)
  ✔ PLG-007 — the real change is recorded in the ledger (696.9994ms)
  ✔ REC-002 — a working command is captured into memory automatically (800.3747ms)
✔ PLG-006 — verification lands in the SAME turn as the edit (3229.7905ms)
▶ PLG-008 — each autonomy mode answers differently
  ✔ MANUAL: an ordinary edit -> ask (33.1951ms)
  ✔ GUARDED: an ordinary edit -> allow (31.9658ms)
  ✔ AUTO: an ordinary edit -> allow (37.0918ms)
  ✔ FULL_AUTO: an ordinary edit -> allow (34.4858ms)
  ✔ a protected path is DENIED in every mode, including FULL_AUTO (38.9255ms)
  ✔ GUARDED asks before a dependency install (32.7727ms)
  ✔ permissionToOperation maps host permission types (34.9217ms)
✔ PLG-008 — each autonomy mode answers differently (243.973ms)
▶ PLG-009/010 — session lifecycle
  ✔ session.error triggers recovery (37.3569ms)
  ✔ a child session is tracked (32.1864ms)
  ✔ a top-level session is not tracked as a child (30.883ms)
  ✔ an edit to a protected path is recorded as a finding (39.1652ms)
  ✔ an ordinary edit event is not a drift (31.831ms)
  ✔ an unknown event is ignored (31.5785ms)
✔ PLG-009/010 — session lifecycle (203.4793ms)
▶ PLG-011 — constraints survive compaction
  ✔ the anchor carries protected paths and autonomy into the summary (33.0191ms)
✔ PLG-011 — constraints survive compaction (33.1684ms)
▶ PLG-012 — long sessions are re-anchored
  ✔ a short conversation is left alone (38.3991ms)
  ✔ a long conversation gets one anchor inserted before the last message (38.7199ms)
✔ PLG-012 — long sessions are re-anchored (77.3617ms)
▶ PLG-013 — temperature by task class
  ✔ planning is warm when nothing is active (32.3348ms)
  ✔ editing is cold once a requirement is in progress (42.5133ms)
  ✔ two failures switch to debugging (64.7143ms)
  ✔ the four classes have distinct temperatures (31.6197ms)
✔ PLG-013 — temperature by task class (171.5549ms)
▶ tool classification
  ✔ edit -> write (33.8785ms)
  ✔ write -> write (32.7124ms)
  ✔ patch -> write (32.2937ms)
  ✔ read -> read (38.9719ms)
  ✔ bash -> bash (32.0647ms)
  ✔ webfetch -> network (31.8406ms)
  ✔ edit tools are recognised case-insensitively (33.4761ms)
✔ tool classification (235.7647ms)
▶ companion files
  ✔ agents, commands and skills are all enumerated (33.8034ms)
✔ companion files (33.9862ms)
▶ PLG-017 — hook overhead
  ✔ system.transform stays well under the budget (119.5078ms)
  ✔ tool.execute.before stays fast for an ordinary edit (160.5408ms)
✔ PLG-017 — hook overhead (280.2709ms)
▶ PLG-002/PLG-004 — a deliberate block propagates, a failure does not
  ✔ safe() re-throws a BlockedError (31.6408ms)
  ✔ safe() re-throws a block that lost its prototype across a module boundary (31.4793ms)
  ✔ safe() still swallows a genuine bug (31.4077ms)
  ✔ safe() still swallows a timeout (169.4082ms)
  ✔ isDeliberateBlock discriminates correctly (38.4206ms)
  ✔ END TO END: the wrapped hook actually blocks a protected write (35.7051ms)
  ✔ END TO END: the wrapped hook still allows an ordinary edit (39.1671ms)
✔ PLG-002/PLG-004 — a deliberate block propagates, a failure does not (377.7898ms)
✔ the scan actually found source files (2.7806ms)
▶ CORE-005 — every disk write goes through the chokepoint
  ✔ no direct file writes outside json.ts and log.ts (4.8306ms)
✔ CORE-005 — every disk write goes through the chokepoint (6.092ms)
▶ CORE-009 / INS-011 — no credential handling
  ✔ does not reference ANTHROPIC_API_KEY (1.2483ms)
  ✔ does not reference OPENAI_API_KEY (2.8128ms)
  ✔ does not reference GOOGLE_API_KEY (0.6939ms)
  ✔ does not reference AWS_SECRET_ACCESS_KEY (0.3567ms)
  ✔ does not reference process.env.API_KEY (1.628ms)
  ✔ never calls an auth endpoint (1.0254ms)
  ✔ no credential prompt (2.9274ms)
✔ CORE-009 / INS-011 — no credential handling (12.5956ms)
▶ GOV-010 — no destructive git commands anywhere
  ✔ source never emits "reset --hard" (1.0441ms)
  ✔ source never emits "clean -fd" (0.4951ms)
  ✔ source never emits "clean -f -d" (0.4554ms)
  ✔ source never emits "push --force" (0.6129ms)
  ✔ source never emits "checkout ." (0.5178ms)
  ✔ governor mentions them only inside its blocklist (0.5004ms)
✔ GOV-010 — no destructive git commands anywhere (4.1727ms)
▶ CNC-001 — no hardcoded model or provider identifiers
  ✔ no model name literals (1.476ms)
  ✔ the model-id pattern still catches a real violation (0.2685ms)
  ✔ no price tables (2.8172ms)
✔ CNC-001 — no hardcoded model or provider identifiers (5.1021ms)
▶ X-004 — no telemetry, no external network
  ✔ no external hostnames (0.743ms)
  ✔ no analytics identifiers (2.4344ms)
✔ X-004 — no telemetry, no external network (3.4474ms)
▶ VER-012 — the verifier cannot modify tests
  ✔ verifier.ts has no write path (0.7587ms)
✔ VER-012 — the verifier cannot modify tests (0.9483ms)
▶ CNC-006 — no path from a vote to a requirement status
  ✔ council.ts never sets a status (0.8729ms)
✔ CNC-006 — no path from a vote to a requirement status (1.0475ms)
▶ FLT-004 — no code path substitutes a user-named model
  ✔ warden.ts has no automatic model picker (0.8883ms)
✔ FLT-004 — no code path substitutes a user-named model (1.0324ms)
▶ erasable-syntax discipline
  ✔ no TypeScript enums (not erasable — breaks native type stripping) (1.8438ms)
  ✔ no constructor parameter properties (1.1709ms)
  ✔ no namespaces (1.7864ms)
✔ erasable-syntax discipline (5.535ms)
▶ CORE-003 — dependency discipline
  ✔ package.json declares no runtime dependencies (4.3922ms)
  ✔ source imports only node: builtins and relative paths (0.9113ms)
✔ CORE-003 — dependency discipline (5.7189ms)
▶ MCP-001 — stdout is reserved for the protocol
  ✔ only the MCP server writes to stdout (0.72ms)
✔ MCP-001 — stdout is reserved for the protocol (0.8601ms)
✔ no leftover TODO/FIXME/stub markers in shipped source (0.7284ms)
✔ the exempt detector mentions markers ONLY inside its detection code (3.4889ms)
✔ CORPUS sanity: the scan reads real content (0.207ms)
ℹ tests 653
ℹ suites 145
ℹ pass 653
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 16267.9825

```

### V-018
- **Requirements:** REQ-005, REQ-008
- **Type:** parse
- **Command:** ``
- **Expected:** —
- **Result:** NOT_RUN
- **Exit code:** null
- **Duration:** 0
- **Timestamp:** 2026-08-16T03:14:38.298Z
- **Reason:** No parse command is configured for this project.

```text

```

### V-019
- **Requirements:** REQ-005, REQ-008
- **Type:** types
- **Command:** `npx tsc --noEmit`
- **Expected:** exit code 0
- **Result:** PASS
- **Exit code:** 0
- **Duration:** 3113
- **Timestamp:** 2026-08-16T03:14:41.423Z
- **Reason:** 

```text

```

### V-020
- **Requirements:** REQ-005, REQ-008
- **Type:** lint
- **Command:** ``
- **Expected:** —
- **Result:** NOT_RUN
- **Exit code:** null
- **Duration:** 0
- **Timestamp:** 2026-08-16T03:14:41.436Z
- **Reason:** No lint command is configured for this project.

```text

```

### V-021
- **Requirements:** REQ-005, REQ-008
- **Type:** unit
- **Command:** ``
- **Expected:** —
- **Result:** NOT_RUN
- **Exit code:** null
- **Duration:** 0
- **Timestamp:** 2026-08-16T03:14:41.446Z
- **Reason:** No unit command is configured for this project.

```text

```

### V-022
- **Requirements:** REQ-005, REQ-008
- **Type:** suite
- **Command:** `npm test`
- **Expected:** exit code 0
- **Result:** PASS
- **Exit code:** 0
- **Duration:** 17403
- **Timestamp:** 2026-08-16T03:14:58.866Z
- **Reason:** 

```text

> apex-agent@1.0.0 test
> node --test --experimental-strip-types "test/**/*.test.ts"

▶ arg parsing
  ✔ parses host and project (43.3713ms)
  ✔ rejects an unknown host with the real list (17.1988ms)
  ✔ detectProjectRoot walks up to a project marker (37.0381ms)
✔ arg parsing (100.5164ms)
▶ INS-003 — attach is non-destructive
  ✔ a rich pre-existing config survives untouched (526.3724ms)
  ✔ a deliberate user setting is not overridden (470.7514ms)
  ✔ INS-005 — a backup is written byte-for-byte (430.4852ms)
  ✔ works when there is no pre-existing config at all (423.741ms)
✔ INS-003 — attach is non-destructive (1853.1892ms)
▶ INS-004 — Windows paths never break the config
  ✔ every emitted path is JSON-safe and the file re-parses (473.5578ms)
  ✔ emitted paths use forward slashes (370.3706ms)
  ✔ the historical failure mode still reproduces, proving the test is live (15.422ms)
✔ INS-004 — Windows paths never break the config (860.1356ms)
▶ INS-006/007 — install record and clean detach
  ✔ the record lists exactly what changed (391.8529ms)
  ✔ detach restores the config byte-for-byte (484.0679ms)
  ✔ detach removes only what attach created (438.2131ms)
  ✔ detach leaves the project ledger alone (559.2282ms)
  ✔ detach without an install record is a clean error (12.1723ms)
✔ INS-006/007 — install record and clean detach (1886.387ms)
▶ INS-009 — the doctrine payload is installed
  ✔ payload files land in the host config directory (408.3158ms)
  ✔ a pointer file tells any agent where the doctrine is (369.4195ms)
  ✔ the config references the pointer so it loads automatically (374.0092ms)
✔ INS-009 — the doctrine payload is installed (1152.3613ms)
▶ INS-010 — idempotence
  ✔ a second attach is a no-op (1982.9598ms)
✔ INS-010 — idempotence (1983.2762ms)
▶ INS-013 — attach fails atomically
  ✔ a mid-attach failure restores everything and explains (235.7739ms)
✔ INS-013 — attach fails atomically (236.0599ms)
▶ INS-008 — doctor diagnoses seeded breakage
  ✔ reports a healthy install (862.9436ms)
  ✔ state 1 — not attached (686.1285ms)
  ✔ state 2 — invalid JSON in the host config (853.292ms)
  ✔ state 3 — installed files went missing (879.7267ms)
  ✔ state 4 — no ledger in the project (1003.1092ms)
  ✔ state 5 — no verification commands (803.8889ms)
✔ INS-008 — doctor diagnoses seeded breakage (5089.6058ms)
▶ INS-011/012 — no credentials, no network
  ✔ attach never writes anything credential-shaped (171.5153ms)
  ✔ attach succeeds with no network available (171.49ms)
✔ INS-011/012 — no credentials, no network (343.2884ms)
▶ PLG-001 — the L2 plugin shim is installed correctly
  ✔ a shim is written, not a copy of the built plugin (182.3486ms)
  ✔ the shim imports a file:// URL, never a bare Windows path (175.9726ms)
  ✔ host companions land in the host's own directories, not inside apex/ (182.3569ms)
  ✔ an L1-only host gets no plugin shim (167.2393ms)
✔ PLG-001 — the L2 plugin shim is installed correctly (708.312ms)
▶ INS-001 — attach touches ONE host unless told otherwise
  ✔ attaches only to the deepest host and names the rest (668.1197ms)
  ✔ the untouched hosts really are untouched (651.1644ms)
  ✔ --all-hosts opts back in (685.7738ms)
  ✔ --host targets exactly one, even with several present (169.4877ms)
✔ INS-001 — attach touches ONE host unless told otherwise (2174.9632ms)
▶ CORE-001 — the published package must actually run
  ✔ ships compiled JavaScript, not raw TypeScript (1.3364ms)
  ✔ a build step exists and prepack runs it (0.541ms)
  ✔ the bin entry is plain JavaScript (0.6204ms)
  ✔ the bin entry prefers dist and falls back to src (0.7164ms)
  ✔ the compiled build exists and imports .js, never .ts (9.6254ms)
  ✔ the compiled build contains no TypeScript-only syntax (0.7749ms)
  ✔ the doctrine payload is published (0.4643ms)
  ✔ CORE-003 — no runtime dependencies (2.837ms)
  ✔ the supported Node range is declared (0.6442ms)
✔ CORE-001 — the published package must actually run (22.0034ms)
▶ payload integrity
  ✔ the payload exists and has real content (1.6858ms)
  ✔ nothing references a directory that does not ship (2.5745ms)
  ✔ every relative markdown link inside the payload resolves (1.6758ms)
  ✔ the payload is in sync with the doctrine source (163.8698ms)
  ✔ host companions ship for the L2 install (0.404ms)
  ✔ the payload names no machine-specific path (2.1679ms)
✔ payload integrity (174.5019ms)
▶ parseJsonLenient
  ✔ plain JSON (46.6348ms)
  ✔ strips a BOM (7.9258ms)
  ✔ strips line comments (41.6451ms)
  ✔ strips block comments (5.1ms)
  ✔ strips trailing commas (32.0028ms)
  ✔ does NOT strip comment-like text inside strings (24.1612ms)
  ✔ throws a useful error on real garbage (8.8983ms)
✔ parseJsonLenient (181.4772ms)
▶ INS-004 — Windows path regression
  ✔ serialiseChecked escapes backslashes and round-trips (11.1774ms)
  ✔ emitted JSON contains no lone backslash escape (4.5687ms)
  ✔ toJsonPath produces forward slashes (1.8311ms)
  ✔ the exact Army-V2 failure is now impossible (14.2507ms)
  ✔ writeJson re-reads and verifies what landed on disk (16.544ms)
✔ INS-004 — Windows path regression (49.3145ms)
▶ writes are redacted (CORE-005)
  ✔ writeText redacts (12.1885ms)
  ✔ writeJson redacts nested values (10.8673ms)
✔ writes are redacted (CORE-005) (23.6139ms)
▶ backup
  ✔ returns null when there is nothing to back up (3.3582ms)
  ✔ copies byte-for-byte (INS-005) (58.3677ms)
✔ backup (62.3761ms)
▶ mergeConfigObjects — INS-003
  ✔ adds absent keys (25.3939ms)
  ✔ LEAVES an existing scalar alone (4.8369ms)
  ✔ unions arrays, existing order first (14.1099ms)
  ✔ does not duplicate an array entry that is already present (3.1542ms)
  ✔ shallow-merges objects with existing winning (23.7513ms)
  ✔ preserves every unknown key byte-for-byte (14.5589ms)
✔ mergeConfigObjects — INS-003 (89.2774ms)
▶ mergeConfigFile
  ✔ merges into a rich pre-existing config and backs it up (90.9125ms)
  ✔ creates the file when absent, with no backup (40.5003ms)
  ✔ tolerates a config with comments and trailing commas (91.84ms)
✔ mergeConfigFile (223.8687ms)
▶ isUnder
  ✔ identity (1.5379ms)
  ✔ direct child (0.4411ms)
  ✔ deep child (0.4067ms)
  ✔ sibling is not under (0.3162ms)
  ✔ parent is not under child (0.2621ms)
  ✔ traversal that escapes is not under (0.2832ms)
  ✔ traversal that returns IS under (0.4064ms)
  ✔ a prefix-sharing sibling directory is not under (11.3828ms)
✔ isUnder (17.6428ms)
▶ globMatch
  ✔ config/prod.yaml vs config/prod.yaml -> true (11.5701ms)
  ✔ config/prod.yaml vs config/*.yaml -> true (12.0933ms)
  ✔ config/prod.yaml vs config/ -> true (0.6439ms)
  ✔ config/deep/prod.yaml vs config/ -> true (0.4862ms)
  ✔ config/deep/prod.yaml vs config/*.yaml -> false (0.2176ms)
  ✔ config/deep/prod.yaml vs config/**/*.yaml -> true (0.1853ms)
  ✔ src/a.ts vs **/*.ts -> true (0.1569ms)
  ✔ a.ts vs **/*.ts -> true (0.1504ms)
  ✔ migrations/001.sql vs migrations/ -> true (0.1657ms)
  ✔ src/app.ts vs migrations/ -> false (0.1471ms)
  ✔ file.txt vs file.??? -> true (0.1271ms)
  ✔ file.txtx vs file.??? -> false (0.1287ms)
  ✔ node_modules/x/y.js vs node_modules/ -> true (0.1506ms)
  ✔ src/node_modules_helper.ts vs node_modules/ -> false (0.1587ms)
  ✔ backslash separators are normalised (0.1549ms)
  ✔ dots in the pattern are literal, not wildcards (0.2675ms)
✔ globMatch (29.1046ms)
▶ toJsonPath
  ✔ converts every backslash (0.4508ms)
  ✔ leaves forward slashes alone (0.1923ms)
  ✔ handles UNC prefixes (0.2256ms)
✔ toJsonPath (1.1874ms)
▶ canonicalCase
  ✔ matches the platform convention (0.1884ms)
✔ canonicalCase (0.3162ms)
▶ resolveFrom
  ✔ keeps an absolute path absolute (0.3758ms)
  ✔ resolves a relative path against the root (0.229ms)
✔ resolveFrom (0.8329ms)
▶ isFilesystemRoot
  ✔ recognises "/" as a root (0.503ms)
  ✔ recognises "C:/" as a root (0.2099ms)
  ✔ recognises "C:\\" as a root (0.1659ms)
  ✔ recognises "c:\\" as a root (0.0884ms)
  ✔ recognises "//server/share" as a root (12.2588ms)
  ✔ recognises "\\\\server\\share" as a root (4.6989ms)


… [28531 characters omitted from the middle — the tail is preserved] …

 (25.4297ms)
  ✔ MCP-003 — an unknown protocol version negotiates down to a supported one (6.4405ms)
  ✔ an older supported version is honoured (5.4104ms)
  ✔ notifications get no response (10.8517ms)
  ✔ an unknown method returns a JSON-RPC error, not a crash (17.437ms)
✔ MCP-001/002/003 — handshake (69.6064ms)
▶ MCP-004 — the tool surface
  ✔ every required tool is listed (14.9732ms)
  ✔ every tool has a valid schema and a description that teaches (9.1727ms)
  ✔ apex_req_status describes the legal path and the evidence rule (10.3391ms)
  ✔ an unknown tool returns a rejection naming the real tools (20.7392ms)
✔ MCP-004 — the tool surface (57.3128ms)
▶ MCP-005 — teaching rejections, not exceptions
  ✔ an illegal transition returns a REJECTED message with the recipe (281.6788ms)
  ✔ BLOCKED without a reason is rejected with an explanation (140.7116ms)
  ✔ a rejection is not marked isError — it is a correction (57.9742ms)
✔ MCP-005 — teaching rejections, not exceptions (480.9746ms)
▶ MCP-006 — apex_gate
  ✔ an empty ledger fails the gate with reasons (150.5304ms)
  ✔ the gate names every unmet requirement individually (246.7181ms)
  ✔ a LATER failure supersedes an earlier pass — stale evidence cannot pass the gate (303.7206ms)
  ✔ a claimed VERIFIED_COMPLETE with no evidence is caught by the gate (180.7508ms)
✔ MCP-006 — apex_gate (884.231ms)
▶ MCP-007/008 — resources and prompts
  ✔ all resources are readable (221.1885ms)
  ✔ an unknown resource is an error, not a crash (10.6853ms)
  ✔ all prompts are retrievable (180.3706ms)
  ✔ apex-review withholds the author's reasoning (3.6421ms)
✔ MCP-007/008 — resources and prompts (417.4897ms)
▶ MCP-009 — malformed input never kills the server
  ✔ survives hostile message 0 (9.8387ms)
  ✔ survives hostile message 1 (2.4019ms)
  ✔ survives hostile message 2 (4.1055ms)
  ✔ survives hostile message 3 (9.4058ms)
  ✔ survives hostile message 4 (4.2419ms)
  ✔ survives hostile message 5 (9.2646ms)
  ✔ survives hostile message 6 (8.6562ms)
  ✔ survives hostile message 7 (15.4319ms)
  ✔ survives hostile message 8 (4.2294ms)
  ✔ survives hostile message 9 (11.1909ms)
  ✔ still works after every hostile message (25.971ms)
✔ MCP-009 — malformed input never kills the server (107.2288ms)
▶ MCP-011 — works with no host server present
  ✔ a full cycle runs on the filesystem alone (195.2136ms)
  ✔ apex_init on an existing ledger loads rather than overwrites (127.5395ms)
  ✔ apex_check blocks a protected path with an explanation (50.7284ms)
  ✔ apex_check reports bulk violations before the command runs (189.9598ms)
  ✔ snapshot and rollback round-trip through the tools (138.2061ms)
  ✔ memory round-trips and dedupes (160.3801ms)
  ✔ handoff is generated from real state (116.3524ms)
✔ MCP-011 — works with no host server present (979.5215ms)
▶ real stdio subprocess round-trip
  ✔ spawns, initializes, lists tools, and calls one (395.6487ms)
✔ real stdio subprocess round-trip (396.0274ms)
▶ MCP-004/010 + PLG-014 — restored after an external scan found them missing
  ✔ the four previously-missing tools exist and are callable (60.4706ms)
  ✔ apex_delegate records the packet even when the host cannot spawn (119.4955ms)
  ✔ apex_council DECLINES routine work (86.8005ms)
  ✔ MCP-010 — a heavy tier returns a task id instead of blocking (178.2946ms)
  ✔ MCP-010 — apex_task_result polls to completion (353.2941ms)
  ✔ an unknown task id is a teaching rejection (4.1319ms)
  ✔ PLG-014 — the plugin registers the same tools natively (19.7657ms)
✔ MCP-004/010 + PLG-014 — restored after an external scan found them missing (823.4308ms)
▶ apex_models — FLT-004 pre-dispatch check
  ✔ returns a catalog and never suggests a substitute (44.8518ms)
  ✔ is declared in the tool list (1.5057ms)
✔ apex_models — FLT-004 pre-dispatch check (46.7068ms)
▶ doc/code agreement — the mirror of the dropped-requirements bug
  ✔ no tool is documented in MCP-SERVER.md that the code does not implement (2.6806ms)
✔ doc/code agreement — the mirror of the dropped-requirements bug (2.9144ms)
▶ PLG-001 — the plugin loads and exports every hook
  ✔ returns a hook for each declared name (232.3462ms)
  ✔ PLG-015 — writes the level-2 runtime marker (116.2266ms)
  ✔ prefers the worktree over the directory (200.9171ms)
  ✔ PLG-016 — the hook list is exported for a doctor diff (58.119ms)
✔ PLG-001 — the plugin loads and exports every hook (610.3382ms)
▶ PLG-002 — a throw in any hook never breaks the session
  ✔ safe() swallows and logs (58.6294ms)
  ✔ safe() bounds a hanging hook (214.1226ms)
  ✔ every real hook survives a corrupt ledger (160.0992ms)
  ✔ a hook returning undefined is a degraded capability, not a crash (175.1689ms)
✔ PLG-002 — a throw in any hook never breaks the session (609.0637ms)
▶ PLG-003 — the doctrine is injected into every request
  ✔ APEX is prepended, and the host prompt is preserved (165.2559ms)
  ✔ protected paths are stated every turn (74.6941ms)
  ✔ the active requirement appears once one is in progress (177.1268ms)
✔ PLG-003 — the doctrine is injected into every request (417.9734ms)
▶ PLG-004 — protected paths are hard-blocked
  ✔ a write to a protected path throws with an explanation (170.6677ms)
  ✔ reading a do_not_read path is blocked (67.0967ms)
  ✔ an ordinary edit proceeds (200.136ms)
  ✔ GOV-006 — a bulk command reaching a protected path is blocked before it runs (155.1527ms)
  ✔ a bulk command confined to safe files proceeds (105.0165ms)
  ✔ a force push is blocked (134.5197ms)
  ✔ PLG-005 — a risky edit takes a snapshot first (155.0213ms)
  ✔ the intent is recorded for the after-hook (75.9959ms)
✔ PLG-004 — protected paths are hard-blocked (1065.4401ms)
▶ PLG-006 — verification lands in the SAME turn as the edit
  ✔ a failing check is appended to the tool output before the model can claim success (1158.7857ms)
  ✔ a passing check appends nothing (801.7431ms)
  ✔ a non-edit tool is not verified (36.4079ms)
  ✔ an unknown callID is ignored rather than throwing (32.9578ms)
  ✔ PLG-007 — the real change is recorded in the ledger (703.5692ms)
  ✔ REC-002 — a working command is captured into memory automatically (783.5739ms)
✔ PLG-006 — verification lands in the SAME turn as the edit (3517.6142ms)
▶ PLG-008 — each autonomy mode answers differently
  ✔ MANUAL: an ordinary edit -> ask (37.5148ms)
  ✔ GUARDED: an ordinary edit -> allow (37.8362ms)
  ✔ AUTO: an ordinary edit -> allow (30.7886ms)
  ✔ FULL_AUTO: an ordinary edit -> allow (31.8553ms)
  ✔ a protected path is DENIED in every mode, including FULL_AUTO (42.9852ms)
  ✔ GUARDED asks before a dependency install (33.8041ms)
  ✔ permissionToOperation maps host permission types (30.8353ms)
✔ PLG-008 — each autonomy mode answers differently (246.3405ms)
▶ PLG-009/010 — session lifecycle
  ✔ session.error triggers recovery (38.0026ms)
  ✔ a child session is tracked (34.683ms)
  ✔ a top-level session is not tracked as a child (31.6296ms)
  ✔ an edit to a protected path is recorded as a finding (39.7734ms)
  ✔ an ordinary edit event is not a drift (31.3241ms)
  ✔ an unknown event is ignored (32.0884ms)
✔ PLG-009/010 — session lifecycle (208.364ms)
▶ PLG-011 — constraints survive compaction
  ✔ the anchor carries protected paths and autonomy into the summary (38.7808ms)
✔ PLG-011 — constraints survive compaction (39.041ms)
▶ PLG-012 — long sessions are re-anchored
  ✔ a short conversation is left alone (34.097ms)
  ✔ a long conversation gets one anchor inserted before the last message (147.515ms)
✔ PLG-012 — long sessions are re-anchored (182.0592ms)
▶ PLG-013 — temperature by task class
  ✔ planning is warm when nothing is active (44.499ms)
  ✔ editing is cold once a requirement is in progress (50.0182ms)
  ✔ two failures switch to debugging (61.7562ms)
  ✔ the four classes have distinct temperatures (34.0101ms)
✔ PLG-013 — temperature by task class (190.7207ms)
▶ tool classification
  ✔ edit -> write (31.8924ms)
  ✔ write -> write (36.4582ms)
  ✔ patch -> write (29.4265ms)
  ✔ read -> read (30.8156ms)
  ✔ bash -> bash (31.9833ms)
  ✔ webfetch -> network (34.449ms)
  ✔ edit tools are recognised case-insensitively (31.4222ms)
✔ tool classification (227.0455ms)
▶ companion files
  ✔ agents, commands and skills are all enumerated (32.2786ms)
✔ companion files (32.5251ms)
▶ PLG-017 — hook overhead
  ✔ system.transform stays well under the budget (120.3912ms)
  ✔ tool.execute.before stays fast for an ordinary edit (153.9331ms)
✔ PLG-017 — hook overhead (274.5633ms)
▶ PLG-002/PLG-004 — a deliberate block propagates, a failure does not
  ✔ safe() re-throws a BlockedError (34.0926ms)
  ✔ safe() re-throws a block that lost its prototype across a module boundary (36.7145ms)
  ✔ safe() still swallows a genuine bug (35.119ms)
  ✔ safe() still swallows a timeout (154.6003ms)
  ✔ isDeliberateBlock discriminates correctly (38.5029ms)
  ✔ END TO END: the wrapped hook actually blocks a protected write (35.7715ms)
  ✔ END TO END: the wrapped hook still allows an ordinary edit (45.96ms)
✔ PLG-002/PLG-004 — a deliberate block propagates, a failure does not (381.4315ms)
✔ the scan actually found source files (3.8382ms)
▶ CORE-005 — every disk write goes through the chokepoint
  ✔ no direct file writes outside json.ts and log.ts (2.9335ms)
✔ CORE-005 — every disk write goes through the chokepoint (3.6438ms)
▶ CORE-009 / INS-011 — no credential handling
  ✔ does not reference ANTHROPIC_API_KEY (0.8547ms)
  ✔ does not reference OPENAI_API_KEY (0.3734ms)
  ✔ does not reference GOOGLE_API_KEY (0.6875ms)
  ✔ does not reference AWS_SECRET_ACCESS_KEY (0.7333ms)
  ✔ does not reference process.env.API_KEY (2.1901ms)
  ✔ never calls an auth endpoint (1.1184ms)
  ✔ no credential prompt (2.8914ms)
✔ CORE-009 / INS-011 — no credential handling (10.4641ms)
▶ GOV-010 — no destructive git commands anywhere
  ✔ source never emits "reset --hard" (1.4528ms)
  ✔ source never emits "clean -fd" (0.5796ms)
  ✔ source never emits "clean -f -d" (0.3835ms)
  ✔ source never emits "push --force" (0.3466ms)
  ✔ source never emits "checkout ." (0.395ms)
  ✔ governor mentions them only inside its blocklist (0.5908ms)
✔ GOV-010 — no destructive git commands anywhere (4.3095ms)
▶ CNC-001 — no hardcoded model or provider identifiers
  ✔ no model name literals (1.0909ms)
  ✔ the model-id pattern still catches a real violation (0.319ms)
  ✔ no price tables (0.7881ms)
✔ CNC-001 — no hardcoded model or provider identifiers (2.5147ms)
▶ X-004 — no telemetry, no external network
  ✔ no external hostnames (0.8684ms)
  ✔ no analytics identifiers (2.0689ms)
✔ X-004 — no telemetry, no external network (3.2546ms)
▶ VER-012 — the verifier cannot modify tests
  ✔ verifier.ts has no write path (0.7039ms)
✔ VER-012 — the verifier cannot modify tests (0.9119ms)
▶ CNC-006 — no path from a vote to a requirement status
  ✔ council.ts never sets a status (0.8033ms)
✔ CNC-006 — no path from a vote to a requirement status (1.065ms)
▶ FLT-004 — no code path substitutes a user-named model
  ✔ warden.ts has no automatic model picker (0.8622ms)
✔ FLT-004 — no code path substitutes a user-named model (1.0499ms)
▶ erasable-syntax discipline
  ✔ no TypeScript enums (not erasable — breaks native type stripping) (2.4742ms)
  ✔ no constructor parameter properties (0.9286ms)
  ✔ no namespaces (1.7186ms)
✔ erasable-syntax discipline (5.5973ms)
▶ CORE-003 — dependency discipline
  ✔ package.json declares no runtime dependencies (0.8897ms)
  ✔ source imports only node: builtins and relative paths (3.5872ms)
✔ CORE-003 — dependency discipline (4.7845ms)
▶ MCP-001 — stdout is reserved for the protocol
  ✔ only the MCP server writes to stdout (0.9606ms)
✔ MCP-001 — stdout is reserved for the protocol (1.113ms)
✔ no leftover TODO/FIXME/stub markers in shipped source (1.1808ms)
✔ the exempt detector mentions markers ONLY inside its detection code (1.5212ms)
✔ CORPUS sanity: the scan reads real content (0.2423ms)
ℹ tests 653
ℹ suites 145
ℹ pass 653
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 16854.1677

```

### V-023
- **Requirements:** REQ-005, REQ-008
- **Type:** build
- **Command:** `npm run build`
- **Expected:** exit code 0
- **Result:** PASS
- **Exit code:** 0
- **Duration:** 2318
- **Timestamp:** 2026-08-16T03:15:01.197Z
- **Reason:** 

```text

> apex-agent@1.0.0 build
> tsc -p tsconfig.build.json


```
