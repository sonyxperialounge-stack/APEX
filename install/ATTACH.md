# ATTACH

> How to bind APEX at each level.
>
> **All three levels are built.** L0 needs no software at all. L1 and L2 come from the
> runtime in [`../runtime/`](../runtime/), which is built, tested, and live-verified against
> real OpenCode 1.18.18.

---

## L0 — DOCTRINE  *(available now)*

Nothing to install. Three ways in, from least to most permanent.

### One-off

Paste into any AI, in any tool:

```
Read and follow: D:/multiworker opencode/Army-V3/START-HERE.md
```

Use the real path on your machine. Forward slashes work everywhere and avoid escaping problems.

If your tool cannot read local files, paste the **contents** of `START-HERE.md` instead — it is
written to work standalone. See its final section, *If you can only read this one file*.

### Per project  *(recommended)*

Add one line to whichever instructions file your tool already loads:

| Tool | File |
|---|---|
| OpenCode, Codex CLI, most CLI agents | `AGENTS.md` |
| Claude Code | `CLAUDE.md` |
| Cursor | `.cursor/rules/apex.mdc` |
| Windsurf | `.windsurfrules` |
| Gemini CLI | `GEMINI.md` |
| Copilot | `.github/copilot-instructions.md` |
| Zed | `.rules` |

```markdown
## APEX

Operate under APEX. Read <APEX_PATH>/START-HERE.md before starting work.
Project state lives in .apex/ — read HANDOFF.md and REQUIREMENTS.md first.

Non-negotiable:
- Never claim something works without running it. Give the command and its literal output.
- Every requirement gets an ID and exactly one status. Nothing silently disappears.
- Build what was specified. Do not simplify, substitute, or improve it.
- Never attempt the same failing fix twice — change approach on the second failure.
- "Complete" requires the gate in <APEX_PATH>/core/10-GATE.md.
```

Every session in that project now starts disciplined, with no prompting from you.

### Vendored into the project

If the project is shared, copy `core/`, `adapters/`, `templates/`, and `START-HERE.md` into
`<project>/apex/` and commit them. Now every collaborator's AI gets the same doctrine, and the
paths are relative rather than machine-specific.

### Set up the ledger

Ask the AI once:

```
Initialise the APEX ledger for this project. Follow core/05-LEDGER.md.
My constraints:
  never modify: config/prod.yaml, migrations/
  never read:   .env, secrets/
  autonomy:     GUARDED
```

It creates `.apex/` from the templates. From then on it maintains it. Commit `.apex/` (with
`.apex/snapshots/` gitignored) — it is the project's record of how it was built.

---

## L1 — MCP

Real state, enforced status transitions, recorded verification, the completion gate — on any
MCP-capable host.

**Claude Code**
```bash
claude mcp add apex -- npx -y apex-agent@latest mcp
```

**Cursor** — `~/.cursor/mcp.json`
```json
{
  "mcpServers": {
    "apex": { "command": "npx", "args": ["-y", "apex-agent@latest", "mcp"] }
  }
}
```

**Windsurf** — the same block in `~/.codeium/windsurf/mcp_config.json`.

**OpenCode** — only if you are not using L2; the plugin registers these tools natively.
```json
{
  "mcp": {
    "apex": {
      "type": "local",
      "command": ["npx", "-y", "apex-agent@latest", "mcp"],
      "enabled": true
    }
  }
}
```

> **Windows paths in JSON must use forward slashes or doubled backslashes.** `C:/work/app` or
> `C:\\work\\app`. A single backslash is an invalid escape and the *entire config* silently
> fails to load with no obvious error. This exact mistake disabled the previous version of this
> system for weeks.
>
> Validate any config you hand-edit:
> ```bash
> node -e "JSON.parse(require('fs').readFileSync('opencode.json','utf8'));console.log('valid')"
> ```

Verify it worked: ask the model to call `apex_status`. If it returns ledger state, you are at
L1.

---

## L2 — NATIVE  *(OpenCode only)*

The deepest binding. Protected paths are blocked by the host. Verification runs automatically
after every edit and returns in the same turn. Failed sessions recover themselves. Constraints
survive compaction.

```bash
npx apex-agent@latest attach
```

That is the whole thing. It detects your host, installs the plugin, copies the doctrine, merges
your config non-destructively (with a `.bak`), creates the ledger, and runs a health check.

```
$ npx apex-agent attach

APEX 1.0.0

Detected:
  ✓ OpenCode      1.2.4    ~/.config/opencode
  ✓ Claude Code   2.1.0    ~/.claude

Attaching to OpenCode  (L2 — native plugin)
Attaching to Claude Code (L1 — MCP)

  ✓ plugin installed
  ✓ doctrine payload copied (12 core files, 10 templates)
  ✓ opencode.json merged — 4 keys added, 7 preserved, backup written
  ✓ ledger created in D:/work/myapp/.apex
  ✓ health check passed

LEVEL 2. Run `/apex <task>` in OpenCode to begin.
```

**Other commands**

```bash
npx apex-agent doctor      # what is installed, what is broken, how to fix it
npx apex-agent detach      # remove cleanly, restoring your original config
npx apex-agent status      # ledger summary for the current project
npx apex-agent init        # create .apex/ only, no host changes
```

---

## VERIFYING YOUR LEVEL

Ask the AI:

```
What APEX level are you at, and what is enforcing it?
```

| Answer | Meaning |
|---|---|
| L0 | It is following the doctrine voluntarily. Real improvement, no enforcement. |
| L1 | `apex_*` tools present. State is durable; illegal status jumps are rejected. |
| L2 | `.apex/runtime.json` reports level 2. The host is blocking violations. |

If it claims a level without being able to show the mechanism, it is at L0 and mistaken. Ask it
to check for `apex_*` tools and for `.apex/runtime.json`.

---

## MULTIPLE HOSTS AT ONCE

Attach to as many as you like. They share the project ledger, so work started in one continues
in another — start in Cursor, finish in OpenCode, and the requirement statuses, evidence, and
resume point carry across.

The only rule: **do not run two agents against the same files simultaneously.** They will
overwrite each other silently. One writer at a time (`../core/06-DELEGATION.md` → Write
safety).

---

## REMOVING IT

**L0** — delete the line from your instructions file. `.apex/` can stay; it is a useful record.

**L1** — remove the MCP entry from the host config.

**L2** — `npx apex-agent detach`. It reads `install.json`, deletes only what it created, and
restores each modified config from its backup. `.apex/` is left alone — it is yours.

---

## TROUBLESHOOTING

**The AI ignored the doctrine.** Check it actually read the file — ask it to quote Law 1. If it
cannot read local files, paste the contents of `START-HERE.md` directly.

**"Plugin not loading" (L2).** Validate the JSON first — this is the most common cause by a
wide margin:
```bash
node -e "JSON.parse(require('fs').readFileSync('opencode.json','utf8'));console.log('valid')"
```
Then `npx apex-agent doctor`, then start OpenCode with `--print-logs`.

**Verification never runs.** The project's commands were not detected. Fill in
`verify_commands` in `.apex/config.json` by hand and the AI will use them from then on.

**It still claims things without checking.** Point it at `core/03-EVIDENCE.md` and ask which
tier its last claim was at. At L0 this is a real limitation — the doctrine asks; only L2
enforces.

**Ledger got out of sync with reality.** Ask it to reconcile: `core/09-RECOVERY.md` →
*Resuming after interruption*. Code is truth; the ledger is a claim.

---

Back to: [`../README.md`](../README.md) · [`../START-HERE.md`](../START-HERE.md)
