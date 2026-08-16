# 06 — DELEGATION

> How to run subagents so they multiply your output instead of multiplying your defects.
> Load before spawning one, and again the moment one fails.
>
> Governing law: **Law 6 — delegated work is unverified work.**
>
> This file is about running **one** subagent correctly. For *who decides* to delegate, how many
> to run, which models to use, and what happens when a whole class of workers fails, read
> **`13-FLEET.md`** — especially if the user issued an explicit order.

---

## THE HONEST ECONOMICS

Delegation is not free. Each subagent costs: the packet you write, its full context load, its
output, your review of its diff, and the tests you re-run. That overhead is roughly the cost of
doing a small task yourself.

So the rule is simple:

> **Delegate when the work is large enough that the overhead disappears, and isolated enough
> that the subagent cannot break what you are doing. Otherwise, do it yourself.**

That rule governs **autonomous** delegation — when you are deciding on your own. It does not
apply when the user has issued a direct order. A directed order is obeyed as given: their count,
their models, their roles. You may state a concern once; you may not override it. Full protocol
in `13-FLEET.md`.

### Delegate

- Independent modules with a clean interface between them
- Broad read-only investigation ("find everywhere X is used across 400 files")
- Writing a test suite for something already specified
- Adversarial review of a diff you produced (a fresh agent finds what you rationalised)
- Genuinely parallel workstreams in different directories
- Anything that will fill a context window you need to keep clean

### Do not delegate

- Anything under ~15 minutes of your own work
- Work needing the context you are holding right now — re-explaining costs more than doing
- Two agents writing to the same file. Ever. See Write Safety below.
- The final integration, the final verification, or the completion gate. Those are yours.
- Decisions. A subagent can gather evidence; it cannot decide for you.

---

## THE PACKET

A subagent starts with nothing. It does not know the project, the constraints, or what you have
already tried. **Everything it needs must be in the packet**, because everything you omit it
will either invent or ignore.

Use this exact structure:

```text
SUBAGENT TASK: SUB-007
REQUIREMENT IDS: REQ-021, REQ-022

OBJECTIVE
  Implement the S3 upload path in src/storage.py per docs/plan.md §5.2.
  Do exactly this. Do not refactor anything adjacent.

CONTEXT YOU NEED
  - Python 3.12, deps managed by uv, venv at .venv
  - boto3 is already a dependency — do not add another AWS library
  - src/storage.py currently has only local-disk backends; follow that class shape
  - Config comes from src/config.py:Settings — do not read env vars directly
  - Tokens/credentials are NOT available in this environment; integration tests will not run

READ THESE
  docs/plan.md §5.2 · src/storage.py · src/config.py · tests/test_storage.py

ALLOWED PATHS
  src/storage.py, tests/test_storage.py

DO NOT READ
  .env, secrets/, api-key.md

DO NOT TOUCH
  Anything not listed under ALLOWED PATHS. Especially: config/prod.yaml, migrations/

EXPECTED OUTPUT
  Working code + unit tests with mocked S3. Report every file you changed.

ACCEPTANCE CRITERIA
  1. S3Backend implements the same interface as LocalBackend (put/get/delete/exists)
  2. Transient 5xx retried 3× with backoff via tenacity (already a dependency)
  3. `pytest tests/test_storage.py` passes with mocked boto3
  4. `mypy src/storage.py` clean
  5. No new dependencies

REQUIRED VERIFICATION
  Run `pytest tests/test_storage.py` and `mypy src/storage.py`.
  Paste the literal output of both. Do not summarise them.

CHECKPOINT REQUIREMENT
  Every ~10 minutes or after each file, report: files created/modified, what works,
  what does not, exact next action. If you are interrupted, that report is what
  survives you.

SCOPE DISCIPLINE
  Do not exceed this scope. If you find a problem outside it, report it — do not fix it.
  If a criterion is impossible, say so with evidence. Do not silently substitute
  something easier.

REPORT FORMAT
  1. Files changed (path + what changed)
  2. Literal command output for every check
  3. Which acceptance criteria are met, one by one
  4. What is not done, and why
  5. Anything you noticed outside scope
```

The three fields agents most often omit, and which cause the most damage: **CONTEXT YOU NEED**
(so the subagent reinvents your stack), **DO NOT TOUCH** (so it wanders), and **REQUIRED
VERIFICATION** (so it returns unproven work that you then accept).

Record the packet in `.apex/SUBAGENTS.md` **before** spawning. If the subagent dies, the packet
is how you restart it without re-deriving anything.

---

## WRITE SAFETY

Two agents writing the same file will silently destroy each other's work — one overwrites, the
other's changes vanish, and neither notices.

Enforce one of these, in order of preference:

1. **Isolation** — each writer gets its own git worktree or its own copy, and you merge. The
   only genuinely safe concurrent-write model.
2. **Disjoint paths** — each writer owns files no other writer touches. Verify the sets do not
   overlap *before* spawning, not after.
3. **Single writer** — exactly one agent has write access per wave; everyone else reads,
   researches, reviews, and proposes. Their proposals are applied by the writer.

**Default to (3)** unless you have verified isolation works in this host. It is slower and it
is correct. Never assume two agents "probably won't collide" because their tasks sound
different — sounding different is not the same as touching different files.

---

## PARENT VERIFICATION — MANDATORY

A subagent returning is not a task completing. Run all seven of these before accepting:

1. **Read the actual diff.** Not the summary. `git diff` for the files it names — and also
   `git status` to catch files it did *not* name.
2. **Re-read the requirement.** From `.apex/REQUIREMENTS.md`, not from the packet you wrote —
   you may have compressed it when writing the packet.
3. **Check each acceptance criterion individually.** Not "it seems done". Criterion 1: met?
   Criterion 2: met? A subagent meeting four of five criteria has failed.
4. **Re-run the verification yourself.** Its pasted output could be stale, partial, from a
   different command, or fabricated. Run it. This step is not optional and not negotiable.
5. **Check scope.** Did it touch anything outside ALLOWED PATHS? Anything in DO_NOT_TOUCH?
   `git diff --stat` answers this in one line.
6. **Check integration.** Does it work with the surrounding code, or only in isolation? Run the
   full suite, not just the subagent's tests.
7. **Check for the classic evasions:** tests weakened or skipped, `try/except` swallowing the
   failure, stubs and `TODO`s, criteria quietly reinterpreted, a "simpler approach" substituted
   without saying so.

Only after all seven → `VERIFIED_ACCEPTED`, and only then does the parent requirement's status
move.

If it fails: record precisely what failed in `.apex/SUBAGENTS.md`, then either repair it
yourself (usually faster) or return it with the exact defect list. Never return a vague "this
isn't right".

---

## FAILURE AND RECOVERY

Subagents crash, time out, run out of context, get interrupted, or return half-finished work.
This is normal. What matters is that you **never restart from zero**.

### The recovery sequence

```
1. READ THE CHECKPOINT
   .apex/SUBAGENTS.md → what did it last report? Which files did it create?

2. INSPECT REALITY
   Look at the actual files on disk. The checkpoint is a claim; the files are the fact.
   `git status` / `git diff` shows exactly what survived.

3. CLASSIFY WHAT SURVIVED
   Which parts are complete and correct? Which are half-written? Which are absent?
   Run whatever verification you can against the partial work.

4. PRESERVE THE GOOD
   Do not delete valid work because the session died. That is the most common and most
   wasteful reflex.

5. RESUME, DO NOT RESTART
   - Host supports session resume (OpenCode `-s <id>`, Claude Code `--resume`)?
     → resume the same session; it still has the context.
   - It does not?
     → spawn a replacement with a REPLACEMENT PACKET (below).

6. RECORD
   Attempt number, failure class, what survived, what strategy comes next.
```

### The replacement packet

The original packet, plus a recovery header:

```text
SUBAGENT TASK: SUB-007 (attempt 2 — replacing a failed session)

WHAT ALREADY EXISTS — DO NOT REDO
  src/storage.py:1-120  S3Backend class, put() and get() complete and passing
  tests/test_storage.py:1-60  fixtures + 4 tests for put(), all passing

WHY THE PREVIOUS ATTEMPT FAILED
  Ran out of context while writing delete(). No corruption; the file is valid Python.
  Verified: `mypy src/storage.py` is clean, `pytest tests/test_storage.py` → 4 passed.

YOUR SCOPE — ONLY THIS
  Implement delete() and exists(), plus their tests. Everything else is done.

STRATEGY CHANGE
  None needed — the previous approach was correct, it just ran out of room.

[...original packet from OBJECTIVE onward...]
```

### Failure classes and the right response

| Class | Signal | Response |
|---|---|---|
| **Context exhaustion** | Stopped mid-file, output truncated | Same approach, narrower scope. Split into two subagents. |
| **Crash / timeout** | No final report, session errored | Inspect files, resume from checkpoint, same strategy. |
| **Wrong approach** | Finished, but the result is architecturally wrong | Do **not** retry the same way. Change strategy or take it yourself. |
| **Scope violation** | Touched forbidden or unrelated paths | Revert its changes. Respawn with a much tighter ALLOWED PATHS. |
| **Fabricated success** | Claimed a passing test; your rerun fails | Stop using subagents for this task. Do it yourself. Note it in the log. |
| **Genuinely blocked** | Missing credentials, an impossible requirement | Not a subagent failure. Mark the requirement `BLOCKED` with its evidence. |

### The retry ceiling

Two attempts per strategy (`max_subagent_retries`, `.apex/config.json`). After two materially
identical failures:

- **change the strategy** — different decomposition, different approach; or
- **narrow it** — split into pieces small enough to succeed; or
- **take it back** — do it yourself, which is often what should have happened; or
- **mark it `BLOCKED`** with evidence, and continue with independent work.

The ceiling is an **escalation trigger, not permission to drop the requirement.** The
requirement stays visible in `REQUIREMENTS.md` until it is verified or genuinely blocked.

---

## SUPERVISION WHILE THEY RUN

If your host lets you watch (event stream, session status, child-session listing), watch for:

- **Silence** — no checkpoint past the expected interval. Probe or assume it is stuck.
- **Error events** — `session.error`, non-zero exit, provider failure. Recover immediately;
  do not wait for a timeout.
- **Idle with unfinished work** — it stopped, but the acceptance criteria are not met. This is
  a failure, not a completion, and it is the one most often mistaken for success.
- **Scope drift** — file-change events outside ALLOWED PATHS. Abort it now, not at the end.
- **Loops** — the same command failing repeatedly in its output. Abort and re-plan; it will not
  recover on its own.

If you cannot watch, set an expectation up front ("checkpoint every 10 minutes") and treat a
missed checkpoint as a failure signal.

At L1/L2, this supervision is automatic — the Warden engine does it (`../build/ENGINES.md`).
At L0, it is your job, and you must actually do it rather than firing and forgetting.

---

## SPAWNING, BY HOST

| Host | Mechanism |
|---|---|
| OpenCode | `@agent-name` mention, or the Task tool; subagents defined in `.opencode/agents/*.md` with `mode: subagent`. Child sessions via `POST /session` with `parentID`; list with `GET /session/:id/children`; resume with `opencode -s <id>`. |
| Claude Code | The Task tool with a `subagent_type`; agents in `.claude/agents/*.md`. Resume with `--resume`. |
| Cursor / Windsurf | No true subagents. Simulate with a separate chat and a hand-carried packet, or run a CLI agent in the terminal. |
| Generic CLI | Spawn a second process with the packet as its prompt. Capture its output to a file so the checkpoint survives the process. |
| No support at all | Do not fake it. Run the packets yourself, sequentially, keeping each one's context clean by clearing between them. Sequential-and-honest beats parallel-and-imaginary. |

---

Next: `07-AUTONOMY.md` · `09-RECOVERY.md`
