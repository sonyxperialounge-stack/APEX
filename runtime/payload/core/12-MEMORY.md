# 12 — MEMORY

> How a project gets easier every session instead of starting from zero every time.
> Load at session start and session end.

---

## THE COMPOUNDING IDEA

Without memory, every session pays the same tax: rediscovering the test command, re-learning
that imports break outside the repo root, re-proposing the approach that was rejected last
week, re-reading the same four files to understand the architecture.

With memory, session two starts where session one ended — and session ten starts with ten
sessions of hard-won facts. This is the only part of APEX that gets *better* over time rather
than merely staying disciplined.

The rule for what belongs here:

> **Write down what was expensive to learn and is not obvious from the code.**

Not what the code already says. Not what git history records. Not what only mattered for one
session. The things that cost you twenty minutes to discover and would cost the next session
the same twenty minutes.

---

## WHERE IT LIVES

```
<PROJECT_ROOT>/.apex/MEMORY.md      Project facts, permanent, survives everything
<PROJECT_ROOT>/AGENTS.md            The host-native memory file, if one exists
                                    (or CLAUDE.md, .cursorrules, .github/copilot-instructions.md)
```

Keep `MEMORY.md` as the authoritative store. If the host reads a native file automatically
(`AGENTS.md`, `CLAUDE.md`), mirror the **stable** facts there so they load without being asked
for — that is free context you would otherwise have to spend a tool call on.

Commit `MEMORY.md` to the repository. It is a genuine project artifact, useful to human
developers too, and it should not be one person's local file.

---

## WHAT TO WRITE

### Environment facts

The things that break a fresh session in the first five minutes.

```markdown
## Environment
- Tests must run from the repo root; `conftest.py` sets `sys.path`
- Use `uv sync`, not `pip install` — the lockfile is authoritative
- Python 3.12 in `.venv`; 3.11 fails on the `match` statements in `parser.py`
- Postgres for tests is on port 5433 (5432 is taken by another service)
- `AWS_PROFILE=dev` required for integration tests; not available in CI
```

### Real commands

Discovered once, never guessed again.

```markdown
## Commands
- test:      `pytest`                    (not `python -m pytest` — plugin loading differs)
- one test:  `pytest path::name -x`
- types:     `mypy src/`
- lint:      `ruff check src/`
- build:     none
- run:       `uvicorn app.main:app --reload --port 8001`
```

### Architecture that is not obvious from any single file

```markdown
## Architecture
- Every auth path goes through `verify_token()` in `src/auth.py`. Single chokepoint —
  change it there, not at call sites.
- `src/legacy/` is vendored, frozen. Confirmed with the user 2026-08-15: do not modify.
- Models (`models.py`) and schemas (`schemas.py`) must be edited together. There is no
  code generation hook despite the comment claiming there is.
- Background jobs read from the same `storage.Backend` interface. Adding a backend means
  checking `worker/tasks.py` too.
```

### Traps

Every one of these represents time somebody already lost.

```markdown
## Traps
- `pytest -n auto` is flaky — the DB fixture is not parallel-safe. Use serial.
- Editing `config.py` requires restarting the dev server; the reloader misses it.
- `git stash` here is dangerous: `.env.local` is untracked and gets caught.
- The `/health` endpoint returns 200 even when the DB is down. Do not use it as readiness.
```

### Failed approaches — the highest-value section

Without this, a future session helpfully "fixes" a deliberate decision back to the broken
version. This happens constantly and it is entirely preventable.

```markdown
## Failed approaches — do not retry
- **Upgrading pydantic to v2** (2026-08-15, REQ-018): breaks 40 files across serializers
  and the ORM layer. Deliberately deferred, not overlooked. Revisit only as its own project.
- **Caching the user lookup** (2026-08-02): tried, reverted. Invalidation on role change was
  the problem, and the measured bottleneck was actually the N+1 in `list_projects`.
- **Async DB driver** (2026-07-20): the app is sync end to end; the mixed model deadlocked
  under load.
```

### Preferences the user has expressed

```markdown
## User preferences
- Wants tests written before the fix for bugs, so the fix is provably the fix
- Prefers stdlib over new dependencies; asks before any addition
- Does not want files reformatted as a side effect of a change
- Reports should say what is unverified, explicitly
```

---

## WHAT NOT TO WRITE

- Anything clearly readable from the code (`"there is a User model"` — yes, obviously)
- Anything in git history (`"we refactored auth in March"`)
- Secrets, tokens, credentials, connection strings with passwords, internal URLs — **ever**,
  in any form, including inside a quoted error message
- Session-specific state — that belongs in `PROGRESS.md`, not here
- Speculation. Memory is for verified facts. `"I think the cache might be stale"` is not a fact.
- Long narrative. Each entry should be one to three lines. If it needs a page, it needs a doc.

---

## THE SESSION RITUAL

### At the start

```
1. Read .apex/MEMORY.md          → the accumulated project knowledge
2. Read .apex/HANDOFF.md          → where the last session stopped
3. Read AGENTS.md / CLAUDE.md     → host-native instructions
4. Verify the memory is still true:
     - do the recorded commands still exist?
     - has the architecture note been invalidated by a change?
   Correct anything stale, in place, immediately.
```

Step 4 matters. Stale memory is worse than no memory, because it is trusted. If `MEMORY.md`
says the test command is `pytest` and someone moved to `nox`, that entry actively misleads.

### At the end

Ask three questions and write down any answer that is not empty:

```
1. What did I learn today that cost me time and is not in MEMORY.md?
2. What did I try that did not work, that someone will otherwise try again?
3. What did the user tell me about how they want things done?
```

Then update the file. Two minutes, and the next session inherits all of it.

---

## KEEPING IT HEALTHY

Memory rots. Audit it whenever it exceeds roughly 150 lines:

- **Remove what is no longer true.** A trap that was fixed is noise now.
- **Merge duplicates.** Two entries about the same fact means neither gets trusted.
- **Delete what became obvious.** If the README now documents it, memory does not need to.
- **Keep failed approaches forever.** They do not expire, and they are the most valuable
  section.
- **Date the entries that are time-sensitive.** "Deferred pending the v2 migration" needs a
  date to be interpretable later.

An entry earns its place if a fresh session would be measurably worse off without it. If you
cannot say how, delete it.

---

## MEMORY VERSUS THE LEDGER

They are different things and mixing them makes both useless.

| | `MEMORY.md` | `.apex/*.md` ledger |
|---|---|---|
| **Scope** | The project, forever | This piece of work |
| **Lifetime** | Permanent | Until the work is delivered |
| **Content** | Facts about how this project behaves | Requirements, status, evidence |
| **Audience** | Every future session, and humans | The next session, mainly |
| **Committed?** | Yes | Usually yes, minus `snapshots/` |
| **Example** | "Tests must run from the repo root" | "REQ-014 verified, V-007" |

If you are unsure: *would this still matter after the current task ships?* Yes → memory. No →
ledger.

---

## AT L1 AND L2

When the APEX runtime is installed, memory stops being a discipline and becomes plumbing:

- The **Recall engine** retrieves relevant memory automatically and injects it into the system
  prompt for the current task, so you do not spend a tool call fetching it.
- Verified facts are captured from real tool events — the command that actually worked is
  recorded because it ran, not because you remembered to write it down.
- Failed approaches are recorded automatically from the recovery ladder.

Until then, this is manual and it still works. Manual memory that gets written beats automatic
memory that does not exist.

---

Back to: `START-HERE.md` · `04-LOOP.md`
