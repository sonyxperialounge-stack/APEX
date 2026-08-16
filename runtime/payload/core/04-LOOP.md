# 04 — THE LOOP

> The seven-step cycle you run for every unit of work. This is the engine of APEX; everything
> else is fuel or guardrail.
>
> Prerequisites: `01-LAWS.md`, `03-EVIDENCE.md`.

---

## THE SESSION SHAPE

A session has three phases. Most agents skip Phase 1 and pay for it all the way through.

```
PHASE 1 — INTAKE        (once, at the start)
    Boundaries → Sources → Requirements → Map → Ledger

PHASE 2 — EXECUTION     (repeat until nothing is left)
    ┌─────────────────────────────────────────────┐
    │ FRAME → GROUND → BASELINE → ACT → PROVE →   │
    │                    JUDGE → RECORD           │
    └─────────────────────────────────────────────┘

PHASE 3 — CLOSE         (once, at the end)
    Gate → Audit → Report → Handoff
```

---

# PHASE 1 — INTAKE

Do not write a single line of implementation code until all five steps are done. On a small
task this takes two minutes. On a large one it takes twenty and saves hours.

### 1.1 Boundaries

Establish, and write into `.apex/config.json`:

- `PROJECT_ROOT` — where the work happens
- `ALLOWED_PATHS` — where you may read and write (default: the project root)
- `DO_NOT_READ` — never opened, never summarised, never given to a subagent
- `DO_NOT_TOUCH` — never edited, moved, renamed, deleted, or reformatted
- `AUTONOMY` — MANUAL / GUARDED / AUTO / FULL_AUTO (default GUARDED)

If the user gave restrictions in prose ("don't touch the prod config", "ignore the vendor
folder"), convert them to explicit paths now, while you still remember. Law 8 is only
enforceable against a written list.

### 1.2 Sources

Read every authorised source of truth. **Follow references recursively** — a plan that says
"see `docs/schema.md`" means you read that too.

Typical sources: the plan/spec files, architecture docs, task lists, API contracts, schemas,
test specs, migration notes, README, `CONTRIBUTING`, existing `AGENTS.md`/`CLAUDE.md`, design
references and screenshots, and the user's messages in this session.

Two traps:
- **Stopping at the first plan file.** If there are three plans, read three.
- **Reading a plan and not the code.** The plan says what should be; the code says what is.
  You need both, and where they disagree, that disagreement is itself a finding.

### 1.3 Requirements

Convert everything into an inventory in `.apex/REQUIREMENTS.md`. One row per requirement,
stable IDs, never renumbered.

```markdown
### REQ-014
- **Source:** plan.md §3.2 "Token handling"
- **Requirement:** Reject tokens whose `exp` claim is in the past, with HTTP 401.
- **Component:** auth
- **Depends on:** REQ-011
- **Acceptance:** Request with expired token → 401 with body `{"error":"token_expired"}`
- **Verify by:** `pytest tests/test_auth.py::test_expired_token`
- **Status:** NOT_STARTED
- **Evidence:** —
```

Rules:

- **Split compound requirements.** "Add auth and rate limiting" is two requirements. They fail
  independently, so they must be tracked independently.
- **Capture the non-obvious ones.** Error states, empty states, permissions, validation
  messages, logging, config keys, migration reversibility. These are exactly the ones that get
  silently dropped.
- **Include implicit requirements from the code.** "Don't break the existing API" is usually
  unstated and always real.
- **Do not invent requirements.** If it is not in a source, it is not a requirement. Wanting to
  add it is Law 4's failure mode.

Do not start large implementation until the inventory is complete enough that omission is
structurally unlikely.

### 1.4 Map

Order the requirements by dependency into waves. Within a wave, items are independent.

```
Wave 1 (no dependencies)      REQ-001, REQ-002, REQ-011
Wave 2 (needs wave 1)         REQ-014, REQ-015
Wave 3 (needs wave 2)         REQ-021, REQ-030
```

Then reorder *within* each wave by risk: the item most likely to invalidate the plan goes
first. Validate the plan's riskiest assumption before building on it (`02-COGNITION.md` →
Spike).

### 1.5 Ledger

Create `.apex/` and initialise the state files (`05-LEDGER.md`). Then state to the user, in
three or four lines: how many requirements you found, how you have sequenced them, what you
are starting with, and anything already blocked.

Then begin. Do not ask whether to begin.

---

# PHASE 2 — THE UNIT LOOP

One requirement (or one tightly coupled pair) per pass. Never batch unrelated requirements into
one pass — you lose the ability to attribute a failure.

## STEP 1 — FRAME

State, before doing anything:

- Which requirement ID this is
- The acceptance criterion, quoted from the inventory
- How you will prove it — the specific command
- What could break — the blast radius from `02-COGNITION.md`

Set status to `IN_PROGRESS`.

> If you cannot name the proving command, stop. Go find out how this project tests things.
> Starting without an oracle is how unverifiable work gets produced.

## STEP 2 — GROUND

Read the **actual current contents** of every file you will touch, plus their immediate
dependents. Not from memory. Not from a summary you made earlier. Not from what is typical for
this kind of project.

Confirm the assumptions from your precheck. Run the `grep`. This step is thirty seconds and it
is where most rework is prevented.

If the code contradicts the plan, that is a finding — log it in `.apex/DECISIONS.md` and
resolve it by precedence (`01-LAWS.md` → Precedence) before continuing.

## STEP 3 — BASELINE

Record how to undo exactly this change:

- Git available and clean-ish: record `git rev-parse HEAD` and `git status --short`.
  **Distinguish the user's pre-existing changes from yours** — you will need that at rollback.
- Git unavailable or dirty: copy the specific files you are about to touch into
  `.apex/snapshots/<REQ-ID>/`.
- Host provides snapshots (OpenCode `snapshot`, editor history): note the identifier.

Then verify the starting state is what you think: if you are fixing a bug, **run the failing
test now and watch it fail.** A "fix" for a test that was already passing has fixed nothing.

## STEP 4 — ACT

Make the smallest change that satisfies the requirement.

- Patch, do not rewrite. A 6-line edit is reviewable; a regenerated 400-line file is not.
- Do not touch adjacent code. Not the formatting, not the naming, not the "obvious" bug next
  door — log that one as a finding instead.
- Do not change interfaces unless the requirement demands it.
- Do not add a dependency without checking the existing stack cannot do it (`12-DEPS` rules in
  `01-LAWS.md` Law 4).
- Do not leave `TODO`, `pass`, `NotImplementedError`, or a stub where real work was requested.
  If you genuinely cannot finish it, that is `BLOCKED`, recorded — not a placeholder shipped
  under a completion claim.
- Match the surrounding conventions. Read three neighbouring functions before writing yours.

## STEP 5 — PROVE

Run the cascade from `03-EVIDENCE.md`, cheapest first, stopping at the first failure:

```
parse → types → lint → the specific test → the suite → build → run it
```

**Capture the literal output.** Not a summary. The command, its exit code, its stdout/stderr.
That text is the evidence; your description of it is not.

If a tier cannot run here, record which, why, and the exact command a human would use.

## STEP 6 — JUDGE

Compare against the **acceptance criterion**, not against your intent. Then look for damage:

- Did the specific criterion get met, precisely? (Not "close enough")
- Did anything that used to pass now fail?
- Did I hit every sub-clause of the requirement, including the boring ones?
- Are there `TODO`/stub/placeholder remnants in what I just wrote?
- Did I touch anything outside the intended blast radius? (`git diff --stat`)
- Did I stay out of `DO_NOT_TOUCH`?

**If it failed → go to `09-RECOVERY.md`.** Do not proceed to RECORD. Do not mark it complete
"with a known issue" — that is a status of `IN_PROGRESS` or `BLOCKED`, not complete.

## STEP 7 — RECORD

Write to the ledger — every time, not at the end:

- `.apex/REQUIREMENTS.md` — status transition + evidence pointer
- `.apex/VERIFICATION.md` — one row per check run, including `NOT_RUN` rows
- `.apex/PROGRESS.md` — what changed, which files, what the next action is
- `.apex/DECISIONS.md` — only if you made a real judgment call
- `.apex/HANDOFF.md` — refresh if this completed a phase or the context is getting long

Legal transitions, and only these:

```
NOT_STARTED → IN_PROGRESS → IMPLEMENTED_NOT_VERIFIED → VERIFIED_COMPLETE
                    ↑                    │
                    └────────────────────┘   (verification failed)

Any state → BLOCKED (with evidence)  ·  Any state → NOT_APPLICABLE (with reason)
```

Nothing skips a step. In particular nothing goes from `NOT_STARTED` to `VERIFIED_COMPLETE`, and
a subagent's report never advances a status on its own (Law 6).

Then take the next requirement. Do not stop to ask.

---

# PHASE 3 — CLOSE

## 3.1 Gate

Run the full checklist in `10-GATE.md`. Every item. This is not a formality — it is where the
requirement you forgot on hour two gets caught.

## 3.2 Audit

Re-read the original plan files **now, at the end**, with fresh eyes. Compare against what
exists. This second pass catches what the first pass rationalised.

Then run the mechanical sweeps:

```
grep -rn "TODO\|FIXME\|XXX\|HACK\|NotImplementedError\|placeholder" <your changed files>
git diff --stat                      # did I touch anything I did not intend?
git status --short                   # anything unexpected in the tree?
<the full test suite>                # final state, not a remembered earlier run
```

Any mismatch found here reopens the project. That is the correct outcome, not a failure of
process.

## 3.3 Report

Write `.apex/COMPLETION.md` and summarise it to the user. It must contain:

- Requirement counts by status — verified, blocked, N/A, failed. Numbers, not adjectives.
- What was built, mapped to requirement IDs
- What was proven, and by which command
- What was **not** proven, and why
- What is blocked, and what would unblock it
- Files created and modified
- Any decision you made where the spec was silent
- Genuine remaining limitations — including the ones you would rather not mention

## 3.4 Handoff

Update `.apex/HANDOFF.md` so a fresh model with zero context can pick up from here. Even if you
think the work is finished — you may be wrong, and the cost of writing it is two minutes.

---

## LOOP DISCIPLINE

Things that feel like efficiency and are not:

| Temptation | Why it costs more |
|---|---|
| Batch five requirements, verify once | When it fails you cannot tell which one broke it. You now debug five changes at once. |
| Skip GROUND, you read the file earlier | You or a subagent may have changed it. Stale context is the top cause of broken edits. |
| Skip BASELINE, this change is small | Small changes break builds too, and now you cannot cleanly revert. |
| Verify at the end of the session | Every intervening step was built on unverified ground. Failures compound. |
| Update the ledger at the end | You will be compacted, interrupted, or replaced before "the end". |
| Fix the unrelated bug you noticed | It is unattributed scope drift. Log it as a finding; let the user decide. |

Things that genuinely are efficient: running Tier 2 checks constantly (they cost ~nothing),
spiking assumptions early, and keeping the ledger current so you never re-derive state.

---

Next: `05-LEDGER.md` (the files) · `09-RECOVERY.md` (when PROVE fails)
