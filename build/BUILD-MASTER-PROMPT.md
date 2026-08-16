# BUILD MASTER PROMPT

> **Give this file to any capable AI coding agent to build the APEX runtime (L1 + L2).**
>
> The doctrine layer (L0) in `../core/` already works and needs no code. This folder is the
> plan for the *enforced* layers that sit under it.

---

## HOW TO USE THIS

1. Open a coding agent in a terminal or IDE (OpenCode, Claude Code, Cursor, anything capable).
2. Point it at the APEX folder.
3. Paste the launch block at the bottom of this file.
4. Let it run. It will build, verify, and report against the requirement inventory.

The builder must operate **under APEX itself** — it reads `../START-HERE.md` first and applies
the doctrine to its own work. If it cannot build this system while following the discipline the
system teaches, the system does not work and you want to know that immediately.

---

## WHAT IS BEING BUILT

A single npm package, `apex-agent`, that provides:

| Deliverable | What it is |
|---|---|
| **CLI** | `npx apex-agent attach` — detects the host, installs the right binding, verifies it |
| **MCP server** | `apex-agent mcp` — stdio server exposing `apex_*` tools to any MCP host (**L1**) |
| **OpenCode plugin** | Deep hook binding: enforcement, injection, auto-recovery (**L2**) |
| **Seven engines** | The shared core both surfaces call into |
| **Doctrine payload** | `core/` + `templates/` shipped inside the package so attach is one command |

**Language:** TypeScript. **Runtime:** Node 20+ (Bun-compatible — OpenCode ships Bun).
**Dependencies:** as close to zero as possible. The MCP stdio protocol is small enough to
implement directly; do not pull in a framework for it. Zod is acceptable (OpenCode's tool
helper already uses it). Nothing else without a recorded decision.

**Non-goals.** No provider API keys — the host owns authentication, always. No web UI. No
database — the ledger is markdown and JSON on disk, readable by humans and by git. No
telemetry. Nothing that phones home.

---

## THE ARCHITECTURE IN ONE PICTURE

```
                 ┌──────────────────────────────────────────┐
                 │  L0  DOCTRINE   core/*.md                │
                 │      Works on any model, no code          │
                 └────────────────┬─────────────────────────┘
                                  │ is enforced by
                 ┌────────────────▼─────────────────────────┐
                 │  ENGINES  (shared TypeScript core)        │
                 │                                           │
                 │  CORTEX    assembles the system prompt    │
                 │  LEDGER    durable state + transitions    │
                 │  VERIFIER  runs the evidence cascade      │
                 │  WARDEN    supervises + recovers agents   │
                 │  GOVERNOR  permissions + protected paths  │
                 │  COUNCIL   targeted second opinion        │
                 │  RECALL    project memory + retrieval     │
                 └───────┬───────────────────────┬──────────┘
                         │                       │
            ┌────────────▼──────────┐  ┌─────────▼───────────────┐
            │ L1  MCP SERVER        │  │ L2  OPENCODE PLUGIN     │
            │ apex_* tools          │  │ hooks: system.transform,│
            │ any MCP host          │  │ tool.execute.*,         │
            │ state is real         │  │ permission.ask, event   │
            │ enforcement is not    │  │ enforcement is real     │
            └───────────────────────┘  └─────────────────────────┘
```

Each level degrades gracefully to the one above it. L2 unavailable → L1 still works. L1
unavailable → L0 still works. **Nothing in the design may require L2 to be useful.**

---

## THE ORDER OF WORK

Build in this order. Each phase must be verified before the next begins.

| Phase | Deliverable | Done when |
|---|---|---|
| **0** | Package skeleton, TS config, test harness | `npm test` runs and passes on an empty suite |
| **1** | LEDGER engine | Ledger round-trips; illegal status transitions are rejected |
| **2** | VERIFIER engine | Detects a project's real commands; runs the cascade; captures literal output |
| **3** | GOVERNOR engine | Blocks protected paths; snapshot/rollback works; the four modes behave differently |
| **4** | MCP server (L1) | Real stdio round-trip; every `apex_*` tool works from a real host |
| **5** | CLI + installer | `npx apex-agent attach` works on Windows and POSIX, non-destructively |
| **6** | CORTEX engine | System prompt assembles from live ledger state, under budget |
| **7** | OpenCode plugin (L2) | All hooks fire; protected paths are hard-blocked; auto-verify returns results in-turn |
| **8** | WARDEN engine | Detects a failed session and recovers it from a checkpoint |
| **9** | RECALL engine | Memory persists across sessions and is injected by relevance |
| **10** | COUNCIL engine | Independent review by a second model, with findings verified not trusted |

**Phases 0–5 are the minimum viable product.** They deliver a real, useful L1 on every MCP
host. Ship that before starting phase 6 — a working L1 beats a half-built L2.

---

## THE RULES FOR THE BUILDER

These are requirements, not style preferences. Each one exists because its absence broke a
previous version of this system.

1. **Windows paths in JSON must be escaped or forward-slashed.** `C:\\Users\\x` or
   `C:/Users/x`. Never a single backslash. Always write config with `JSON.stringify`, never by
   string concatenation, and **always parse it back to validate before writing it to disk.**
   *A single-backslash path in `opencode.json` silently disabled the entire previous version of
   this system.* Add a test for this specifically.

2. **Never replace a user's config.** Read it, merge into it, write it back. Preserve unknown
   keys byte-for-byte. Take a `.bak` copy before writing. If the merge would remove anything
   the user had, abort and report instead.

3. **Never handle provider credentials.** Not read, not stored, not passed, not logged. The
   host owns authentication. There is no code path in this package that touches an API key.

4. **Degrade, never crash.** A missing hook, an unsupported endpoint, an unexpected response
   shape — log it and continue at a lower level. A plugin that throws takes the user's whole
   session down with it. Wrap every hook body.

5. **Verify against the installed types, not against this document.** OpenCode's plugin API
   evolves. Before implementing any hook, read the actual type definitions in
   `node_modules/@opencode-ai/plugin`. Where this plan and the installed types disagree, **the
   types win** — and record the difference in `.apex/DECISIONS.md`. Hook names and signatures
   quoted here were correct as of the version noted in `ARCHITECTURE.md`; treat them as a
   starting point.

6. **Every engine is testable without a host.** Pure functions and injected I/O. The MCP server
   and the plugin are thin adapters over the engines. If testing an engine requires a running
   OpenCode, the design is wrong.

7. **Human-readable state.** Markdown and JSON on disk. No binary formats, no database. The
   user must be able to open `.apex/` in an editor, understand it, and hand-edit it.

8. **Redact before writing.** Anything that looks like a token, key, password, or connection
   string is redacted before it reaches a log, a ledger file, or an evidence block. Write this
   as a single chokepoint function and route all writes through it.

9. **Cross-platform for real.** Windows is the primary target, POSIX must also work. Use
   `path.join`, never string concatenation. Test on both. Do not assume a POSIX shell exists.

10. **No silent scope growth.** If you find yourself adding a feature not in
    `REQUIREMENTS.md`, stop and log it in `FINDINGS.md` instead.

---

## THE FILES IN THIS FOLDER

| File | Contents |
|---|---|
| `ARCHITECTURE.md` | Module layout, data flow, host API surface, key decisions |
| `REQUIREMENTS.md` | The full REQ-001…N inventory. **This is the contract.** |
| `ENGINES.md` | All seven engines: responsibilities, interfaces, algorithms, code |
| `MCP-SERVER.md` | L1: protocol, tool schemas, stdio implementation |
| `OPENCODE-PLUGIN.md` | L2: every hook, what it does, working code |
| `INSTALLER.md` | The CLI, host detection, non-destructive config merge |
| `TESTING.md` | Test strategy, the mock host, the specific regression tests |
| `ROADMAP.md` | Phase detail, acceptance criteria per phase, what is deliberately deferred |

Read `REQUIREMENTS.md` first. Everything else exists to satisfy it.

---

## LAUNCH BLOCK

Paste everything below into the coding agent, with the paths filled in.

```text
You are building the APEX runtime.

FIRST: read <APEX_ROOT>/START-HERE.md and operate under it for this entire build.
Everything it says applies to your own work here — requirement IDs, the evidence ladder,
the ledger, the completion gate. You are the first user of the system you are building.

CONFIGURATION
  APEX_ROOT   = <path to the Army-V3 folder>
  BUILD_TO    = <APEX_ROOT>/runtime          # the npm package you are creating
  LEDGER      = <BUILD_TO>/.apex             # your own ledger for this build

SOURCES OF TRUTH, in priority order
  1. <APEX_ROOT>/build/REQUIREMENTS.md   — the contract
  2. <APEX_ROOT>/build/ARCHITECTURE.md
  3. <APEX_ROOT>/build/ENGINES.md
  4. <APEX_ROOT>/build/MCP-SERVER.md, OPENCODE-PLUGIN.md, INSTALLER.md, TESTING.md
  5. <APEX_ROOT>/build/ROADMAP.md        — phase order and acceptance
  6. The installed @opencode-ai/plugin type definitions — these OUTRANK the docs above
     wherever they disagree about hook names or signatures. Record any difference.
  7. <APEX_ROOT>/core/*.md               — the doctrine the runtime must enforce

DO NOT TOUCH
  <APEX_ROOT>/core/, adapters/, templates/, START-HERE.md, README.md
  These are the working L0 layer. You are building underneath them, not editing them.
  Anything the user marks protected.

DO NOT READ
  Any credential file the user names.

EXECUTION
  Autonomy: GUARDED. Ask once before installing dependencies or any git operation that
  leaves the machine. Everything else proceeds.

  Follow ROADMAP.md phase order. Do not start a phase until the previous one's acceptance
  criteria are verified with real command output.

  Phases 0-5 are the MVP. Complete and verify all six before beginning phase 6.

BEGIN NOW.

Build the requirement inventory in <LEDGER>/REQUIREMENTS.md from build/REQUIREMENTS.md,
then implement in dependency order. Verify each phase before the next. Update the ledger
after every unit. Do not declare completion until core/10-GATE.md passes.

Do not produce an analysis and stop. The expectation is a working, tested npm package.

If a requirement is genuinely blocked, record it precisely and continue with everything
independent. Report the true shape of the work at the end, including what you could not do.
```
