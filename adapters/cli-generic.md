# ADAPTER — Generic CLI agents

> Codex CLI, Gemini CLI, Aider, Goose, Continue, Cline, Amp, and anything else that runs in a
> terminal with file and shell access.
>
> If your host is not listed, this file still applies — the capability probe below tells you
> what you actually have.

---

## PROBE YOUR CAPABILITIES FIRST

Do not assume. Find out, in about thirty seconds, and record the answers in
`.apex/config.json` so no future session has to re-derive them.

| Question | How to find out | If no |
|---|---|---|
| Can I write files? | Write `.apex/probe.txt`, read it back, delete it | You are in a chat window → `generic.md` |
| Can I run commands? | `echo apex-ok` | No verification above Tier 1. Say so explicitly. |
| Is there a test runner? | Look in `package.json`, `Makefile`, `pyproject.toml`, `.github/workflows/` | Tier 2 is your ceiling. Record it. |
| Is there git? | `git rev-parse --show-toplevel` | Use `.apex/snapshots/` for all baselines |
| Are there subagents? | Check for a task/spawn/agent tool or `--agent` flag | Sequential packets — see below |
| Can I resume a session? | `--continue`, `--resume`, `-s <id>` in `--help` | The ledger carries everything |
| Is there MCP support? | Check for `mcp` in `--help` or the config schema | Stay at L0 |
| Multiple models? | `--model` flag, or a models command | Council is sequential or unavailable |

Write the results down. Then state your honest level to the user:

> APEX active at L0. This host can run commands and has pytest, so I can verify to Tier 4.
> No subagent support — I will run delegated packets sequentially. No MCP, so the ledger is
> plain files in `.apex/`.

---

## THE CORE SETUP

Whatever the host, these three things carry APEX:

### 1. The ledger — `.apex/`

Exactly as in `core/05-LEDGER.md`. This is what makes a CLI agent survive its own session
boundaries. Write after every unit. On a host with weak resume, this file set *is* the
continuity.

### 2. The verify script

Create it once, run it everywhere. It turns the whole cascade into one approval and one
command:

```bash
#!/usr/bin/env bash
# scripts/apex-verify.sh — exits non-zero on the first real failure
set -euo pipefail
echo "── types"; mypy src/
echo "── lint";  ruff check src/
echo "── tests"; pytest "$@"
echo "── OK"
```

Record it in `.apex/config.json` under `verify_commands` and never guess again.

### 3. The instructions file

Most CLI agents auto-load one. Put the compressed doctrine there so it survives compaction and
reloads on every session:

| Host | File |
|---|---|
| Codex CLI | `AGENTS.md` |
| Gemini CLI | `GEMINI.md` |
| Aider | `CONVENTIONS.md` (add via `--read`) |
| Goose | `.goosehints` |
| Cline / Continue | `.clinerules` / `.continuerules` |
| Unknown | `AGENTS.md` — the emerging common convention, and read by several hosts |

Contents: the same compressed rules block as in `cursor-windsurf.md`, plus a pointer to
`START-HERE.md` and to `.apex/`.

---

## SIMULATING WHAT IS MISSING

### No subagents

Run the packets from `core/06-DELEGATION.md` yourself, sequentially, one at a time. Between
packets, clear or compact context so each starts reasonably clean.

If a second agent binary is installed, you can get real isolation:

```bash
opencode run "$(cat .apex/packets/SUB-007.md)" > .apex/packets/SUB-007-result.md 2>&1
# or
claude -p "$(cat .apex/packets/SUB-007.md)" > .apex/packets/SUB-007-result.md 2>&1
```

Writing the result to a **file** rather than reading it from stdout is what makes this
recoverable — if the process dies, the partial output survives and becomes the checkpoint.

Then verify it yourself. Law 6 applies exactly the same to a subprocess as to a native
subagent.

### No session resume

The ledger is the resume mechanism. Before ending any session, write `HANDOFF.md`. A fresh
process reads it and continues. This is why `core/05-LEDGER.md` is stricter than it looks —
on these hosts it is not a nicety, it is the only continuity you have.

### No rollback

```bash
mkdir -p .apex/snapshots/REQ-014
cp src/auth.py .apex/snapshots/REQ-014/
# ... work ...
# to revert:
cp .apex/snapshots/REQ-014/auth.py src/auth.py
```

Copy only the files you are about to touch. Never snapshot or restore the whole tree — Law 9.

### No multiple models

Council becomes: **review in a fresh process with a clean context**, given only the requirement
and the diff, with none of your reasoning. That recovers most of the independence that matters,
because the anchoring effect comes from sharing the reasoning, not from sharing the weights.

```bash
opencode run "Review this diff against this requirement. Assume there is at least one
defect and find it. Requirement: <...>. Diff: <...>" > .apex/review.md
```

---

## HEADLESS AND NON-INTERACTIVE MODE

Many CLI agents run one-shot (`-p`, `run`, `--prompt`). APEX matters *more* here, not less —
nobody is watching.

- **Autonomy defaults to `GUARDED`**, and there is no one to ask. So anything that would
  require asking becomes `BLOCKED` and goes in the report. Do not silently escalate your own
  permissions because a human is not present to say no.
- **Every claim goes in the output**, with its evidence, because the transcript is the entire
  record.
- **Write the ledger before exiting.** A one-shot run that produces no `.apex/` state is a run
  whose work cannot be continued.
- **Exit codes matter.** If the gate does not pass, say so in the output and exit non-zero if
  the host lets you. A CI job that goes green on incomplete work is worse than one that fails.

---

## HOST-SPECIFIC NOTES

**Aider** edits via git commits by default. That is your baseline mechanism for free — use
`--no-auto-commits` if you want to control commit granularity yourself, and record the SHA
before each unit either way.

**Gemini CLI / Codex CLI** are sandbox-aware. Establish early what the sandbox blocks —
network, writes outside the project, subprocess spawning — and record it in
`.apex/config.json`. Discovering it mid-task is how sessions get wasted.

**Cline / Continue** run inside VS Code — the notes in `cursor-windsurf.md` about inline
diagnostics apply. Read the squiggles; that is free Tier 2 evidence.

**Goose** has extensions/MCP support, which is a route to L1.

---

## STAYING HONEST HERE

CLI hosts vary enormously, and the temptation is to describe a capability you do not have.

- If you cannot run tests, say **"Tier 2 only — no test runner available in this
  environment"**, not "verified".
- If you ran packets sequentially, say that. Do not call it "parallel subagents".
- If the sandbox blocked something, name what it blocked.
- If you could not write files, say the ledger is in-context only and will be lost.

An honest L0 report is genuinely useful. A dishonest one that describes an L2 setup is worse
than no report at all.

---

## GOING DEEPER

If the host supports MCP:

```bash
npx -y apex-agent@latest mcp        # stdio server; register per your host's config
```

Full detail: `../install/ATTACH.md`.
