# ARCHITECTURE

> Module layout, data flow, host API surface, and the decisions behind them.
>
> **Verified against:** OpenCode docs as of 2026-08-15 (`opencode.ai/docs/{plugins,config,agents,skills,custom-tools,server,cli}`).
> Hook names and endpoints below were correct then. **The installed
> `@opencode-ai/plugin` types outrank this document** wherever they disagree.

---

## WHY THE PREVIOUS VERSION FAILED

APEX is a rebuild, and the rebuild is justified by four specific defects in Army-V2. Each one
maps to a design decision here.

| Army-V2 defect | Consequence | APEX decision |
|---|---|---|
| Sat **outside** the host as an MCP server that opened its own sessions | Could not see or influence what the main agent actually did. Used 1 of ~20 available plugin hooks. | Sit **inside** via the plugin (L2), with MCP as the portable fallback (L1) |
| "Verification" was another LLM reading text | No grounding. Consensus mistaken for proof. | VERIFIER runs real commands and captures literal output. LLM review is Tier 6, never a substitute for Tier 3 |
| "Intelligence" was keyword matching (`"security"` in the task → level 3) | Effort allocation unrelated to actual difficulty | Effort follows blast radius and reversibility, computed from the real change |
| Fanned every task to N models and had them vote | Expensive; averaged output; confident agreement on wrong answers | COUNCIL convenes only for review, deadlock, and expensive irreversible decisions |

And one operational defect worth naming separately: the shipped `opencode.json` contained
unescaped Windows backslashes, making it invalid JSON, so the whole integration silently never
loaded. **REQ-INS-004 and its regression test exist because of that bug.**

---

## PACKAGE LAYOUT

```
runtime/
├── package.json                 name: apex-agent · bin: apex-agent · type: module
├── tsconfig.json                target ES2022, module NodeNext, strict
│
├── src/
│   ├── engines/                 ← pure logic, no host coupling, unit-testable alone
│   │   ├── ledger.ts            LEDGER    state, transitions, ledger I/O
│   │   ├── verifier.ts          VERIFIER  command detection, cascade, evidence
│   │   ├── governor.ts          GOVERNOR  permissions, protected paths, snapshots
│   │   ├── cortex.ts            CORTEX    system-prompt assembly, budgeting
│   │   ├── warden.ts            WARDEN    subagent supervision and recovery
│   │   ├── council.ts           COUNCIL   second-model review
│   │   └── recall.ts            RECALL    project memory, relevance retrieval
│   │
│   ├── core/
│   │   ├── types.ts             shared types — the single source of shape
│   │   ├── paths.ts             cross-platform path resolution
│   │   ├── redact.ts            THE secret chokepoint; every write goes through it
│   │   ├── json.ts              safe read/merge/write with validation + .bak
│   │   └── log.ts               rotating, redacted, JSONL events
│   │
│   ├── mcp/                     ← L1
│   │   ├── server.ts            stdio JSON-RPC loop
│   │   ├── tools.ts             apex_* schemas and dispatch
│   │   └── resources.ts         apex:// resources and prompts
│   │
│   ├── plugin/                  ← L2
│   │   ├── index.ts             the plugin export; hook wiring
│   │   ├── hooks/
│   │   │   ├── system.ts        experimental.chat.system.transform
│   │   │   ├── messages.ts      experimental.chat.messages.transform
│   │   │   ├── tools-before.ts  tool.execute.before   (enforcement)
│   │   │   ├── tools-after.ts   tool.execute.after    (auto-verify, capture)
│   │   │   ├── permission.ts    permission.ask
│   │   │   ├── events.ts        event  (recovery, tracking)
│   │   │   ├── compact.ts       experimental.session.compacting
│   │   │   └── params.ts        chat.params
│   │   └── tools/               custom tools injected via the `tool` hook
│   │
│   ├── cli/
│   │   ├── index.ts             arg parsing, subcommands
│   │   ├── attach.ts            detect host → install binding → verify
│   │   ├── detect.ts            host detection
│   │   ├── doctor.ts            diagnose an existing install
│   │   └── detach.ts            clean removal, restoring the .bak
│   │
│   └── host/
│       ├── opencode.ts          typed HTTP client for the OpenCode server API
│       └── generic.ts           filesystem-only host, no server
│
├── payload/                     ← copied verbatim from ../core and ../templates at build
│   ├── core/*.md
│   └── templates/*
│
└── test/
    ├── engines/*.test.ts
    ├── mcp/roundtrip.test.ts    real subprocess, real stdio
    ├── plugin/hooks.test.ts     against a mock host
    ├── cli/attach.test.ts       including the Windows-path regression
    └── fixtures/mock-opencode.ts
```

**The rule that keeps this maintainable:** engines never import from `mcp/`, `plugin/`, or
`cli/`. Dependencies point one way only — adapters depend on engines, never the reverse. If an
engine needs to talk to a host, it receives a client through its constructor.

---

## DATA FLOW

### L2 — a single turn inside OpenCode

```
user prompt
   │
   ├─► experimental.chat.system.transform
   │      CORTEX assembles: doctrine + active REQ + recent failures + relevant memory
   │      RECALL supplies the memory slice
   │      → the model receives current, specific instructions, every turn
   │
   ├─► chat.params
   │      temperature by task class (planning warm, editing cold)
   │
   ├─► model produces a tool call
   │
   ├─► tool.execute.before
   │      GOVERNOR: protected path? → HARD BLOCK with an explanation
   │      GOVERNOR: destructive? → policy decision by autonomy mode
   │      GOVERNOR: risky? → snapshot first
   │      LEDGER:  record the intent
   │
   ├─► the tool runs
   │
   ├─► tool.execute.after
   │      VERIFIER: was this an edit? → run parse + typecheck on the touched file
   │      → failure is injected back into this same turn, before any success claim
   │      LEDGER:  record the actual change and its evidence
   │
   └─► permission.ask (when the host raises one)
          GOVERNOR: allow / deny / defer per mode + blocklist
```

The critical property: **verification results arrive in the same turn as the edit.** The model
cannot claim success and move on, because the failure is already in front of it.

### L1 — the same turn on any MCP host

The model calls `apex_*` tools explicitly rather than having them fire automatically. Same
engines, same state, same ledger — but the discipline is *assisted*, not *enforced*. A model
that simply declines to call `apex_verify` is back at L0.

That difference is the entire value of L2, and it is why L2 exists despite costing more to
build.

---

## HOST API SURFACE

### OpenCode plugin hooks

Load order and what APEX uses each for. Signatures must be confirmed against the installed
types before implementation.

| Hook | APEX use | Criticality |
|---|---|---|
| `experimental.chat.system.transform` | Inject assembled doctrine + live state | **Highest.** This is the single biggest quality lever in the system. |
| `tool.execute.before` | Hard-block protected paths; policy on destructive ops; snapshot | **Highest.** Turns Law 8 from a request into a mechanism. |
| `tool.execute.after` | Auto-verify edits; capture real evidence into the ledger | **Highest.** Turns Law 2 into a mechanism. |
| `permission.ask` | Answer by autonomy policy | High — this is what "no clicking" means |
| `event` | `session.error`/`session.idle` → WARDEN recovery; track child sessions | High |
| `experimental.chat.messages.transform` | Re-anchor constraints; prune stale noise | Medium |
| `experimental.session.compacting` | Preserve ledger + constraints through compaction | Medium — this is what stops long-session decay |
| `chat.params` | Temperature by task class | Low |
| `tool` | Register `apex_*` as native tools (no MCP needed at L2) | Medium |
| `tool.definition` | Sharpen built-in tool descriptions | Low |
| `config` | Validate and repair APEX config at load | Low |

### OpenCode server endpoints

Used by the CLI, the WARDEN, and the COUNCIL.

| Endpoint | Use |
|---|---|
| `GET /global/health` | Liveness; detect a running instance |
| `GET /provider` · `GET /config/providers` | Live model catalog for COUNCIL |
| `POST /session` (`parentID`) | Spawn a supervised child session |
| `GET /session/:id/children` | Enumerate subagents for WARDEN |
| `POST /session/:id/message` | Blocking prompt (COUNCIL review) |
| `POST /session/:id/prompt_async` | Non-blocking dispatch |
| `POST /session/:id/abort` | Cancel a runaway subagent |
| `POST /session/:id/revert` · `/unrevert` | Coarse rollback (with `snapshot` enabled) |
| `GET /session/:id/diff` | Real evidence of what a subagent changed |
| `GET /event` (SSE) | The WARDEN's primary failure signal |
| `GET /find`, `/find/file`, `/find/symbol` | Blast-radius analysis |
| `GET /mcp` | Confirm APEX MCP is connected (used by `doctor`) |

Every call is wrapped: an unsupported endpoint on an older build degrades to a lower
capability, never to a crash.

### Config surfaces used by the installer

`plugin` (npm array) · `mcp` (local stdio) · `instructions` (auto-loaded doctrine) ·
`agents/` · `commands/` · `skills/` · `tools/` · `permission` · `snapshot` · `subagent_depth`.

Config layers **merge**, they do not replace — so APEX can add itself without disturbing
anything the user already had. That property is what makes non-destructive attach possible, and
it must be preserved by every write.

---

## KEY DECISIONS

**D-1 — TypeScript, not Python.** The deep hooks are only reachable from a TS/JS plugin.
OpenCode ships Bun, and every other host has Node. Choosing Python would mean a second runtime,
an IPC layer, and — as Army-V2 proved — an installation dependency users cannot satisfy. One
language, zero extra installs.

**D-2 — Doctrine ships inside the package.** `attach` copies `payload/core/*` into the host's
config directory and registers it under `instructions`. Attach stays one command with no
network fetch and no second repository.

**D-3 — The ledger is markdown, not a database.** It must be readable, diffable, committable,
and hand-editable. A database would be faster and strictly worse: it would make the state
opaque to the human, and opacity is how the previous system's failures stayed hidden.

**D-4 — Engines are host-agnostic and I/O-injected.** The whole engine layer must be unit
testable with no host running. This is also what makes a third binding (a future host) cheap.

**D-5 — Every level is independently useful.** L0 works with no code at all. L1 works on every
MCP host. L2 is a bonus, not a prerequisite. Nothing may be designed such that it only works at
L2.

**D-6 — Fail open on capability, closed on safety.** A missing hook degrades gracefully. A
protected-path violation is a hard block. The asymmetry is deliberate: unavailable features
should cost capability, never safety.

**D-7 — No credential handling, at all.** Not a policy — an architectural property. There is no
code path in the package that reads, stores, forwards, or logs a provider secret. This is
verified by a test that greps the source.

---

## STATE ON DISK

```
<PROJECT>/.apex/                 per-project ledger — see ../core/05-LEDGER.md
  config.json  REQUIREMENTS.md  PROGRESS.md  VERIFICATION.md  DECISIONS.md
  SUBAGENTS.md  HANDOFF.md  FINDINGS.md  MEMORY.md  COMPLETION.md
  runtime.json     ← written by the plugin: {"level":2,"version":"..."} (L2 detection)
  snapshots/       ← pre-change file copies, per REQ-ID (gitignored)
  archive/         ← verbose detail from verified-complete phases

<HOST_CONFIG>/                   e.g. ~/.config/opencode  or  %USERPROFILE%\.config\opencode
  plugins/apex.js                the built L2 plugin
  skills/apex-*/SKILL.md         doctrine as progressive-disclosure skills
  agents/apex-*.md               implementer / reviewer / researcher subagents
  commands/apex*.md              /apex, /apex-status, /apex-gate
  opencode.json                  merged, never replaced, .bak taken first

<USER_STATE>/apex/               %LOCALAPPDATA%\apex  or  ~/.local/state/apex
  logs/apex.log                  rotating, redacted
  logs/events.jsonl              structured event stream
  install.json                   what attach changed, so detach can undo it exactly
```

`install.json` matters more than it looks: it is what makes `detach` a real operation rather
than a guess, and it is what lets `doctor` tell the user precisely what state their machine is
in.

---

Next: `REQUIREMENTS.md` (the contract) · `ENGINES.md` (how each works)
