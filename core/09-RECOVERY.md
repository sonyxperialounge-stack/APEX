# 09 — RECOVERY

> What to do when something fails. Load the moment anything fails twice.
>
> Governing law: **Law 5 — repetition is the enemy; escalate instead.**

---

## THE FAILURE THAT MATTERS

Being wrong is normal and cheap. Being wrong **in a loop** is the expensive failure — the one
that consumes an entire session budget re-running a broken command with cosmetic variations
while producing a stream of confident progress reports.

The loop always looks the same:

```
try → fail → change one small thing → fail → change another small thing → fail → ...
```

What is missing from that pattern is a **hypothesis**. Each attempt must be justified by new
evidence and must be capable of being wrong in a specific, informative way. If you cannot state
what you expect to happen and why, you are not debugging — you are shuffling.

---

## THE ESCALATION LADDER

Every failure has an attempt number, and the attempt number determines what you are allowed to
do. Track it. Do not lose count.

### Attempt 1 — Fix the actual cause

Read the **entire** error. The whole traceback, including the frames you would normally skip
and the line you assumed was boilerplate. The specific answer is in there far more often than
seems plausible.

Then fix the specific thing it named. Not the thing you assume it means.

> `ModuleNotFoundError: No module named 'app.utils'` — do not immediately add a `sys.path`
> hack. Check whether `app/utils.py` actually exists, whether `app/__init__.py` exists,
> whether you are running from the directory you think you are.

### Attempt 2 — Your model of the problem is wrong

Stop patching. The first fix failing means your understanding is incorrect, and another patch
built on the same wrong understanding will also fail.

1. **Re-read the requirement.** Are you solving the right problem?
2. **Re-read the actual code**, freshly. Not your memory of it, and not the version you read
   before you started editing.
3. **State an explicit hypothesis out loud:** *"I believe X is failing because Y."*
4. **Design a check that would disprove it.** Print the value. Add the assertion. Run the
   isolated piece.
5. **Run the check first**, then fix based on what it showed.

If you cannot state a hypothesis, you do not have enough information. Go read code instead of
editing it.

### Attempt 3 — The strategy is wrong

Two failures means the approach itself is unsuited. A third attempt at the same approach is
prohibited by Law 5. Change something structural:

| Move | What it looks like |
|---|---|
| **Isolate** | Strip everything until you have the minimal reproduction that still fails. Twenty lines that fail teach you more than a thousand that fail. |
| **Instrument** | Stop inferring. Print the actual values at each boundary. Most stubborn bugs are one wrong value someone assumed was right. |
| **Invert** | Instead of making it work, find out precisely why it cannot. The constraint you discover is usually the answer. |
| **Go around** | A different mechanism entirely. Different library call, different layer, different data path. |
| **Read the source** | Of the library you are calling. It is on disk in `site-packages`/`node_modules`. Read it rather than guessing at its behaviour. |
| **Bisect** | It worked before. `git log` the file, `git bisect`, or just diff against the last known-good state. |
| **Ask** | A different model (`11-COUNCIL.md`) with a clean view, or the user. |

Record the strategy change in `.apex/PROGRESS.md`. Both what failed and what you switched to —
so a successor does not repeat your first two attempts.

### After attempt 3 — Block it, do not hide it

If no materially different safe strategy remains:

```markdown
Status: BLOCKED
Requirement: REQ-018
What I tried:
  1. [strategy] → [literal result]
  2. [strategy] → [literal result]
  3. [strategy] → [literal result]
Root cause as best I can establish: [the real constraint, with evidence]
What would unblock it: [the smallest external action needed]
Impact: REQ-019 depends on this. REQ-020..030 do not, and I continued with them.
```

Then **continue with everything independent**. Blocking one requirement never blocks the
session. Stopping all work because one item is stuck is itself a failure.

Revisit blocked items when a dependency lands or the environment changes.

---

## THE FAILURE JOURNAL

Keep this while working a stubborn problem. It is what makes attempt 3 different from attempt 1
instead of a rerun with different whitespace.

```markdown
## REQ-018 — serializer failure

Signature: TypeError: Model.__init__() unexpected kwarg '__pydantic_fields_set__'

| # | Hypothesis | Action | Result | Learned |
|---|---|---|---|---|
| 1 | Wrong kwargs passed | Fixed the call site | Same error | Not the call site |
| 2 | Model definition is stale | Regenerated models | Same error | Not the definition |
| 3 | Version mismatch | `pip show pydantic` → 1.10.13 | Confirmed | **The code assumes v2, the project pins v1** |

Conclusion: not fixable inside the requirement's scope. Needs a decision on upgrading
pydantic, which affects 40 files. → BLOCKED, escalated to user.
```

Note the shape: three attempts, three *different* hypotheses, and the third one found the real
constraint. That is what a healthy escalation looks like. Three attempts with the same
hypothesis is the loop.

---

## FAILURE CLASSES

Recognising the class tells you the response immediately.

| Class | Signal | Response |
|---|---|---|
| **Environmental** | Missing credential, no network, absent binary, wrong version | Not a code bug. Do not "fix" it in code. Verify the diagnosis, then `BLOCKED` with the exact missing thing. |
| **Assumption** | Code is right, reality differs | Go re-read reality. Update your model, then retry. |
| **Spec conflict** | Requirement contradicts the code or another requirement | Not fixable by coding. Log in `DECISIONS.md`, resolve by precedence, or escalate. |
| **Cascade** | Many tests fail at once after one change | Revert to baseline immediately. Reapply in smaller pieces. Do not debug forwards through a cascade. |
| **Flaky** | Passes sometimes | Do not "fix" by rerunning. Run it 10× to establish the rate. Look for time, ordering, or shared state. If pre-existing, record it as a finding and move on. |
| **Pre-existing** | It was already broken before you touched anything | Not yours. Verify with the baseline, record it in `FINDINGS.md`, do not silently adopt it. |
| **Self-inflicted** | Worked before your change | Diff your change. The answer is in there. This should be the fastest class to resolve. |

**Always determine whether the failure predates you.** Run the check against your baseline. An
agent that spends an hour fixing a test that was already red is a common and entirely
preventable waste.

---

## CASCADE PROTOCOL

When one change produces many failures, stop immediately. Do not start fixing them one by one —
that path leads to a tree of edits none of which you can attribute.

```
1. STOP. Change nothing further.
2. Revert to baseline. Confirm the failures disappear.
   → If they persist, they were pre-existing. Different problem entirely.
3. Reapply your change in the smallest possible pieces.
4. Find the exact piece that starts the cascade.
5. Now you have one failure with one cause. Go to Attempt 1.
```

---

## SESSION-LEVEL RECOVERY

### Resuming after interruption

You are picking up work someone (possibly you) left mid-flight.

```
1. Read .apex/HANDOFF.md — the resume point
2. Read .apex/REQUIREMENTS.md — what is genuinely done
3. Read .apex/PROGRESS.md — the recent detail
4. VERIFY THE LEDGER AGAINST REALITY:
     git status / git diff  → what actually changed on disk
     run the test suite     → is the recorded state still true?
5. Reconcile any mismatch. Code is truth; the ledger is a claim.
6. Resume from the recorded point. Do not redo verified work.
7. Re-verify dependencies before building on them.
```

Step 4 is the one that gets skipped and the one that matters. A ledger saying
`VERIFIED_COMPLETE` for a file that no longer exists is a stale claim, and Law 2 applies to
your own past self.

### When a subagent dies

Full protocol in `06-DELEGATION.md`. Short form: read its checkpoint, inspect what actually
survived on disk, keep the valid work, resume rather than restart.

### When context is running out

`08-CONTEXT.md`. Short form: finish the current atomic unit, write the handoff, then continue
in a fresh session. Do not start a new workstream on a nearly-full context.

---

## RECOVERY ANTI-PATTERNS

Each of these is a way of making a failure disappear from view without fixing it. All are
violations of Law 2, and all are worse than the failure.

- **The swallow.** Wrapping the failing call in `try/except: pass`. You have not fixed the bug;
  you have deleted the evidence of it.
- **The skip.** `@pytest.mark.skip` on a test that legitimately fails.
- **The weaken.** Loosening an assertion until it passes. `assertEqual` → `assertTrue` →
  `assert True`.
- **The narrow.** Running only the tests that pass and reporting that number.
- **The reframe.** Editing the acceptance criterion to match what you built.
- **The environmental excuse.** Declaring a failure "environmental" without evidence, because
  it is a socially acceptable way to stop.
- **The silent drop.** Removing the requirement from the table.
- **The optimistic report.** "Mostly working, minor issues remain" for something that does not
  run.

If a test is genuinely wrong — it asserts removed behaviour, or the spec changed — you may
change it. But say so explicitly, quote the old and new assertion, and explain why the old one
no longer describes correct behaviour. Silent test modification is the clearest single signal
that an agent has stopped being useful.

---

## THE BUDGET

Failure has a cost ceiling. Track it and stop at it.

- 3 attempts per requirement, per strategy (`max_same_strategy_failures`)
- 2 attempts per subagent, per strategy (`max_subagent_retries`)
- If one requirement has consumed more than ~20% of the session's budget, stop and report it,
  regardless of the attempt count. Something is wrong at a level above the code.

Hitting the ceiling means **escalate**, not abandon. The requirement stays visible in
`REQUIREMENTS.md` as `BLOCKED` until it is verified or the user retires it.

---

Next: `10-GATE.md` (before you say complete) · `11-COUNCIL.md` (a second opinion)
