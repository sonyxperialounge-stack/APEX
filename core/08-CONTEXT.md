# 08 — CONTEXT

> Managing the finite window so long work does not decay. Load when the session feels long, or
> before any handoff.
>
> Governing law: **Law 7 — state lives in files, not in context.**

---

## HOW LONG SESSIONS FAIL

Not with an error. With a slow, invisible decay:

1. **Hours 0–1.** You know the constraints, the plan, the conventions. Work is good.
2. **Hour 2.** Early messages compact away. You still "remember" the constraints, but the exact
   wording is gone. You start approximating.
3. **Hour 3.** You re-read a file you already read, because you no longer trust your memory of
   it. You summarise things you already summarised.
4. **Hour 4.** You violate a constraint from hour one with complete confidence. You contradict
   a decision you made at hour two. You re-implement something already done.

Nobody notices the transition, least of all you. The defence is not a bigger window — it is
**not depending on the window in the first place.**

---

## THE THREE TIERS OF STATE

Classify everything by where it belongs. Getting this wrong is the root cause of context decay.

| Tier | What | Where | Lifetime |
|---|---|---|---|
| **Working** | The file you are editing, the error you are chasing, the command you just ran | Context | This unit of work |
| **Session** | Requirement statuses, the resume point, recent decisions, failure journal | `.apex/*.md` | This session and every future one |
| **Project** | Architecture, conventions, real commands, known traps, what failed before | `.apex/MEMORY.md` + `AGENTS.md`/`CLAUDE.md` | Forever |

The mistake is holding Session-tier state in Working-tier storage. Requirement statuses in your
head instead of in a file. The user's constraint remembered rather than written. Everything at
Session tier or above goes to disk **immediately**, not at a checkpoint.

---

## LOADING DISCIPLINE

Load what the current unit needs. Nothing else.

**Do:**
- Read the specific functions you are changing, plus their direct dependents
- Read the plan section for this requirement, not the whole plan again
- Read `.apex/` state at session start and at resume
- Use `grep`/search to answer a question, instead of reading the file to find out

**Do not:**
- Re-read the entire plan for each requirement
- Load an archive to answer a question the summary already answers
- Read a whole 2,000-line file to change one function
- Paste a subagent's full transcript when its structured checkpoint says the same thing
- Re-read a file you have already read this session, unless it may have changed
  (**exception:** if a subagent ran, or you edited it, it *has* changed — re-read it)

**Cheap substitutes for reading:**

| Instead of | Do |
|---|---|
| Reading a file to find a symbol | `grep -n "def process_payment" -r src/` |
| Reading a file to see its shape | `grep -n "^class \|^def \|^    def " file.py` |
| Reading a file to see what changed | `git diff file.py` |
| Reading a directory to see what exists | `ls` / `find -name` |
| Re-reading the plan | Re-read the one requirement block in `REQUIREMENTS.md` |

---

## THE THRESHOLDS

If your host reports context usage, act at these points. If it does not, **do not invent a
percentage** — use the warning signs below instead.

| Usage | Action |
|---|---|
| **~70%** | Compact working notes. Remove duplicated narrative from `PROGRESS.md`. Stop loading anything not required by the current unit. |
| **~80%** | Write `HANDOFF.md` **now**, completely. Archive verbose detail from finished phases. Start no new broad workstream. |
| **~90%** | Finish only the current atomic unit. Verify it. Record it. Write the final handoff. Then hand off or compact. Do not begin anything new. |

### Warning signs when you have no telemetry

You are running low if any of these are true:

- You re-read something you already read this session
- You cannot recall the exact wording of a constraint the user gave
- `PROGRESS.md` has become long and repetitive
- You have restated the same summary more than twice
- You are unsure whether a requirement is done without checking the file
- You just contradicted an earlier decision
- Many completed phases are still occupying your active reasoning

Any two of these → treat it as 80% and write the handoff.

---

## COMPACTION

Compaction removes **redundancy**, never **evidence**.

### Compact aggressively

- Narrative describing work already recorded in `REQUIREMENTS.md`
- Repeated summaries of the same state
- Full subagent transcripts (keep the structured checkpoint)
- Successful command output beyond the result line (`118 passed, 2 skipped` is enough; the
  full pytest banner is not)
- Exploration that led nowhere — keep one line: *"checked X, not relevant"*
- Verbose detail from phases that are finished and verified → move to `.apex/archive/PHASE-N.md`

### Never compact

- Any unresolved requirement, at any status
- Any `BLOCKED` item and its evidence
- Failure evidence — the literal error text of anything that failed
- The user's explicit constraints and restrictions
- Decisions and their justifications
- The resume point
- Anything not yet verified

### The archive move

```
.apex/PROGRESS.md   →  keep: current phase, active REQs, recent verified completions,
                             blockers, unverified changed files, resume point, links
.apex/archive/      →  move: full per-unit detail for phases that are verified-complete
```

Leave a pointer where you moved it from: *"Phase 1 detail → `archive/PHASE-1.md`"*. Archived
means retrievable, not gone.

---

## HANDOFF

Write a handoff before: a phase completes · context crosses ~80% · switching model or session ·
ending a session · after any blocker · after an architectural discovery.

The test: **could a model with zero context continue from `HANDOFF.md` plus the plan files,
losing nothing but time?** If not, it is incomplete. Template in `05-LEDGER.md`.

What people leave out and always regret:

- **Environment facts** — the venv path, the required env vars, which Python, which port,
  what is *not* available here
- **The trap they just learned** — "`tests/` must run from repo root or imports break"
- **What not to redo** — without this, a successor re-derives verified work
- **What to verify first** — the one command that confirms the tree is still sane
- **Why something is the way it is** — the failed approach that led to the current design.
  Without it, the successor helpfully "fixes" it back to the broken version.

---

## RESUMING

```
1. Read .apex/HANDOFF.md
2. Read .apex/REQUIREMENTS.md (the table; detail blocks on demand)
3. Read .apex/config.json — constraints and autonomy mode
4. Skim .apex/PROGRESS.md → resume point only
5. VERIFY:  git status · git diff --stat · run the test suite
6. Reconcile ledger against reality. Code wins.
7. Continue from the resume point.
```

Do **not** read: the archive, the full verification log, old decisions — unless the current
unit needs them. They are retrievable by ID when a specific question arises.

Step 5 again: the ledger is a claim about the past, and Law 2 applies to your own past self.
Verify before you trust.

---

## LARGE ARTIFACTS

Some things must never enter context whole.

| Artifact | Handle it by |
|---|---|
| A 5,000-line file | `grep` for the symbol; read a ±40-line window around it |
| A large log | `tail -50`, or `grep -i "error\|fail"` |
| A big JSON/CSV | Read the first record for shape, then query it with a script |
| A binary | Never read it. Check its size and type. |
| A directory of hundreds of files | `find`/`ls` for names first; read only what you need |
| A long command's output | Redirect to a file, then grep that file |
| A dependency's source | Read the specific function, not the module |

Writing a five-line script that answers your question is almost always cheaper than reading the
data that would answer it.

---

## THE PROJECT MEMORY

`.apex/MEMORY.md` persists across all sessions. Write facts that were expensive to learn and
are not obvious from the code:

```markdown
## Environment
- Tests must run from repo root — `conftest.py` sets `sys.path`
- `uv sync` not `pip install` — the lockfile is authoritative
- Port 5432 is occupied by another service; the test DB is on 5433

## Architecture
- All auth flows through `verify_token()` in `src/auth.py`. Single chokepoint.
- `src/legacy/` is frozen — vendor code, do not modify (confirmed with user 2026-08-15)

## Traps
- `pytest -n auto` is flaky here; the DB fixture is not parallel-safe
- Editing `models.py` requires regenerating `schemas.py` — there is no automatic hook

## Failed approaches — do not retry
- Upgrading pydantic to v2: breaks 40 files. Deliberately deferred. (REQ-018, 2026-08-15)
```

Read it at session start. Add to it whenever you learn something that cost you time. This is
the compounding part of APEX — the second session in a project is meaningfully better than the
first, and the tenth is better still.

Do **not** put here: anything the code already says clearly, anything in git history, secrets,
or facts that only mattered to one session.

---

Next: `10-GATE.md` · `12-MEMORY.md`
