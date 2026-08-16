# ADAPTER — OpenCode

> You are running inside OpenCode. This is APEX's deepest binding: everything in `core/` can be
> mechanically enforced here rather than merely followed.

---

## CAPABILITY MAP

| APEX needs | OpenCode gives you | Level |
|---|---|---|
| Read/write files | `read`, `write`, `edit`, `patch` tools | L0 |
| Run verification | `bash` tool | L0 |
| Search | `grep`, `glob`, `list`, plus `GET /find` | L0 |
| Persist the ledger | Write to `.apex/` in the project | L0 |
| Real subagents | Agents with `mode: subagent`; Task tool; `@agent-name` | L0 |
| Subagent tracking | `GET /session/:id/children` | L1 |
| Session resume | `opencode -s <sessionID>` / `--continue` | L0 |
| Rollback | `snapshot` config + `POST /session/:id/revert` | L0 |
| Multi-model council | Multiple connected providers; `/provider` lists them live | L0 |
| Automatic verification gate | `tool.execute.after` hook | **L2** |
| Protected-path enforcement | `tool.execute.before` hook (hard block) | **L2** |
| System-prompt injection | `experimental.chat.system.transform` | **L2** |
| Permission automation | `permission.ask` hook | **L2** |
| Auto session recovery | `session.error` / `session.idle` events | **L2** |
| Context compaction control | `experimental.session.compacting` | **L2** |

---

## DETECT YOUR LEVEL

```
L2 — .apex/runtime.json exists and reports "level": 2
     The APEX plugin is installed. Rules are enforced by the host.
L1 — you have tools named apex_* but no runtime.json
     The APEX MCP server is connected. State is real; enforcement is not.
L0 — neither
     Doctrine only. You self-enforce. Still a large improvement.
```

Announce which one you are at. At L2 you can move faster because the guardrails are real; at L0
you must be more careful, because they are not.

---

## AT L0 — WHAT TO DO

### Verification

Discover the real commands once, record them in `.apex/config.json`:

```bash
cat package.json | grep -A20 '"scripts"'
cat Makefile justfile 2>/dev/null
cat pyproject.toml | grep -A10 '\[tool'
ls .github/workflows/
```

Then run them through the `bash` tool after every change (`03-EVIDENCE.md` cascade). OpenCode
also runs LSP — **diagnostics appear in tool output automatically**, so a type error often
surfaces without you asking. Read them; do not scroll past them.

### Subagents

Define them in `.opencode/agents/<name>.md`:

```markdown
---
description: Implements a single scoped module, verifies it, reports literal output
mode: subagent
temperature: 0.1
permission:
  edit: allow
  bash: allow
  webfetch: deny
---

You are an APEX implementer subagent.

Read the packet you are given. Implement exactly its scope — nothing more.
Run every command under REQUIRED VERIFICATION and paste the LITERAL output.
Report every file you changed, including ones you changed by accident.
If a criterion is impossible, say so with evidence. Never silently substitute
something easier.
Checkpoint every ~10 minutes: files touched, what works, what does not, exact next action.
```

Invoke with `@<name>` and the full packet from `06-DELEGATION.md`. Then verify it yourself —
Law 6 is not suspended because the host made delegation easy.

**Fleet runs** (`13-FLEET.md`) work fully here. OpenCode gives you the two things directed
delegation needs: a **live model catalog** (`/provider`), so you can check a user-named model
exists *before* dispatching rather than discovering it mid-run, and **child sessions**
(`POST /session` with `parentID`, listed via `GET /session/:id/children`) for real tracking.

When the user names models, check availability first and report honestly:

```
✓ model A   connected
✗ model B   not in this host's connected list — stopping, not substituting
```

`subagent_depth` in `opencode.json` caps nesting; raise it only if you genuinely need nested
delegation, since depth multiplies cost quadratically.

### Rollback

Ensure `snapshot` is enabled in the config. Then:

- `POST /session/:id/revert` with a `messageID` undoes back to that message
- `POST /session/:id/unrevert` restores
- For file-level precision, still take your own baseline (`04-LOOP.md` → BASELINE). Session
  revert is coarse; it will also undo things you wanted to keep.

### Multi-model council

Connected models are live from OpenCode's provider catalog. Two ways to reach a different
model:

1. Ask the user to switch model and re-run a specific review prompt — simple, no plumbing.
2. At L1+, `apex_council` does it programmatically via the HTTP API.

Never name a model you did not actually call.

### Persistent instructions

Put stable project facts where OpenCode loads them automatically:

```json
{ "instructions": ["AGENTS.md", ".apex/MEMORY.md"] }
```

Now your memory arrives in context for free every session, instead of costing a tool call.

---

## AT L1 — MCP TOOLS

When the APEX MCP server is connected, prefer these over doing the same work by hand. Their
state is durable; yours is not.

| Tool | Use |
|---|---|
| `apex_init` | Establish boundaries, create `.apex/`, load memory |
| `apex_req_add` / `apex_req_status` | Requirement inventory with enforced transitions |
| `apex_verify` | Run the cascade, capture literal output, write the verification row |
| `apex_snapshot` / `apex_rollback` | Baseline and surgical revert |
| `apex_delegate` | Spawn a supervised subagent from a packet |
| `apex_council` | Independent review by a different connected model |
| `apex_gate` | Run the completion gate; returns pass/fail with the failing items |
| `apex_handoff` | Generate the handoff from real recorded state |
| `apex_memory` | Read/write project memory |

`apex_req_status` **rejects illegal transitions** — you cannot mark something
`VERIFIED_COMPLETE` without a verification row pointing at it. That refusal is the point.

---

## AT L2 — WHAT THE PLUGIN ENFORCES

You do not have to remember these; they happen whether you remember or not.

- **Protected paths** are blocked at `tool.execute.before`. A `write` to a `do_not_touch` path
  fails with an explanation rather than succeeding quietly.
- **Verification runs automatically** after edits via `tool.execute.after`. Failures come back
  into your context in the same turn, before you can claim success.
- **The doctrine is injected** into every request through
  `experimental.chat.system.transform` — including the current requirement, recent failures,
  and relevant memory. You cannot drift from it, because it is re-stated every turn.
- **Permissions are answered by policy** at `permission.ask`, per your autonomy mode.
- **Failed sessions are recovered** automatically from `session.error` and `session.idle`
  events, using the last checkpoint.
- **Compaction preserves** the ledger and constraints via
  `experimental.session.compacting` — the thing that normally gets compacted away first.

At L2, spend your attention on the work rather than on remembering the rules.

---

## OPENCODE-SPECIFIC NOTES

**Config is merged, not replaced.** `opencode.json` at global, `OPENCODE_CONFIG`, project, and
`.opencode/` layers all combine. Adding APEX never removes the user's existing setup.

**Write Windows paths correctly.** In JSON, `C:\Users\x` must be `C:\\Users\\x` or
`C:/Users/x`. A single backslash is an invalid escape and the whole config silently fails to
load. *This exact bug disabled the previous version of this system for weeks.* If a config
change appears to have no effect, validate the JSON first:

```bash
node -e "JSON.parse(require('fs').readFileSync('opencode.json','utf8')); console.log('valid')"
```

**Directories are plural:** `agents/`, `commands/`, `plugins/`, `skills/`, `tools/`. Singular
still works for backward compatibility, but use plural.

**`subagent_depth`** controls nesting. Raise it only if you actually need nested delegation;
depth multiplies cost quadratically.

**Skills** (`.opencode/skills/<name>/SKILL.md`) are progressive-disclosure instruction
bundles. APEX ships its core as skills at L2 so doctrine loads on demand instead of all at
once.

---

## GOING DEEPER

```bash
npx apex-agent@latest attach --host opencode
```

One command, any level: `npx apex-agent attach`. Not required — L0 works today.
In the project repository, see `install/ATTACH.md` for the full breakdown.
