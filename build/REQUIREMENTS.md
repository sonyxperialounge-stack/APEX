# REQUIREMENTS — the contract

> This is the authoritative scope. The builder copies these into its own
> `runtime/.apex/REQUIREMENTS.md`, assigns each a status, and drives them to
> `VERIFIED_COMPLETE`.
>
> **Nothing here may be silently dropped, simplified, or substituted.** If something proves
> impossible, it becomes `BLOCKED` with evidence — never absent.

**Reading the columns.** *Acceptance* is what must be demonstrably true. *Verify* is the check
that demonstrates it. Every requirement needs an automated test unless marked otherwise.

---

## CORE — foundations (Phase 0)

| ID | Requirement | Acceptance | Verify |
|---|---|---|---|
| CORE-001 | npm package `apex-agent`, ESM, `bin: apex-agent`, Node ≥20 | `npm pack` produces an installable tarball; `npx` resolves the bin | install into a temp dir, run `apex-agent --version` |
| CORE-002 | TypeScript strict mode, no `any` in public interfaces | `tsc --noEmit` clean with `strict: true` | `tsc --noEmit` |
| CORE-003 | Zero required runtime dependencies beyond zod | `package.json` dependencies ≤ 1 | inspect manifest in test |
| CORE-004 | `redact.ts` — single chokepoint removing tokens, keys, passwords, connection strings, bearer headers from any string | Known secret patterns are replaced with `[REDACTED]` | unit test over a corpus of 20+ secret shapes |
| CORE-005 | **Every** disk write and log write routes through redaction | No write path bypasses `redact()` | source-scan test asserting no direct `writeFile` outside `core/json.ts` and `core/log.ts` |
| CORE-006 | `json.ts` — read/merge/write with parse-back validation and `.bak` | Written JSON is re-parsed before the write is considered successful | unit test incl. failure injection |
| CORE-007 | Cross-platform paths via `path.join`; no string concatenation of paths | Works identically on win32 and posix | tests run on both in CI |
| CORE-008 | Rotating redacted log + `events.jsonl` | Log rotates at a size cap; JSONL is one valid object per line | unit test |
| CORE-009 | No code path reads, stores, forwards, or logs a provider credential | Source scan finds no credential access | automated source scan test |

---

## LEDGER engine (Phase 1)

| ID | Requirement | Acceptance | Verify |
|---|---|---|---|
| LED-001 | Create `.apex/` from the shipped templates; never overwrite an existing one | Second init on an existing ledger preserves all content | unit test |
| LED-002 | Requirement records: id, source, text, component, deps, acceptance, verifyBy, status, evidence[], files[], notes | Round-trips to markdown and back with no loss | property test |
| LED-003 | The six statuses only; any other value rejected | Invalid status throws with a clear message | unit test |
| LED-004 | **Enforce legal transitions.** `NOT_STARTED → VERIFIED_COMPLETE` is rejected | The illegal jump throws and names the missing intermediate | unit test per transition pair |
| LED-005 | `VERIFIED_COMPLETE` requires ≥1 verification record with `result: PASS` referencing that REQ | Marking complete without evidence is rejected | unit test |
| LED-006 | `BLOCKED` requires evidence text; `NOT_APPLICABLE` requires a reason | Empty reason is rejected | unit test |
| LED-007 | Requirements are never deleted; IDs never reused | Delete API does not exist; ID collision throws | unit test |
| LED-008 | Totals line recomputed on every write and always sums to row count | Mismatch is impossible by construction | property test |
| LED-009 | Verification records: id, reqIds[], type, command, expected, actual, result, timestamp | `NOT_RUN` is a first-class result with a required reason | unit test |
| LED-010 | Append-only progress log with a rewritable RESUME POINT block | Resume point is replaced, history is appended | unit test |
| LED-011 | Decisions, findings, subagent records with the schemas in `templates/` | All round-trip | unit test |
| LED-012 | Handoff generated **from recorded state**, not from a model's summary | Generated handoff contains every blocked item and the current resume point | unit test |
| LED-013 | Archive: move verified-complete phase detail to `archive/`, leave a pointer | No unresolved item is ever archived | unit test |
| LED-014 | Atomic writes (temp + rename); concurrent writers do not corrupt | 50 concurrent writes leave valid JSON/markdown | stress test |
| LED-015 | Ledger is human-editable: hand-edited markdown re-parses correctly | Round-trip after manual edit succeeds | fixture test |
| LED-016 | Recovery: detect a corrupt ledger and restore from `.bak` with a warning | Corrupted file is recovered, user is told | unit test |

---

## VERIFIER engine (Phase 2)

| ID | Requirement | Acceptance | Verify |
|---|---|---|---|
| VER-001 | Auto-detect a project's real commands from `package.json`, `Makefile`, `justfile`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `.github/workflows/` | Correct commands found for ≥6 project archetypes | fixture projects |
| VER-002 | Detected commands cached in `.apex/config.json`; never re-guessed | Second run reads the cache | unit test |
| VER-003 | Cascade in order: parse → types → lint → targeted test → suite → build → run | Order is fixed; stops at first failure | unit test |
| VER-004 | Capture **literal** stdout, stderr, and exit code — never a summary | Full output preserved (bounded, truncated in the middle with a marker) | unit test |
| VER-005 | Map a changed file to the smallest relevant check (e.g. `src/auth.py` → `tests/test_auth.py` when it exists) | Correct targeted test chosen in fixture repos | fixture test |
| VER-006 | Timeout per stage, configurable; a timeout is `FAIL` with a reason, never a hang | Long command is killed and reported | unit test |
| VER-007 | A missing tool (no `mypy` installed) yields `NOT_RUN` with a reason — never a fake pass | Absent binary produces `NOT_RUN` | unit test |
| VER-008 | Baseline capture: run the suite before changes, so pre-existing failures are attributable | Pre-existing failure is labelled as such, not blamed on the change | integration test |
| VER-009 | Regression detection: compare against baseline, report newly-failing tests specifically | New failure identified by name | integration test |
| VER-010 | Every run writes a verification record via LEDGER | Record exists with literal output | integration test |
| VER-011 | Output redacted before recording | Secret in test output does not reach disk | unit test |
| VER-012 | Never modify, skip, weaken, or delete a test to make a check pass | No code path writes to test files | source-scan test |

---

## GOVERNOR engine (Phase 3)

| ID | Requirement | Acceptance | Verify |
|---|---|---|---|
| GOV-001 | Four modes: MANUAL, GUARDED, AUTO, FULL_AUTO with the behaviours in `core/07-AUTONOMY.md` | Each mode produces a different decision on the same operation set | table-driven test |
| GOV-002 | **Hard blocklist enforced in every mode, including FULL_AUTO** | Blocked op is denied even when config says allow | test per blocklist item |
| GOV-003 | Protected-path check: glob and prefix matching, symlink-aware, case-insensitive on win32 | `do_not_touch` path is blocked via every alias, including `..` traversal | test with 15+ evasion attempts |
| GOV-004 | `do_not_read` blocks read, glob results, and subagent packet inclusion | Forbidden file never appears in any output | integration test |
| GOV-005 | Destructive-command classification: `rm -rf`, `git reset --hard`, `git clean -fd`, force push, `DROP`, `TRUNCATE`, unbounded `find -delete` | All classified correctly; no false negatives on the corpus | corpus test |
| GOV-006 | Bulk-operation expansion: enumerate what a glob/recursive command will touch, then compare against protected paths | Glob that would hit a protected file is blocked before running | integration test |
| GOV-007 | Snapshot before risky edits into `.apex/snapshots/<REQ>/` | File is restorable byte-identical | unit test |
| GOV-008 | Surgical rollback: restore only the recorded files; never touch anything else | Unrelated dirty file is untouched after rollback | integration test |
| GOV-009 | Distinguish user's pre-existing changes from agent's changes | Baseline `git status` diffed against current | integration test with a dirty tree |
| GOV-010 | **Never** emit `git reset --hard`, `git clean -fd`, `git checkout .`, or blanket `git stash` | Those strings do not exist in source | source-scan test |
| GOV-011 | Self-modification block: refuse to widen own permissions or edit `.apex/config.json` autonomy upward | Attempt is denied and logged | unit test |
| GOV-012 | Every autonomous decision logged with the rule that produced it | Log line names the rule | unit test |
| GOV-013 | External-effect gate: network-mutating, deploy, payment, and outbound-message ops always require explicit human authorisation | Denied in FULL_AUTO | unit test |

---

## MCP SERVER — L1 (Phase 4)

| ID | Requirement | Acceptance | Verify |
|---|---|---|---|
| MCP-001 | stdio JSON-RPC server, dependency-free, correct `initialize` handshake | Real subprocess round-trip succeeds | subprocess integration test |
| MCP-002 | Advertise only capabilities actually implemented | No unimplemented capability in the response | contract test |
| MCP-003 | Negotiate protocol version; support the host's requested version or respond with the supported one | Older and newer clients both connect | contract test |
| MCP-004 | Tools: `apex_init`, `apex_status`, `apex_req_add`, `apex_req_list`, `apex_req_status`, `apex_verify`, `apex_snapshot`, `apex_rollback`, `apex_delegate`, `apex_subagent_status`, `apex_council`, `apex_gate`, `apex_handoff`, `apex_memory_read`, `apex_memory_write`, `apex_findings` | All listed, all callable, all schema-valid | per-tool test |
| MCP-005 | `apex_req_status` rejects illegal transitions with an explanatory error the model can act on | Illegal call returns a useful error, not a crash | unit test |
| MCP-006 | `apex_gate` returns pass/fail **plus the specific failing items** | Failing gate names each unmet check | unit test |
| MCP-007 | Resources: `apex://state`, `apex://requirements`, `apex://handoff`, `apex://memory` | All readable | contract test |
| MCP-008 | Prompts: `apex-boot`, `apex-resume`, `apex-review` | All retrievable | contract test |
| MCP-009 | Malformed request → JSON-RPC error, never a crash or a hang | Fuzzed input leaves the server alive | fuzz test |
| MCP-010 | Long operations return a task id and are pollable; never block the protocol loop | Verify-suite call returns immediately with an id | integration test |
| MCP-011 | Works with no host HTTP server present (filesystem-only mode) | All non-council tools function | integration test |

---

## CLI + INSTALLER (Phase 5)

| ID | Requirement | Acceptance | Verify |
|---|---|---|---|
| INS-001 | `apex-agent attach` detects the host automatically | Correct detection for OpenCode, Claude Code, Cursor, Windsurf, generic | fixture test per host |
| INS-002 | `--host <name>` overrides detection | Override honoured | unit test |
| INS-003 | Attach is **non-destructive**: merge into existing config, preserve unknown keys byte-for-byte | Pre-existing keys survive; a diff shows only additions | fixture test with a rich pre-existing config |
| INS-004 | **Windows paths are escaped or forward-slashed; written config is parsed back before being accepted** | `C:\Users\x` never appears unescaped in emitted JSON | **regression test — this bug disabled the entire previous version** |
| INS-005 | `.bak` written before any config modification | Backup exists and matches the original byte-for-byte | unit test |
| INS-006 | `install.json` records everything attach changed | Detach can undo exactly, and nothing more | integration test |
| INS-007 | `apex-agent detach` restores the pre-attach state | Config is byte-identical to the `.bak` | integration test |
| INS-008 | `apex-agent doctor` reports host, level, config validity, ledger health, missing pieces | Correctly diagnoses 5 seeded broken states | fixture test |
| INS-009 | Doctrine payload copied into the host config dir and registered under `instructions` | Files present; config references them | integration test |
| INS-010 | Idempotent: attaching twice changes nothing the second time | Second run is a no-op with a clear message | unit test |
| INS-011 | Never writes a provider key; never prompts for one | No credential prompt exists in the CLI | source-scan test |
| INS-012 | Works offline once installed; no network access at attach time | Attach succeeds with networking disabled | integration test |
| INS-013 | Clear failure messages naming the exact file and the exact fix | Each failure path produces an actionable message | review + test |

---

## CORTEX engine (Phase 6)

| ID | Requirement | Acceptance | Verify |
|---|---|---|---|
| COR-001 | Assemble the system prompt from: doctrine core + active requirement + recent failures + relevant memory + autonomy mode + protected paths | Assembled prompt contains every section | unit test |
| COR-002 | Token budget: default ≤2000 tokens, configurable; degrade by dropping lowest-priority sections first | Over-budget input yields an in-budget output with the highest-priority content retained | unit test |
| COR-003 | Priority order: protected paths > autonomy > active requirement > recent failures > doctrine summary > memory | Drop order matches | unit test |
| COR-004 | Recompute per request; never serve a stale snapshot | Ledger change is reflected in the very next assembly | integration test |
| COR-005 | Deterministic given identical state — for caching and testability | Same input, byte-identical output | property test |
| COR-006 | Never inject secrets or `do_not_read` content | Redaction applied; forbidden file content never appears | unit test |
| COR-007 | Degrade to a static doctrine summary when the ledger is unreadable | Corrupt ledger still yields a usable prompt | unit test |

---

## OPENCODE PLUGIN — L2 (Phase 7)

| ID | Requirement | Acceptance | Verify |
|---|---|---|---|
| PLG-001 | Valid plugin export; loads without error in a real OpenCode | Plugin appears loaded; no startup error | manual + mock host |
| PLG-002 | **Every hook body is wrapped**; a throw inside APEX never breaks the user's session | Injected throw is swallowed and logged | fault-injection test |
| PLG-003 | `experimental.chat.system.transform` injects the CORTEX prompt | Transformed system prompt contains APEX state | mock-host test |
| PLG-004 | `tool.execute.before` hard-blocks protected paths with an explanatory error | Write to a protected path is denied and the reason reaches the model | mock-host test |
| PLG-005 | `tool.execute.before` applies GOVERNOR policy to destructive ops, and snapshots risky ones | Snapshot exists before the edit runs | integration test |
| PLG-006 | `tool.execute.after` auto-verifies edits and returns failures **in the same turn** | Introduced type error surfaces before the next model output | integration test |
| PLG-007 | `tool.execute.after` records real changes into the ledger | Ledger reflects the actual edit, not a claim | integration test |
| PLG-008 | `permission.ask` answers by autonomy policy | Each mode produces the documented answer | table-driven test |
| PLG-009 | `event`: `session.error` and abnormal `session.idle` trigger WARDEN recovery | Simulated failure is detected and recovery starts | integration test |
| PLG-010 | `event`: child sessions tracked into `SUBAGENTS.md` | Child session appears in the ledger | integration test |
| PLG-011 | `experimental.session.compacting` preserves ledger state, constraints, and blockers | Post-compaction context retains all constraints | integration test |
| PLG-012 | `experimental.chat.messages.transform` re-anchors constraints in long sessions | Constraint present after N turns | integration test |
| PLG-013 | `chat.params` sets temperature by task class | Planning and editing get different values | unit test |
| PLG-014 | `tool` hook registers `apex_*` natively so MCP is unnecessary at L2 | Tools callable without an MCP server running | integration test |
| PLG-015 | Writes `.apex/runtime.json` with `{"level":2}` for detection | File present and correct while the plugin is loaded | integration test |
| PLG-016 | **Verify every hook name and signature against the installed `@opencode-ai/plugin` types before implementing; record any divergence from this plan** | A divergence report exists (even if empty) | manual gate, recorded in DECISIONS |
| PLG-017 | Performance: hook overhead <50 ms p95, excluding the verification command itself | Measured under load | benchmark test |

---

## WARDEN engine (Phase 8)

| ID | Requirement | Acceptance | Verify |
|---|---|---|---|
| WAR-001 | Build a subagent packet with every field in `core/06-DELEGATION.md` | No field missing | unit test |
| WAR-002 | Write the packet to the ledger **before** spawning | Packet survives an immediate crash | integration test |
| WAR-003 | Spawn a child session with `parentID`; track it | Child appears under `GET /session/:id/children` | integration test |
| WAR-004 | Supervise via SSE `/event`: detect error, timeout, idle-with-unfinished-work, scope drift | Each condition detected in a simulated run | 4 integration tests |
| WAR-005 | Detect scope drift from file-change events outside ALLOWED PATHS and abort immediately | Drifting subagent is aborted mid-run | integration test |
| WAR-006 | On failure: read checkpoint → inspect real files → classify what survived → **resume, do not restart** | Recovery preserves valid partial work | integration test |
| WAR-007 | Prefer host session resume when available; otherwise build a replacement packet containing what already exists | Replacement packet lists surviving work explicitly | unit test |
| WAR-008 | Retry ceiling per strategy; on exhaustion, escalate — never silently drop | Requirement remains visible as BLOCKED | unit test |
| WAR-009 | Classify failures into the taxonomy in `core/06-DELEGATION.md` and pick the matching response | Correct class and response for each seeded failure | table-driven test |
| WAR-010 | Parent verification is mandatory: read the diff, re-run the checks, verify scope, before any status change | Subagent claim alone never advances a status | integration test |
| WAR-011 | Write safety: refuse to run two writers against overlapping paths | Overlapping spawn is rejected with the conflict named | unit test |
| WAR-012 | Abort all children on cancellation or shutdown; persist their state first | No orphan sessions; state recoverable | integration test |

---

## FLEET control — part of WARDEN (Phase 8)

Implements `core/13-FLEET.md`. Directed and autonomous delegation, parallel waves, redistribution.

| ID | Requirement | Acceptance | Verify |
|---|---|---|---|
| FLT-001 | Four fleet modes: `OFF`, `AUTO`, `DIRECTED_ONLY`, `AGGRESSIVE` | Each produces different behaviour on the same task | table-driven test |
| FLT-002 | Parse a directed order into count, roles, and models; restate it before executing | 12 phrasings from `13-FLEET.md` parse correctly | corpus test |
| FLT-003 | A directed order overrides the mode, except `OFF`, which asks for confirmation of the contradiction | Order + `OFF` produces a question, not a silent resolution | unit test |
| FLT-004 | **Model substitution law: a user-named model is never replaced, added to, or dropped** | Unavailable named model → stop + report + ask. No substitution occurs. | unit test + source scan |
| FLT-005 | Pre-authorised fallback (`models.fallback`) is honoured, and is the only exception to FLT-004 | Configured fallback used; nothing else ever is | unit test |
| FLT-006 | Autonomous delegation requires ≥2 of the documented criteria and is announced before it happens | Below threshold → no delegation; above → announcement emitted first | table-driven test |
| FLT-007 | Logical packets are honoured exactly; physical concurrency is bounded separately | 100 logical packets → 100 packets dispatched, ≤`max_concurrent_calls` at once | integration test |
| FLT-008 | Dependency waves: a wave starts only when prerequisites **succeeded**, not merely finished | Failed prerequisite → downstream `SKIPPED_DEPENDENCY`, never run | integration test |
| FLT-009 | Within a wave, independent packets run concurrently — never serialised into a queue | Wall-clock proves parallelism at the configured cap | timing test |
| FLT-010 | `writers_per_wave` enforced; with `isolation: "none"` it is 1 and cannot be raised | Second concurrent writer is refused with the conflict named | unit test |
| FLT-011 | Worker failure → redistribute to another worker **of the same model class**, with a replacement packet stating what already exists | Redistribution stays in class; no work is redone | integration test |
| FLT-012 | Class exhausted → stop that class, report which model is down and what remains available, ask the user, continue independent work | No auto-substitution; independent packets still complete | integration test |
| FLT-013 | All classes down → persist all state, stop, report, ask. Never fall back to an unchosen model. | State recoverable; no unchosen model called | integration test |
| FLT-014 | Every packet ends in exactly one terminal state, and dispatched count reconciles with terminal count | Mismatch is detected and reported as a corrupted run | property test |
| FLT-015 | Fleet report lists only models actually called, with real call counts | A model with 0 calls is reported as unreachable, never as used | integration test |
| FLT-016 | Rate-limit and quota failures back off and re-queue on the **same** model | No model switch on a 429 | unit test |
| FLT-017 | Where the host has no subagents, run packets sequentially and say so — never report a fleet that did not run | Report states the sequential fallback explicitly | unit test |

---

## RECALL engine (Phase 9)

| ID | Requirement | Acceptance | Verify |
|---|---|---|---|
| REC-001 | Read/write `.apex/MEMORY.md` in the documented sections | Round-trips | unit test |
| REC-002 | Capture verified facts automatically from real events: the command that actually worked, the approach that actually failed | Facts appear without being explicitly written | integration test |
| REC-003 | Relevance retrieval: return only memory related to the current files/task | Irrelevant entries excluded | unit test |
| REC-004 | Staleness detection: flag entries whose referenced file, command, or path no longer exists | Stale entry flagged, not silently trusted | unit test |
| REC-005 | Never store secrets; redaction applied on write | Secret-bearing fact is refused or redacted | unit test |
| REC-006 | Mirror stable facts into the host-native memory file (`AGENTS.md`/`CLAUDE.md`) without clobbering user content | User's own content preserved | integration test |
| REC-007 | Size cap with an audit prompt when exceeded; never silent truncation | Over-cap memory triggers a compaction suggestion | unit test |

---

## COUNCIL engine (Phase 10)

| ID | Requirement | Acceptance | Verify |
|---|---|---|---|
| CNC-001 | Discover available models from the live host catalog; never hardcode a model, provider, or price | No model identifier literal in source | source-scan test |
| CNC-002 | Convene **only** on: security-relevant diff, irreversible change, architectural decision, third consecutive failure, requirement-extraction diffing | No other trigger convenes | unit test |
| CNC-003 | Reviewer receives requirement + diff + test output, and **not** the implementer's reasoning | Prompt excludes author rationale | unit test |
| CNC-004 | The reviewer must be a different model from the implementer; refuse if only one is available | Same-model review is refused with an explanation | unit test |
| CNC-005 | Findings are hypotheses: each is verified with evidence before being acted on | Unverified finding cannot close a requirement | integration test |
| CNC-006 | Never treat agreement as proof; no voting path may set a requirement status | No code path maps a vote to a status | source-scan test |
| CNC-007 | Cost accounting: report calls made and models used; never claim a model that was not called | Report matches the call log exactly | integration test |
| CNC-008 | Record every convening in `DECISIONS.md` with what it surfaced and what evidence decided it | Record present | integration test |

---

## CROSS-CUTTING

| ID | Requirement | Acceptance | Verify |
|---|---|---|---|
| X-001 | Graceful degradation at every level: missing hook, missing endpoint, missing host → lower level, never a crash | Each simulated absence degrades cleanly | fault-injection suite |
| X-002 | All engines unit-testable with no host running | Engine suite passes with no OpenCode present | test run |
| X-003 | Windows and POSIX both fully supported and tested | Full suite green on both | CI matrix |
| X-004 | No telemetry, no network calls at runtime except to the local host API | Source scan finds no external endpoint | source-scan test |
| X-005 | Every user-facing error names the file, the cause, and the fix | Reviewed against every error path | review checklist |
| X-006 | Package installs and runs offline after first fetch | Offline install works | integration test |
| X-007 | `apex-agent --version` and `doctor` work even when the ledger is corrupt | Both succeed on a seeded corrupt ledger | unit test |

---

## DELIBERATELY OUT OF SCOPE

Recorded so they are visibly excluded rather than forgotten. Each may become a later phase.

| Not building | Why |
|---|---|
| Git worktree isolation for true concurrent writers | Needs tested merge/revert semantics; single-writer is correct and safe now |
| A web dashboard | The ledger is markdown; an editor already renders it |
| Fine-tuning or model training | Out of scope entirely |
| Cloud sync of ledger state | Privacy surface, no clear demand; git already syncs it |
| Voice, browser automation, scheduling | Army-V2's scope sprawl. Not core. |
| A provider gateway or key management | Architecturally excluded — the host owns auth |
| Automatic PR creation / posting | Outbound action; belongs to the human |

---

Next: `ENGINES.md` · `ROADMAP.md`
