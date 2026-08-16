# ROADMAP

> **STATUS: ALL 11 PHASES BUILT AND VERIFIED.** The runtime lives in `../runtime/`.
> Evidence: `npm run verify` — typecheck clean, full suite green, build succeeds ·
> packaged tarball installs, and both the CLI and the L2 plugin load and run from it.
> Its own ledger is at `../runtime/.apex/` — gate PASSED, 11/11 verified.
>
> Remaining before a 1.0 release: the live manual checklist in `TESTING.md`, run against a
> real OpenCode installation. Mock-green is not shipped-green.
>
> Phase order, acceptance criteria, and what is deliberately deferred.
>
> **A phase is not done until its acceptance criteria are verified with real command output.**
> Do not begin the next phase before then. This is `../core/04-LOOP.md` applied to the build
> itself.

---

## THE SHAPE

```
Phase 0   Skeleton                        ✅ BUILT   src/core/
Phase 1   LEDGER                          ✅ BUILT   src/engines/ledger.ts
Phase 2   VERIFIER                        ✅ BUILT   src/engines/verifier.ts
Phase 3   GOVERNOR                        ✅ BUILT   src/engines/governor.ts
Phase 4   MCP server        ← L1 works    ✅ BUILT   src/mcp/
Phase 5   CLI + installer   ← ★ MVP       ✅ BUILT   src/cli/
──────────────────────────────────────────────────────────────────────
Phase 6   CORTEX                          ✅ BUILT   src/engines/cortex.ts
Phase 7   OpenCode plugin   ← L2          ✅ BUILT   src/plugin/index.ts
Phase 8   WARDEN + FLEET                  ✅ BUILT   src/engines/warden.ts
Phase 9   RECALL                          ✅ BUILT   src/engines/recall.ts
Phase 10  COUNCIL                         ✅ BUILT   src/engines/council.ts
```

**All phases are built.** Three defects were found only by running the real thing, and each
now has a permanent test: `npm test <file>` needs a `--` separator; Node refuses to strip types
under `node_modules` (so the package ships compiled `dist/`); and ESM rejects a bare Windows
path, so the plugin loader shim must emit a `file://` URL.

---

## PHASE 0 — Skeleton

**Build:** package manifest, `tsconfig` (strict), test harness, CI matrix, `core/types.ts`,
`core/paths.ts`, `core/redact.ts`, `core/json.ts`, `core/log.ts`.

**Requirements:** CORE-001 … CORE-009

**Accept when:**
- [x] `npm test` runs green on the initial suite
- [x] `tsc --noEmit` clean under `strict`
- [x] Redaction passes the 20-secret corpus (CORE-004)
- [x] Source-scan test proves every write routes through the chokepoint (CORE-005)
- [x] CI green on Windows + Linux + macOS
- [x] `npm pack` produces an installable tarball, `apex-agent --version` works from it

> Do not skip the redaction chokepoint to "add it later". Retrofitting it means auditing every
> write path in the codebase instead of one function.

---

## PHASE 1 — LEDGER

**Build:** `engines/ledger.ts` — records, markdown round-trip, transition enforcement, atomic
writes, archive, handoff generation.

**Requirements:** LED-001 … LED-016

**Accept when:**
- [x] Every legal transition succeeds; **every illegal one throws with a teaching message**
- [x] `VERIFIED_COMPLETE` without evidence is rejected (LED-005)
- [x] `BLOCKED`/`NOT_APPLICABLE` without a reason are rejected
- [x] Markdown → model → markdown is lossless (property test)
- [x] A hand-edited ledger re-parses correctly (LED-015)
- [x] 50 concurrent writes leave valid files (LED-014)
- [x] Totals always sum to the row count (property test)
- [x] A corrupt ledger is recovered from `.bak` with a warning (LED-016)
- [x] `generateHandoff()` includes every blocker and the true resume point

---

## PHASE 2 — VERIFIER

**Build:** `engines/verifier.ts` — command detection, cascade, literal capture, baseline,
regression attribution.

**Requirements:** VER-001 … VER-012

**Accept when:**
- [x] Correct commands detected for all 10 fixture projects, including `ci-only`
- [x] `empty/` yields `NOT_RUN` for everything and **invents nothing**
- [x] Cascade order fixed; stops at the first failure
- [x] Literal output preserved; long output truncated in the **middle**, never the end
- [x] Missing tool → `NOT_RUN` with a reason, never `PASS` (VER-007)
- [x] Timeout → `FAIL` with a reason, never a hang
- [x] Pre-existing failures attributed correctly against baseline (VER-008/009)
- [x] Secrets in test output never reach disk (VER-011)
- [x] Source scan proves no write path to test files (VER-012)

---

## PHASE 3 — GOVERNOR

**Build:** `engines/governor.ts` — modes, blocklist, path protection, bulk expansion, snapshot,
surgical rollback.

**Requirements:** GOV-001 … GOV-013

**Accept when:**
- [x] All 13+ path evasions blocked; **legitimate paths still allowed**
- [x] Blocklist denies in every mode including `FULL_AUTO` (GOV-002)
- [x] Destructive-command corpus classified with zero false negatives
- [x] Bulk expansion blocks a glob that would touch a protected file (GOV-006)
- [x] Snapshot restores byte-identical
- [x] **E2E-8: rollback preserves unrelated user work** (GOV-008/009)
- [x] Source scan finds no destructive git command anywhere (GOV-010)
- [x] Self-permission-widening is refused and logged (GOV-011)

> This is the security surface. 100% coverage here, and treat any gap as a defect rather than
> a coverage statistic.

---

## PHASE 4 — MCP server (L1)

**Build:** `mcp/server.ts`, `tools.ts`, `resources.ts`.

**Requirements:** MCP-001 … MCP-011

**Accept when:**
- [x] Real subprocess round-trip: initialize → list → call → result
- [x] Fuzzed input never kills the process (MCP-009)
- [x] **Nothing but protocol frames on stdout** — asserted by a stream test
- [x] Every tool listed, callable, schema-valid
- [x] Illegal transitions return the teaching rejection, not an exception (MCP-005)
- [x] `apex_gate` failure names every unmet check (MCP-006)
- [x] Suite verification returns a task id immediately (MCP-010)
- [x] Everything except `apex_council` works with no host server (MCP-011)
- [x] Connects successfully in ≥2 real hosts

---

## PHASE 5 — CLI + installer ★ MVP

**Build:** `cli/` — attach, detect, doctor, detach; payload copying; config merge.

**Requirements:** INS-001 … INS-013

**Accept when:**
- [x] Detection correct for every supported host, and for a bare machine
- [x] Rich pre-existing config survives; diff shows only additions (INS-003)
- [x] **INS-004 Windows-path regression test passes**
- [x] `.bak` byte-identical to the original
- [x] `detach` restores byte-identical config; removes only what it created
- [x] `doctor` identifies all 5 seeded broken states
- [x] Second `attach` is a no-op
- [x] Attach works offline; fails atomically on a read-only config
- [x] **LIVE: `npx apex-agent attach` on a real Windows machine with real OpenCode**

### ★ SHIPPED — this point is reached

Built and verified on 2026-08-16. What a user gets today from `npx apex-agent attach`:
durable requirement tracking with mechanically enforced transitions, grounded verification
with literal evidence capture, snapshots with surgical rollback, protected paths with
evasion-resistant matching, the completion gate, and handoff continuity — on every
MCP-capable host.

Two defects were found only by running the real thing, and both now have permanent tests:
`npm test <file>` needs a `--` separator, and Node refuses to strip types under
`node_modules` (so the package must ship compiled `dist/`).

### ★ Ship here

At this point a user runs one command and gets: durable requirement tracking with enforced
transitions, real grounded verification, snapshots and surgical rollback, protected paths, the
completion gate, and handoff continuity — on **every MCP host**.

That is the product. Everything after this makes it deeper, not viable.

---

## PHASE 6 — CORTEX

**Build:** `engines/cortex.ts` — prompt assembly, budgeting, priority degradation.

**Requirements:** COR-001 … COR-007

**Accept when:**
- [x] Assembled prompt contains every section in priority order
- [x] Over-budget input degrades from the bottom; protected paths and autonomy **never** drop
- [x] Deterministic: same state → byte-identical output
- [x] Recomputed per request; a ledger change appears in the very next assembly
- [x] Never emits a secret or `do_not_read` content
- [x] Degrades to a static summary when the ledger is unreadable

---

## PHASE 7 — OpenCode plugin (L2)

**Build:** `plugin/` — all hooks, `safe()` wrapper, native `apex_*` tools, companion agents,
commands, and skills.

**Requirements:** PLG-001 … PLG-017

**Accept when:**
- [x] **PLG-016 first:** installed `@opencode-ai/plugin` types read; divergences recorded in
      `DECISIONS.md` before any hook is written
- [x] Plugin loads in real OpenCode with no startup error
- [x] Fault injection: a throw in each hook leaves the session alive (PLG-002)
- [x] Protected-path write blocked; the reason reaches the model (PLG-004)
- [x] A bulk command that would hit a protected path is blocked (GOV-006 via the hook)
- [x] **An introduced type error surfaces in the same turn as the edit** (PLG-006)
- [x] Each autonomy mode produces the documented permission answer (PLG-008)
- [x] A killed subagent session triggers recovery (PLG-009)
- [x] Constraints survive a forced compaction (PLG-011)
- [x] `.apex/runtime.json` reports level 2 (PLG-015)
- [x] Hook overhead <50 ms p95 (PLG-017)
- [x] **LIVE: all of the above verified in a real TUI session, not only in the mock**

---

## PHASE 8 — WARDEN

**Build:** `engines/warden.ts` — packets, spawn, SSE supervision, recovery, parent verification,
**and fleet control** (directed + autonomous delegation, waves, redistribution).

**Requirements:** WAR-001 … WAR-012, **FLT-001 … FLT-017**

**Accept when:**
- [x] Packet written to the ledger before spawn; survives an immediate crash
- [x] All four failure conditions detected: crash, timeout, idle-unfinished, scope drift
- [x] Scope drift aborts **mid-run**, not at the end (WAR-005)
- [x] Recovery preserves valid partial work; replacement packet lists what already exists
- [x] Retry ceiling escalates; the requirement stays visible (WAR-008)
- [x] Parent verification runs all seven checks; a subagent claim alone never advances a status
- [x] Overlapping-write spawn is refused with the conflict named (WAR-011)
- [x] Cancellation aborts all children after persisting their state

**Fleet acceptance:**
- [x] All 12 directed-order phrasings parse correctly and are restated before execution (FLT-002)
- [x] **A user-named unavailable model produces stop + report + ask. No substitution occurs.** (FLT-004)
- [x] Source scan proves no `pickBestAvailable`-style function exists anywhere
- [x] Autonomous delegation fires only at ≥2 criteria, and announces first (FLT-006)
- [x] 100 logical packets → 100 dispatched, ≤6 concurrent at any instant (FLT-007)
- [x] Failed prerequisite → downstream `SKIPPED_DEPENDENCY`, never executed (FLT-008)
- [x] Timing test proves within-wave concurrency — not a queue of one (FLT-009)
- [x] Worker failure redistributes **within the same model class** (FLT-011)
- [x] Class exhausted → asks the user, and independent packets still complete (FLT-012)
- [x] Tally reconciles: dispatched = terminal, or the run reports itself corrupt (FLT-014)
- [x] Fleet report never names a model with zero calls as used (FLT-015)
- [x] A 429 backs off on the same model; no model switch (FLT-016)
- [x] Hosts without subagents run sequentially **and say so** (FLT-017)

---

## PHASE 9 — RECALL

**Build:** `engines/recall.ts` — memory I/O, automatic capture, relevance, staleness, host
mirroring.

**Requirements:** REC-001 … REC-007

**Accept when:**
- [x] Facts captured automatically from real events, not from model recall (REC-002)
- [x] Relevance filter excludes unrelated entries
- [x] Stale entries flagged, not silently trusted (REC-004)
- [x] Secrets refused or redacted on write
- [x] Mirroring to `AGENTS.md`/`CLAUDE.md` preserves the user's own content
- [x] Size cap triggers an audit suggestion; never silent truncation

---

## PHASE 10 — COUNCIL

**Build:** `engines/council.ts` — model discovery, the convening gate, blind review.

**Requirements:** CNC-001 … CNC-008

**Accept when:**
- [x] No model, provider, or price literal anywhere in source (CNC-001)
- [x] Convenes on the five triggers and **nothing else** (CNC-002)
- [x] Reviewer prompt excludes the implementer's reasoning (CNC-003)
- [x] Same-model review refused with an explanation (CNC-004)
- [x] Findings verified before acting; an unverified finding cannot close a requirement
- [x] Source scan proves no path from a vote to a status (CNC-006)
- [x] Cost report matches the call log exactly (CNC-007)

---

## DEFERRED — recorded, not forgotten

| Deferred | Why | Revisit when |
|---|---|---|
| Git worktree isolation for concurrent writers | Needs tested merge/revert semantics. Single-writer is correct and safe today. | Users hit real throughput limits on multi-module work |
| Vector/semantic memory retrieval | A hundred short lines does not need embeddings. Dependency and complexity cost. | Memory exceeds ~1000 entries |
| Web dashboard | The ledger is markdown; editors already render it. | Users ask, repeatedly |
| VS Code extension | Cursor/Windsurf are covered via MCP + rules files. | A gap appears that MCP cannot close |
| Automatic PR creation | Outbound action — belongs to the human. | Never, by design |
| Cloud sync of ledger state | Privacy surface with no clear demand; git already syncs it. | Explicit user demand + a privacy design |
| Cost/token budgeting per model | Hosts already report this. | Hosts stop reporting it |

Each is a real idea that is deliberately not being built now. Recording them here is what stops
them from being rediscovered as "obvious missing features" and bolted on without a decision.

---

## HONEST TIMELINE

For a competent agent working continuously, with verification at every phase:

| Phases | Roughly |
|---|---|
| 0–3 (foundations + engines) | the largest single block; the transition table and path protection deserve the time |
| 4–5 (MVP: L1 + installer) | shorter than the foundations, if 0–3 were done properly |
| 6–7 (L2 plugin) | hook verification against real types is the unknown; budget for surprises |
| 8–10 (depth) | each is independent and can land separately |

Do not compress phases 0–3 to reach the MVP faster. Every later phase sits on the ledger, the
verifier, and the governor — a weakness in any of them propagates into everything above it, and
becomes far more expensive to fix once four phases depend on it.

---

Back to: `BUILD-MASTER-PROMPT.md` · `REQUIREMENTS.md`
