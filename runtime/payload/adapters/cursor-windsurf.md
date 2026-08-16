# ADAPTER — Cursor / Windsurf / Zed / Copilot / IDE agents

> You are running inside an IDE-embedded agent. Strong at editing, weaker at process control.
> The gaps are real; work around them honestly rather than pretending they are not there.

---

## CAPABILITY MAP

| APEX needs | Typically available | Gap to manage |
|---|---|---|
| Read/write files | Yes — this is the core strength | — |
| Run commands | Usually (agent terminal) | Sometimes needs per-command approval |
| Search | Yes — often semantic, plus grep | Semantic search can miss exact strings; use grep for symbols |
| Ledger files | Yes | — |
| Subagents | **Usually not** | Simulate — see below |
| Session resume | Partial — chat history persists, context does not | Ledger carries the weight |
| Rollback | Editor undo + git | Editor undo is per-file and unreliable across sessions |
| Multi-model | Model picker, but one at a time | Council must be sequential |
| Persistent instructions | `.cursorrules` / `.cursor/rules/` / `.windsurfrules` / `.github/copilot-instructions.md` | Auto-loaded — use it |
| MCP | Cursor and Windsurf: yes | This is your route to L1 |

**Level:** L0 by default. L1 if you add the APEX MCP server (Cursor: Settings → MCP; Windsurf:
`mcp_config.json`).

---

## THE THREE REAL GAPS

### 1. No subagents

You cannot spawn an isolated agent with its own context. Three honest options, in order of
preference:

1. **Sequential packets in one session.** Run each packet from `core/06-DELEGATION.md`
   yourself, one at a time, clearing context between them. Slower; entirely honest; works.
2. **A second chat window.** Open a new chat, paste the packet, let it run, bring the result
   back and verify it. Manual, but it gives genuine context isolation — which is most of what a
   subagent is for.
3. **A CLI agent in the terminal.** If `opencode`, `claude`, or another CLI agent is installed,
   the IDE agent can invoke it as a subprocess with the packet as its prompt, and read the
   output file.

Do **not** simulate subagents by role-playing several personas in one context. They share your
context and your blind spots, so the "independent review" is not independent. It produces
confident agreement and zero error detection.

### 2. Command execution is gated

Many IDE agents ask before each terminal command, which makes the verification cascade
(`core/03-EVIDENCE.md`) expensive in interruptions.

Mitigations:

- **Batch the cascade into one command.** One approval instead of four:
  ```bash
  mypy src/ && ruff check src/ && pytest tests/test_auth.py
  ```
- **Add a single verify script** to the project and run only that:
  ```bash
  # scripts/verify.sh
  set -e
  mypy src/ && ruff check src/ && pytest "$@"
  ```
- **Allowlist** the verify command in the agent's settings if it supports one.

Do not respond to the friction by skipping verification. The friction is the cost of L0; the
answer is fewer, bigger checks — not fewer checks.

### 3. Long sessions silently degrade

IDE agents typically compact aggressively and without telling you. Constraints from early in
the session disappear first.

The defence is `core/05-LEDGER.md`, applied more strictly than elsewhere:

- Write to `.apex/` after **every** unit, not every few
- Re-read `.apex/config.json` before any destructive action — do not trust your memory of the
  protected paths
- Put constraints in the rules file (below) so they reload automatically
- Watch for the warning signs in `core/08-CONTEXT.md` and hand off early

---

## THE RULES FILE — DO THIS FIRST

Every one of these hosts auto-loads a rules file. That is free, permanent context. Put the
compressed doctrine there so it survives compaction:

| Host | File |
|---|---|
| Cursor | `.cursor/rules/apex.mdc` (or legacy `.cursorrules`) |
| Windsurf | `.windsurfrules` |
| Copilot | `.github/copilot-instructions.md` |
| Zed | `.rules` |

```markdown
# APEX operating rules

Full doctrine: <path-to-APEX>/START-HERE.md
Project state: .apex/ — read HANDOFF.md and REQUIREMENTS.md at the start of every session.

## Non-negotiable
1. Never claim something works without running it. State the command and its literal output.
2. Every requirement has an ID and one status. Nothing silently disappears.
3. Build what was specified. Do not simplify, substitute, or improve it.
4. Never attempt the same failing fix twice — change the approach on the second failure.
5. Never modify: config/prod.yaml, migrations/, vendor/
6. Never read: .env, secrets/, api-key.md
7. Verify after every edit: `bash scripts/verify.sh`
8. Update .apex/ after every unit of work. Context is lost; files are not.
9. "Complete" requires the gate in core/10-GATE.md. Nothing else earns the word.
```

Keep it short. These files are loaded on every request, so length is a permanent tax.

---

## WHAT THESE HOSTS ARE GENUINELY BEST AT

Play to it rather than fighting the gaps:

- **Multi-file edits with real symbol awareness.** The LSP integration is better than most CLI
  agents have. Trust the rename, the go-to-definition, the reference list.
- **Instant blast-radius checks.** "Find all references" answers `core/02-COGNITION.md`'s
  question 3 in one keystroke. Use it every time.
- **Inline diagnostics.** Type errors and lint errors appear as you edit — that is Tier 2
  verification for free, continuously. **Read them.** An agent that ignores the red squiggles in
  its own editor is discarding the cheapest evidence available to it.
- **The human is right there.** Escalation is nearly free here. When
  `core/09-RECOVERY.md` says ask, asking costs seconds — so ask earlier than you would in a
  headless session.

---

## GOING DEEPER

**Cursor** — Settings → MCP → add:
```json
{ "mcpServers": { "apex": { "command": "npx", "args": ["-y", "apex-agent@latest", "mcp"] } } }
```

**Windsurf** — the same block in `~/.codeium/windsurf/mcp_config.json`.

This gives you `apex_*` tools: durable ledger, enforced status transitions, real verification
records, and the completion gate. It does not give you subagents — that limit is the host's.

One command, any level: `npx apex-agent attach`.
In the project repository, see `npx apex-agent attach` for the full breakdown.
