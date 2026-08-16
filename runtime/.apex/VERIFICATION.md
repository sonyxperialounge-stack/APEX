# Verification Log

| ID | REQ | Type | Command | Expected | Actual | Result |
|---|---|---|---|---|---|---|
| V-001 | REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-011 | parse | `` | — | No parse command is configured for this project. | NOT_RUN |
| V-002 | REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-011 | types | `npx tsc --noEmit` | exit code 0 |  | PASS |
| V-003 | REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-011 | lint | `` | — | No lint command is configured for this project. | NOT_RUN |
| V-004 | REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-011 | unit | `` | — | No unit command is configured for this project. | NOT_RUN |
| V-005 | REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-011 | suite | `npm test` | exit code 0 | > apex-agent@1.0.0 test | PASS |
| V-006 | REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-011 | build | `npm run build` | exit code 0 | > apex-agent@1.0.0 build | PASS |

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
