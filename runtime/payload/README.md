# APEX — ARMY V3

[![verify](https://github.com/sonyxperialounge-stack/APEX/actions/workflows/verify.yml/badge.svg)](https://github.com/sonyxperialounge-stack/APEX/actions/workflows/verify.yml)

**An operating doctrine that makes any AI coding agent work like a disciplined senior engineer.**

> **Which version is this?** The package is **`apex-agent` 2.0.0**, released as
> **"the V4 release"** (full list in the changelog in the project repository). "**ARMY V3**" is the
> product's **legal name** — the exact term the LICENSE defines and protects — so it stays
> on the title and in every file header. Name = ARMY V3 · Release = V4 · Package version =
> 2.0.0. Three labels, one product, zero contradiction.

Give any AI model the link to [`START-HERE.md`](START-HERE.md) — or to this folder — and it
configures itself. No install, no setup, no dependency on which model or which tool you use.

---

## What is APEX, in one paragraph

APEX is a set of plain-text doctrine files plus an optional runtime that you attach to any
AI coding agent (OpenCode, Claude Code, Cursor, Windsurf, Zed, Goose, or a bare CLI). The
doctrine replaces the agent's worst habits — claiming "done" without checking, dropping
requirements, looping on a failing fix — with a discipline: **every claim needs evidence,
every requirement is tracked in a durable ledger on disk, and nothing is called complete
while anything is unverified.** The runtime (this package, `apex-agent`) makes that
discipline mechanical: real state, enforced status transitions, recorded command output,
and a completion gate that refuses to lie.

---

## What problem this solves

AI coding agents rarely fail because they are not smart enough. They fail because:

- They say "done" without checking.
- They lose track of half the requirements in a long task.
- They try the same broken fix five times.
- They forget a constraint you gave them twenty messages ago.
- They delegate to a subagent and trust whatever it reports.
- They read a 40-point plan, build 28 of them, and report success.

None of that is an intelligence problem. It is a **discipline and grounding** problem — and
discipline can be transplanted into any model that can read.

The one law everything else follows from:

> **An agent's output quality is bounded by its verifier, not by its intelligence.**
> A modest model that checks everything beats a brilliant model that checks nothing.

---

## Is it real? An honest answer

**Yes, for work that can be checked.** Code, bug fixes, refactors, migrations, tests, repo-wide
changes — anything with an executable oracle. Here a mid-tier model running APEX genuinely
beats a frontier model running bare, because the frontier model's mistakes go uncaught too.

**No, for work that cannot be checked.** Writing quality, novel architectural insight,
ambiguous judgment. There the base model's ceiling holds. No orchestration invents capability
that is not already in the model — it can only harvest more of it and filter the errors.

**And in every case:** APEX improves whatever model you attach it to. Run it on the strongest
model you have and that model gets better too. The goal is not to turn a small model into a
frontier one. It is to stop every model from throwing away most of what it is already capable
of.

---

## The three levels

Same brain, three depths of binding. Each works alone; each lower one enforces the one above.

| Level | Binding | Discipline is | Works with | Status |
|---|---|---|---|---|
| **L0 — Doctrine** | The AI reads these files | *self-enforced* | Literally any model, anywhere | ✅ works now |
| **L1 — MCP** | An APEX MCP server is connected | *assisted* — real state, enforced transitions, recorded evidence | Claude Code, Cursor, Windsurf, OpenCode, Zed, Goose | ✅ **built** |
| **L2 — Native** | The APEX plugin runs inside the host | *mechanical* — the host blocks violations | OpenCode | ✅ **built** |

What each level actually gives you:

- **L0** — the agent reads `core/` (sixteen doctrine files, loaded on demand) and follows
  the seven-step loop: read the ledger → plan → execute with evidence → record → verify →
  update state → report honestly. Nothing is installed; the files are the whole mechanism.
  It is only as strong as the model's willingness to comply — which is exactly what the
  higher levels fix.
- **L1** — the agent gets MCP tools backed by real stores on disk: a requirements ledger
  whose status transitions are enforced by code (you cannot mark a requirement
  VERIFIED_COMPLETE without a PASS verification record), grounded verification that stores
  the *literal* command output, and a memory store that survives the session.
- **L2** — the host itself enforces the doctrine: protected paths cannot be written even
  by accident, hooks run on every tool call, and the plugin blocks — not asks,
  *blocks* — when a rule is violated. OpenCode is the first host with this depth.

All three levels are built. `attach` installs the deepest binding your host supports:

```bash
npx apex-agent attach
```

---

## What is new in this release (2.0.0 — the V4 release)

The discipline is unchanged. What is new — full list in the changelog in the project repository:

### It remembers now (personal memory)

Preferences and hard-won facts survive across sessions, projects and models. Everything it
keeps is visible in one place (`memory journey`), and you have the final word: correct any
record (`memory correct`), retract it with a recorded reason (`memory retract --reason`),
approve or reject anything it wants to save (`memory pending` → `memory approve` /
`memory reject`), or switch the whole store off (`memory off`). Sensitive content is
redacted before it ever lands on disk.

### It learns procedures (the skill library)

A solution that survived verification can be saved as a skill and reused. The path is
deliberately gated: `skills stage` → the linter and trust scans check it → `skills pending`
shows what is waiting → `skills promote` activates it only after the checks pass, and
bypassing that needs your explicit, recorded override. Skills you no longer trust are
retired (`skills retire --reason`) and can be relearned. A skill you pinned stays active;
a skill whose bytes drift from its trusted hash stops until re-granted.

### It knows what it can actually do (capability disclosure)

At session start it looks at the tools your host *really* provides and builds a capability
registry. If something is unavailable it says UNAVAILABLE with the reason instead of
pretending — and a provider going away degrades exactly the capabilities that depended on
it, never silently.

### It picks up where it left off (session archive)

Sessions are archived as structured events. A different model tomorrow reads the same
files — `session list`, `session search`, `archive browse`, `archive read` — and continues
without losing the thread.

### It diagnoses itself (doctor)

`apex-agent doctor` is read-only and safe to run any time, on any machine, even before any
setup: it checks the host binding, the global home, every store's schema, lock health,
ledger integrity, and prints a `fix:` hint next to every warning. `apex-agent doctor
--repair` performs only the idempotent reconstructions (home structure, hot views, search
index) — never a content change.

### The gate still refuses to lie

`apex-agent gate` runs the completion gate: every requirement VERIFIED_COMPLETE with a PASS
verification record, nothing regressed, no unmet criteria waved through. An empty or
half-done ledger **fails** the gate — on your machine today exactly as it did in the release
tests.

---

## Requirements

- **Node.js ≥ 22.6** — the floor the package declares; the code uses native TypeScript
  stripping that exists from 22.6 on. No build step is required of you.
- **Zero dependencies.** `dependencies: {}` — nothing to audit, nothing to break, works
  fully offline after install.
- **No credentials, ever.** APEX has no code path that reads, stores, or forwards a
  provider key. The host owns authentication.
- **No telemetry, no account, no network calls.** Your code and your data never leave
  your machine.

Verified environments: the full OS × Node matrix in CI — Windows, Linux and macOS ×
Node 22.6 / 22 / 24, all green (badge at the top). Details in
(`docs/RELEASE-VERIFICATION.md` in the project repository).

---

## Using it today

### Any AI, any tool

Give the model this, and nothing else:

```
Read and follow: <path-to-this-folder>/START-HERE.md
```

It reads the file, identifies its own host, binds to the right adapter, sets up a `.apex/`
ledger in your project, and starts working under the doctrine. That is the whole setup.

### Make it permanent for a project

Add one line to whichever instructions file your tool already reads — `AGENTS.md`,
`CLAUDE.md`, `.cursorrules`, `.windsurfrules`, `GEMINI.md`:

```markdown
Operate under APEX. Read <path-to-this-folder>/START-HERE.md before starting work.
Project state lives in .apex/ — read HANDOFF.md and REQUIREMENTS.md first.
```

Now every session in that project starts disciplined, automatically.

### Install the runtime (L1/L2)

```bash
npx apex-agent attach        # installs the deepest binding your host supports
npx apex-agent doctor        # confirm what was installed and what it found
```

`attach` never asks for credentials, never touches your host's own settings beyond adding
the APEX binding, and `detach` removes it cleanly — deleting nothing personal.

---

## What you will notice

| Before | With APEX |
|---|---|
| "I've fixed the bug." | "Changed `auth.py:44`. Ran `pytest tests/test_auth.py` → 6 passed, 0 failed. Output below." |
| Silently drops requirements 12–23 | "23 requirements. 19 verified, 2 unverified (no credentials here), 1 blocked, 1 N/A." |
| Same failing fix, five times | "Two attempts failed. My model of the problem is wrong — reading the library source instead." |
| "✅ Project complete!" | "Not complete. 19 of 23 verified. REQ-018 blocked on a pydantic version conflict — needs your call." |
| Forgets your constraint by message 60 | Constraint is in `.apex/config.json` and re-injected every turn |
| Subagent says done → marked done | Diff read, tests re-run, scope checked, *then* accepted |
| Swaps in a different model when yours is down | Stops, tells you which model is unavailable, asks. Never substitutes. |

The difference is not that it becomes cleverer. It is that it stops losing things and stops
claiming things.

---

## What is in here

```
START-HERE.md      ← the one file. Give any AI this link.
README.md          ← you are here
EXAMPLES.md        ← worked end-to-end sessions
LICENSE            The license — personal use only. NOT open source.
LEGAL-NOTICE.md    Legal warning (India + international sections) and
                   the notice to AI agents

core/              The doctrine. Sixteen files, loaded on demand.
  01-LAWS          the twelve laws that override default habits
  02-COGNITION     how to think before acting
  03-EVIDENCE      what counts as proof — the centre of the system
  04-LOOP          the seven-step execution cycle
  05-LEDGER        durable state that survives context loss
  06-DELEGATION    subagents, and recovering them when they die
  07-AUTONOMY      four modes, and the line that never moves
  08-CONTEXT       managing a finite window over long work
  09-RECOVERY      what to do when things fail — anti-loop
  10-GATE          the definition of "done"
  11-COUNCIL       using multiple models, and when not to
  12-MEMORY        how a project gets easier every session
  13-FLEET         delegation at scale — your orders, or its own judgment
  14-DURABLE-STATE the stores, their schemas, and how they migrate
  15-SKILLS        learned procedures, their promotion and retirement
  16-CAPABILITIES  what the host can actually do, disclosed honestly

adapters/          Host-specific binding: opencode · claude-code ·
                   cursor-windsurf · cli-generic · generic

templates/         The ten ledger files, ready to copy into a project

(The full build plan, the per-store schema changelog and the per-host
install guides live in the project repository, not in this package.)
```

---

## The runtime

**All 11 phases are built and verified** in the runtime package — `npm run verify` is
green (typecheck, full suite, build), the packaged tarball installs, and both the CLI and
the L2 plugin load and run from it. The full OS × Node matrix is proven in CI
(Windows, Linux and macOS × Node 22.6/22/24 — see the badge at the top). Its own
construction is recorded in the runtime package's own ledger, built under APEX itself, gate
PASSED. Requires **Node 22.6+** to run the CLI/tests — the supported range is declared in
the package manifest (`runtime/package.json` in the project repository).

What you get from `npx apex-agent attach` today: requirement tracking with mechanically
enforced status transitions, grounded verification that records literal command output,
snapshots with surgical rollback that never touches your unrelated work, protected paths
with evasion-resistant matching, and a completion gate that refuses to pass while anything
is unverified or regressed. The V4 engines ride on top: durable personal memory, the skill
library with its verification gates, the session archive, and the global APEX home.

### Command reference

Every command prints `--help` and exits non-zero on real failure. None ever asks for a
credential.

```bash
apex-agent attach [--host <name>] [--all-hosts]   install into ONE host (the deepest available)
apex-agent detach [--host <name>]                 remove the binding; deletes nothing personal
apex-agent doctor [--repair]                      read-only diagnosis; safe to run any time
apex-agent status [--project <path>] [--json]     ledger summary for a project
apex-agent init [--project <path>]                create .apex/ only, no host changes
apex-agent gate [--project <path>]                run the completion gate
apex-agent mcp [--project <path>]                 the MCP stdio server (hosts call this)

apex-agent memory <sub>       list · show · add · correct · retract --reason ·
                              pending · approve · reject · journey · export · off
apex-agent skills <sub>       list · search · show · stage · pending · promote ·
                              retire --reason · trust · pin · unpin · reset · run ·
                              bundle list|create|delete · journey
apex-agent session <sub>      list · search · show · prune --dry-run
apex-agent archive <sub>      discover · browse · read · scroll
apex-agent home <sub>         show · export · migrate-from-army
apex-agent --version
```

Destructive commands demand `--reason` or an explicit flag; anything that changes durable
state prints exactly what changed.

### Where your data lives

| What | Where | Removed by |
|---|---|---|
| Project state (requirements, evidence, decisions) | `.apex/` inside the project | deleting that folder — it belongs to the project |
| Personal memory, skills, session archive | the APEX home (`apex-agent home show`) | deleting that folder deletes exactly those |
| A redacted copy of everything personal | `apex-agent home export` | you, whenever you want |
| Host bindings (config lines the host reads) | inside the host's own config | `apex-agent detach` |

---

## The build plan

Everything is specified in the project repository: architecture, a full requirement inventory with
acceptance criteria, seven engine specifications with code, both host bindings, the installer,
the test strategy, and a phase-by-phase roadmap.

Hand the build plan in the project repository to any capable coding
agent to rebuild, extend, or audit it. It builds under APEX itself — if an agent cannot follow
this discipline while building the thing that teaches it, that is worth finding out immediately.

**Not yet done:** the one-item live manual checklist
(`docs/L2-MANUAL-CHECKS.md` in the project repository), completed by your first real
session against a live host. Everything machine-checkable is checked; mock-green is not
shipped-green.

---

## Design principles

**Universal first.** Nothing may require a specific model, provider, or tool. The deepest
binding is a bonus, never a prerequisite.

**Grounded, not consensual.** Truth comes from running things, not from models agreeing.
Multiple models are used to *find errors*, never to *confer truth*.

**State on disk, not in context.** Anything that matters is a file. Context is lossy; files are
not.

**Enforced where possible, requested where not.** L2 blocks a protected-path write. L0 asks
the model not to. Both are worth having.

**Honest about limits.** Where a check cannot run, the system says so instead of guessing. An
honest "unverified" is worth more than a confident "done".

**No credentials, ever.** APEX has no code path that reads, stores, or forwards a provider key.
The host owns authentication.

---

## When something feels wrong

Run `apex-agent doctor` first, always. It is read-only and safe: it shows what is installed,
what is broken, and how to fix it. Common symptoms and their plain-language fixes are in the
troubleshooting table in the project repository.

**Your data is yours.** Removing the binding (`apex-agent detach`) deletes nothing personal.
`apex-agent home export` writes one redacted file containing everything personal. Deleting
the APEX home folder deletes your personal memory, skills and session archive — that folder
is where they live. Project state lives in `.apex/` inside the project and belongs to the
project. Nothing is uploaded anywhere. There is no account and no telemetry.

---

## Lineage — and why the name says V3 when the release says V4

The naming is one product, three labels:

- **Army-V2** — the predecessor project. Right ambition, four structural defects: it sat
  *outside* the host (it could not see what the main agent actually did), its "verification"
  was another LLM reading text (consensus mistaken for proof), its "intelligence" was keyword
  matching, and it fanned tasks to many models for a vote. Its shipped config also contained
  unescaped Windows backslashes — invalid JSON, so the integration silently never loaded.
  Army-V2 remains as reference; APEX does not depend on any of it.
- **ARMY V3** — the clean rebuild that replaced it, and the product's **legal name**: the
  LICENSE defines "The Software" as *APEX — ARMY V3*, and that exact term is protected, so it
  stays in the title, the headers and the license text. Renaming it would be renaming the
  licensed work.
- **The V4 release** — this release generation of that product: package **2.0.0**, the one
  that added memory, skills, sessions, capabilities and the global home on top of the V3
  discipline. The CHANGELOG calls it "2.0.0 — the V4 release".

So: V3 is *who it is*, V4 is *which release you are holding*, 2.0.0 is *the package version*.

---

## Start

**Using it:** [`START-HERE.md`](START-HERE.md) — give the link to any AI.
**Building it:** the build plan in the project repository.
**Seeing it work:** [`EXAMPLES.md`](EXAMPLES.md).

---

## License

This project is **not open source**. It is distributed under the **APEX Personal Use
License 1.0** (see [`LICENSE`](../LICENSE)):

- ✅ Use it and share **unmodified copies, free, for personal non-commercial use**
- ❌ You may **not sell it** or use it commercially
- ❌ You may **not modify it** or distribute modified versions
- ❌ You may **not rename it** or claim it as your own

**Removing the license or copyright headers grants no rights — it only removes your
permission.** Tampering with the license is a criminal offense under the Copyright
Act 1957 (India, §§51/63/63B), 17 U.S.C. §1202 (US/DMCA), EU Directive 2009/24/EC,
and the Berne Convention. See [`LEGAL-NOTICE.md`](LEGAL-NOTICE.md) for the full
legal warning, applicable sections, and the notice to AI agents.
