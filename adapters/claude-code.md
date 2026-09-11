# ADAPTER — Claude Code

> You are running inside Claude Code (CLI, desktop, web, or an IDE extension).
> Strong native support for almost everything APEX needs.

---

## CAPABILITY MAP

| APEX needs | Claude Code gives you | Notes |
|---|---|---|
| Read/write | `Read`, `Write`, `Edit` | `Read` before `Edit` is enforced by the harness |
| Verification | `Bash` | Full cascade available |
| Search | `Grep`, `Glob` | Ripgrep-backed; use these over `bash grep` |
| Ledger | Write to `.apex/` | Plain files |
| Subagents | `Task` tool with `subagent_type` | Real isolated agents |
| Subagent definitions | `.claude/agents/*.md` | Frontmatter: description, tools, model |
| Session resume | `claude --resume` / `--continue` | Context preserved |
| Task tracking | `TaskCreate` / `TaskUpdate` | Use it — the user sees progress live |
| Persistent instructions | `CLAUDE.md` | Auto-loaded every session |
| Permission policy | `.claude/settings.json` | Allowlist reduces prompts |
| Hooks | `settings.json` hooks | Pre/post tool-use enforcement — this is your L2 |
| Plan mode | `EnterPlanMode` / `ExitPlanMode` | Good fit for APEX Phase 1 |
| MCP | `.mcp.json` / `claude mcp add` | This is how you reach L1 |

---

## LEVEL

- **L0** — doctrine only (default)
- **L1** — the APEX MCP server is connected; you have `apex_*` tools
- **L2-equivalent** — settings.json **hooks** enforce protected paths and post-edit
  verification mechanically. Claude Code has no plugin API as deep as OpenCode's, but hooks
  cover the two things that matter most.

---

## MAPPING THE DOCTRINE

### The ledger

`.apex/` files as specified in `core/05-LEDGER.md`. Also mirror the requirement table into
`TaskCreate`/`TaskUpdate` so the user sees live progress — but the **files remain
authoritative**. The task list is a view; the ledger is the record.

### Verification

`Bash` runs the full cascade. Prefer `Grep`/`Glob` over shelling out — they are faster and
integrate with the permission UI.

Record the project's real commands in `.apex/config.json` at intake. Add them to
`.claude/settings.json` as allowed so they stop prompting:

```json
{
  "permissions": {
    "allow": ["Bash(pytest:*)", "Bash(mypy:*)", "Bash(ruff check:*)", "Bash(git status)", "Bash(git diff:*)"]
  }
}
```

### Subagents

Define in `.claude/agents/apex-implementer.md`:

```markdown
---
name: apex-implementer
description: Implements one scoped requirement, verifies it, reports literal output
tools: Read, Write, Edit, Bash, Grep, Glob
---

You are an APEX implementer subagent.

Implement exactly the scope in your packet. Nothing adjacent, nothing extra.
Run every command under REQUIRED VERIFICATION. Paste the LITERAL output — not a summary.
Report every file you changed.
If a criterion cannot be met, say so with evidence. Never substitute something easier.
Your final message is your entire report: the parent sees nothing else.
```

Then `Task` with `subagent_type: "apex-implementer"` and the packet from
`core/06-DELEGATION.md`.

**Two Claude Code specifics:**
- The subagent's final report is **not shown to the user** — relay what matters yourself.
- Use `SendMessage` with the agent's ID to continue an existing agent with its context intact.
  A fresh `Task` call starts cold and re-derives everything. Prefer continuation for recovery
  (`core/06-DELEGATION.md` → resume, do not restart).

Spawn agents in the background by default so the user can interject; foreground only when your
very next action depends on the result.

**Fleet runs** (`13-FLEET.md`): directed orders work here — multiple `Task` calls in one block
run concurrently, which is genuine within-wave parallelism, not a queue. Two constraints to be
honest about: model selection is per-agent-definition rather than a live catalog, so verify
what you can and say what you cannot; and the same write-safety rule applies — one writer at a
time unless the paths are provably disjoint.

Against the default "do not spawn unless asked": a **directed order is the user asking**. When
they say "run 5 subagents", spawn 5. When they gave no order, the autonomous criteria in
`13-FLEET.md` apply and you must announce the decision before acting on it.

### Rollback

Git is the primary mechanism. Claude Code also tracks file edits, but do not rely on that
across sessions.

```bash
git rev-parse HEAD          # baseline
git checkout <sha> -- path/to/specific/file.py     # surgical revert
```

Never `git reset --hard`, `git clean -fd`, or blanket `git stash` — Law 9, and the user's
uncommitted work is not yours.

### Hooks — your enforcement layer

This is the highest-value Claude Code-specific setup. In `.claude/settings.json`:

- **PreToolUse** on `Write|Edit` → a script that rejects paths in `do_not_touch`. This turns
  Law 8 from a promise into a mechanism.
- **PostToolUse** on `Write|Edit` → run the parse/type check on the edited file. Failures come
  straight back into your context in the same turn.
- **Stop** → verify the ledger is current before the turn ends.

Ask the user before adding hooks — they change harness behaviour globally. The `update-config`
skill can set them up correctly.

### Memory

`CLAUDE.md` in the project root is loaded automatically every session. Mirror the **stable**
facts from `.apex/MEMORY.md` there:

```markdown
# Project notes
## Commands
- test: `pytest` (from repo root — conftest sets sys.path)
- types: `mypy src/`
## Traps
- `pytest -n auto` is flaky; the DB fixture is not parallel-safe
## Do not retry
- pydantic v2 upgrade — breaks 40 files, deliberately deferred (2026-08-15)
```

Free context every session, no tool call required.

### Plan mode

`EnterPlanMode` maps well onto APEX Phase 1 (Intake). Use it to read sources and build the
requirement inventory without touching anything, then `ExitPlanMode` to execute.

Do not use it to avoid starting — Law 12. The default expectation is implementation.

### Durable state and capabilities

**Durable state.** `CLAUDE.md` mirrors *project* memory, but APEX's **global home** — personal
memory (`<global home>/memory/`), learned skills (`skills/`), the session archive (`archive/`)
— lives outside the project and survives new sessions, new models and new projects. At L1 the
`apex_memory_*`, `apex_skill_*` and `apex_session_*` tools write it with scan, gate and atomic
commit; a read-only home stages instead of writing, honestly. **What Claude Code does not
enforce:** hooks can guard project paths, but nothing here verifies the global home took your
write. If it did not, the mutation is staged — say "staged", never "saved" or "remembered".
Layout and rules: `core/14-DURABLE-STATE.md`.

**Capabilities.** Check what you can actually reach (`Bash`, `Grep`, `Task`, connected MCP
servers) before planning tool-heavy work; `core/16-CAPABILITIES.md` and, at L1,
`apex_capability_*` keep the registry instead of your guesses. **What Claude Code does not
enforce:** a model name in a `Task` definition that cannot load is still your problem — verify,
or say UNAVAILABLE with the concrete effect and the real fallback
(`core/16-CAPABILITIES.md`). Never describe a hypothetical result as if you observed it.

---

## THINGS TO GET RIGHT HERE

**Read before Edit.** The harness enforces it, and it is also `core/04-LOOP.md` → GROUND. Do
not fight it; it is preventing a real class of error.

**Do not re-read after editing to verify.** `Edit` errors if it fails. Re-reading to confirm is
wasted context. Verify with the *oracle* (test, typecheck), not with your eyes.

**Use `Grep` over `bash grep`.** Results integrate with the UI and produce clickable file links.

**Parallel independent calls.** Multiple tool calls with no dependency between them go in one
block. This is real throughput, not a style preference.

**Format file references as links** — `[auth.py:44](src/auth.py:44)` — they are clickable for
the user.

**Do not spawn agents unless the user asked**, or the work genuinely fans out. Each spawn
starts cold and re-derives context you already hold. Most tasks are cheaper inline.

---

## GOING DEEPER

```bash
claude mcp add apex -- npx -y apex-agent@latest mcp
```

One command, any level: `npx apex-agent attach`.
In the project repository, see `install/ATTACH.md` for the full breakdown.
