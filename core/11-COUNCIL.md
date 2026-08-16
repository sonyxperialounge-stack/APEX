# 11 — THE COUNCIL

> Using more than one model. Load when several are available and the decision is expensive.
>
> This file exists as much to tell you **when not to** as when to.

---

## THE HONEST POSITION

Running several models on the same problem is widely oversold. Before using it, understand
precisely what it buys and what it does not.

**What multiple models genuinely give you:**

- **Independent error detection.** A second model reviewing a diff it did not write catches
  things the author rationalised. This is real and it is the main reason to do it.
- **Blind-spot coverage.** Different training, different failure modes. One model's habitual
  mistake is often not another's.
- **Selection.** Generate several candidate approaches, then pick with an *objective* criterion.
  Useful only when you have such a criterion.

**What they do not give you:**

- **Truth by agreement.** Three models agreeing is three opinions, not a fact. Models trained
  on overlapping data share overlapping errors, so agreement is correlated, not independent.
  Confident consensus on a wrong answer is a real and common outcome.
- **Capability you do not have.** Ten weak models do not compose into a strong one. If none of
  them can solve it, the committee cannot either.
- **Better writing or better taste.** Aggregating open-ended prose across models produces
  averaged, blander output — not better output.
- **Anything on an unverifiable question.** Where there is no ground truth, a vote is a
  popularity contest between the same biases.

> **The rule that follows from all of this:** use a second model to **find errors**, never to
> **confer truth**. Voting settles nothing that evidence could have settled — and where
> evidence can settle it, run the evidence instead.

This is the specific mistake to avoid: fanning a task out to eight models, having them rank
each other's prose, and treating the winner as verified. That is expensive theatre. Grounded
verification at Tier 3 (`03-EVIDENCE.md`) beats any amount of model consensus, and costs less.

---

## WHEN TO CONVENE

Only these five situations justify the cost.

### 1. Adversarial review of a risky diff
The highest-value use, by a wide margin. After you implement something security-relevant,
irreversible, or architecturally load-bearing, hand a *second* model the diff and the
requirement — **not your reasoning** — and ask it to find what is wrong.

Give it: the requirement, the diff, the test output. Withhold: your explanation of why it is
correct. Your reasoning is exactly the thing that will anchor it to your mistake.

### 2. Design decisions that are expensive to reverse
Schema design, public API shape, a dependency you will live with, a concurrency model. Ask two
or three models independently, then compare **the tradeoffs they surface**, not their verdicts.
The value is in the consideration you had not thought of, not in the tally.

### 3. You have failed three times
`09-RECOVERY.md` sends you here. A model with no history of your failed attempts is not
anchored to your wrong hypothesis. Give it the problem and the evidence — not your theory
about the cause.

### 4. Requirement extraction from a large spec
Genuinely parallel and genuinely useful. Have two models independently extract requirements
from the same document, then diff the lists. **Anything one found and the other missed is worth
inspecting.** This is one of the few places where a union of outputs is straightforwardly
better than any single output.

### 5. Cost routing
Not about quality — about economics. Use a cheap fast model for mechanical work (renames,
boilerplate, test scaffolding, formatting, search) and reserve the strongest available model
for planning, debugging, and review. This is usually the largest practical win available from
having multiple models, and it is the least discussed.

### Do not convene for
Routine implementation · anything a test can settle · getting a second opinion on something you
already verified · because the task "feels important" · to produce a longer report.

---

## THE PROTOCOLS

### Independent review (default — use this one)

```
1. You implement, and verify at the highest tier you can reach.
2. Send Model B: the requirement, the diff, the test output. Nothing else.
   Ask: "Find defects. Assume there is at least one. Check the requirement is fully
   met, not partially. Check for regressions in adjacent behaviour."
3. Treat every finding as a hypothesis, not a verdict.
4. VERIFY each finding yourself, with evidence. Model B is wrong sometimes too.
5. Fix what is real. Record what was rejected and why.
```

Never skip step 4. Accepting a reviewer's claim without checking it is the same Law 2 violation
in the other direction.

### Independent generation

```
1. Give the same specification to 2–3 models. No cross-talk — cross-talk causes
   convergence, which destroys the only thing you came for.
2. Collect the candidates.
3. Score them against an OBJECTIVE criterion, in this order of preference:
     a. It passes the tests, the others do not      ← decisive
     b. It compiles / type-checks, the others do not ← decisive
     c. It is measurably smaller / faster / fewer deps ← strong
     d. It handles an edge case the others missed     ← strong
     e. It reads better                                ← weak, use last
4. If (a)–(d) cannot separate them, they are equivalent. Take the simplest and stop
   deliberating.
```

### Escalation after failure

```
1. Package: the problem, the literal errors, what you tried, what you observed.
   Explicitly EXCLUDE your hypothesis about the cause.
2. Ask a different model for a diagnosis.
3. Test its hypothesis with evidence before acting on it.
```

### Requirement diffing

```
1. Two models independently extract requirements from the same document.
2. Diff the two lists.
3. Investigate every item that appears in only one list.
4. Merge into a single inventory with stable IDs.
```

---

## ROLE ASSIGNMENT

If you have several models, assign by their actual strengths, not by ceremony:

| Role | Wants | Notes |
|---|---|---|
| **Planner** | The strongest reasoning available | Runs once, at the start. Worth spending on. |
| **Implementer** | Solid, fast, good at tool use | Runs constantly. Cost matters here. |
| **Reviewer** | Different family from the implementer | Difference matters more than raw strength. |
| **Mechanic** | Cheapest capable | Renames, boilerplate, scaffolding, search |

**Never let the same model be both implementer and reviewer of the same work.** A model
reviewing its own output has the same blind spot in both roles and will approve it. This is the
most common way multi-model setups deliver nothing.

---

## COST DISCIPLINE

Every extra model call is real money and real time. Before convening:

- Could a test settle this instead? Then run the test. It is cheaper and it is *proof*.
- Is this decision reversible? Then just choose, note it, and move on.
- Is the cost of being wrong here actually high? If not, do not convene.

A useful heuristic: convene when *being wrong costs more than an hour*. Below that, decide and
proceed.

Sensible defaults:

| Work | Models |
|---|---|
| Routine implementation | 1 |
| Non-trivial planning | 1 planner, and only if the plan is large |
| Security / irreversible / architectural | 2 — one implements, one reviews |
| Third consecutive failure | +1, with a clean view |
| Everything else | 1 |

If you find yourself running four models on a routine task, you have made Army-V2's mistake.

---

## AVAILABILITY, HONESTLY

Check what actually exists before designing around it:

- **OpenCode:** several providers may be connected. `apex_models` (L1+) or the model picker
  lists them. Different *providers* usually means genuinely different models; two aliases of
  the same underlying model give you nothing.
- **Claude Code:** subagents may be given a different model. Same-family models still differ
  usefully in size.
- **Single-model host:** you have one model. Do not simulate a council by role-playing several
  personas in one context — they share the same context and the same blind spot, so the
  "disagreement" is theatre. What *does* work: reviewing in a **separate, clean session** with
  only the requirement and the diff, no prior reasoning. That recovers a meaningful part of the
  independence.

Never claim a council ran when it did not. Never name a model you did not call.

---

## RECORDING

Any council use goes in `.apex/DECISIONS.md`:

```markdown
## DEC-007 — Council: schema for the events table
- **Why convened:** irreversible; migration cost is high after data lands
- **Models:** [A] planner · [B] reviewer, different family
- **A proposed:** single wide table with a JSON payload column
- **B objected:** no index path for the common query; suggested a typed side table
- **Verified:** wrote both, ran EXPLAIN on the real query shape → typed side table
  uses the index, JSON payload does a seq scan (evidence: V-022)
- **Chose:** typed side table — decided by measurement, not by vote
- **Cost:** 2 model calls + 1 measurement
```

Note the shape: the council **surfaced** the consideration, and **evidence decided it**. That is
the correct pattern. If your record shows a decision made by tally rather than by measurement,
you convened when you should have tested.

---

Next: `12-MEMORY.md` · back to `04-LOOP.md`
