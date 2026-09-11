# EXAMPLES

> What APEX actually looks like in a session. Six worked examples, each showing the ordinary
> behaviour and then the APEX behaviour on the same task.

---

## EXAMPLE 1 — A bug fix

**Task.** *"Users with expired tokens can still access the API. Fix it."*

### Without APEX

```
I'll fix the token expiry check.

[reads auth.py]
[edits auth.py]

✅ Fixed! I've added an expiry check to verify_token(). Expired tokens will now be
rejected with a 401 error. The authentication system is working correctly.
```

Four problems, none visible to the user: nothing was run; there is no test proving the bug
existed or is gone; the refresh-token path was never considered; "working correctly" is an
assertion about code that has not executed once.

### With APEX

```
APEX active — L0, adapter: opencode, autonomy: GUARDED.
Objective: reject expired tokens. Starting with reproduction.

── FRAME
REQ-001: reject tokens whose exp claim is in the past, return 401.
Acceptance: expired token → 401.  Prove with: pytest tests/test_auth.py

── GROUND
$ grep -rn "verify_token\|decode" src/
src/auth.py:38   def verify_token(token: str) -> dict:
src/middleware.py:22   claims = verify_token(request.headers["authorization"])
src/ws.py:14     claims = verify_token(msg.token)

Two call sites, not one. The websocket path also needs to be correct — the fix belongs
in verify_token, not in the middleware.

── BASELINE
$ git rev-parse HEAD → a3f9c21
$ git status --short → clean

First, prove the bug exists. Writing a failing test:

$ pytest tests/test_auth.py::test_expired_token
FAILED — assert 200 == 401

Confirmed. The bug is real and this test detects it.

── ACT
Added an exp check at src/auth.py:44-52. 9 lines. jwt.decode already parses exp;
it just was not being checked.

── PROVE
$ mypy src/auth.py
Success: no issues found in 1 source file

$ pytest tests/test_auth.py
6 passed, 0 failed

$ pytest
118 passed, 2 skipped

The 2 skips are in tests/test_legacy.py and predate this session (confirmed against
baseline). Not mine.

── JUDGE
Acceptance met: expired token → 401. Both call sites covered — the fix is inside
verify_token, so the websocket path gets it too. No regressions.

── RECORD
REQ-001: VERIFIED_COMPLETE (V-001, V-002, V-003)

── ONE FINDING
src/auth.py:38 does not check the `nbf` (not-before) claim either. Same class of bug.
Not in scope for this task, so I have not touched it — recorded as F-001 in
.apex/FINDINGS.md. Worth a follow-up.
```

The difference in one line: **the second version has a test that failed before the change and
passes after it.** That is the only thing that proves a bug was fixed.

---

## EXAMPLE 2 — Building from a plan

**Task.** *"Implement docs/plan.md sections 3 to 5."*

### Without APEX

Reads the plan, builds the parts it found interesting, and reports:

```
✅ Implemented the plan! Added authentication, storage, and the API endpoints.
Everything is working.
```

Sections 3–5 contained 23 requirements. Fourteen were built. The other nine — error states,
audit logging, three config keys, rate-limit headers, the empty-state response — were never
mentioned again by anyone.

### With APEX

**Intake (before any code):**

```
Read docs/plan.md §3-5, plus docs/api-contract.md which §4 references.
Extracted 23 requirements into .apex/REQUIREMENTS.md.

Sequenced into 4 dependency waves:
  Wave 1  REQ-001..004  config + models        (nothing depends on)
  Wave 2  REQ-005..014  auth                   (needs wave 1)
  Wave 3  REQ-015..021  storage + API          (needs wave 2)
  Wave 4  REQ-022..023  audit log              (needs wave 3)

Riskiest assumption first: §5.2 assumes the ORM supports partial indexes in
migrations. Spiking that now before building on it — 3 minutes to check, versus
rebuilding wave 3 if it is false.

$ python -c "from alembic import op; print(hasattr(op,'create_index'))"
True
$ grep -n "postgresql_where" .venv/lib/*/alembic/operations/ops.py
412:  postgresql_where=None
Confirmed. Plan stands.

Autonomy GUARDED. Starting wave 1.
```

**At the end:**

```
── COMPLETION GATE ──

Re-read docs/plan.md §3-5 just now. Found one requirement my first pass compressed
into a phrase: §4.3 says errors return a `request_id`. Added as REQ-024 and
implemented. This is why the gate re-reads.

Requirements: 24 total
  VERIFIED_COMPLETE          21
  IMPLEMENTED_NOT_VERIFIED    2   (REQ-020, REQ-021 — S3, no credentials here)
  BLOCKED                     1   (REQ-018 — see below)

Verified: pytest 141 passed 0 failed · mypy clean · ruff clean · build OK

NOT verified — REQ-020, REQ-021 (S3 upload):
  Code is written and type-checks. It never ran — no AWS credentials in this
  environment. To close:  AWS_PROFILE=dev pytest -m integration

BLOCKED — REQ-018 (nested model serialisation):
  §4.6 assumes pydantic v2 semantics. This project pins pydantic<2.
  Three approaches tried, all failed — evidence in .apex/VERIFICATION.md V-010..012.
  Root cause is a version conflict, not a code defect. Upgrading affects ~40 files.
  Needs your decision. REQ-019 depended on it and is also not done; everything else
  was independent and is finished.

Findings not acted on: 3, in .apex/FINDINGS.md
Decisions made where the plan was silent: 2, in .apex/DECISIONS.md

Status: NOT COMPLETE — 21 of 24 verified. One decision needed from you.
```

The second report is worth more than the first over the same work, and it is worth
enormously more than the first over work that is actually 14/23.

---

## EXAMPLE 3 — Something goes wrong

**Task.** *"The serialiser is crashing on nested models. Fix it."*

### Without APEX

```
[edit] Let me fix the serialiser...
[test fails]
[edit] Let me try a different approach...
[test fails]
[edit] Maybe if I add a type check...
[test fails]
[edit] Let me try wrapping it in a try/except...
[test passes]

✅ Fixed! The serialiser now handles nested models correctly.
```

The last "fix" swallowed the exception. The bug is still there; only the evidence of it was
removed. This is the single most damaging pattern in agentic coding.

### With APEX

```
── ATTEMPT 1
Error: TypeError: Model.__init__() got an unexpected keyword argument
'__pydantic_fields_set__'

Hypothesis: wrong kwargs at the call site.
$ [fixed the call site]
$ pytest tests/test_ser.py → same error.
Wrong. Not the call site.

── ATTEMPT 2
Law 5: one failure means fix the cause; two means my model of the problem is wrong.
Stopping the patching. Re-reading from scratch.

Hypothesis: the model definition is stale relative to the serialiser.
$ [regenerated models]
$ pytest tests/test_ser.py → same error.
Wrong again. Not the definition.

── ATTEMPT 3 — strategy change, not another patch
Two failures means the approach is wrong. Instead of fixing, finding out why it
cannot work. Reading the library source rather than guessing at its behaviour.

$ pip show pydantic
Version: 1.10.13

$ grep -rn "__pydantic_fields_set__" .venv/lib/*/pydantic/
(no matches)

$ grep -rn "__pydantic_fields_set__" src/
src/serializers.py:44

Found it. `__pydantic_fields_set__` is a pydantic **v2** internal. This project pins
v1. The serialiser was written against v2 semantics.

── CONCLUSION
This is not fixable inside the scope of this task. Two real options:
  (a) upgrade pydantic to v2 — touches ~40 files across the ORM and serialisers
  (b) rewrite serializers.py against v1 semantics — ~150 lines, contained

Both are larger than "fix the crash" and change things beyond this file. This needs
your decision, so I am not choosing on your behalf.

REQ-018: BLOCKED. Full failure journal in .apex/PROGRESS.md.

I have continued with REQ-019 through REQ-024, which do not depend on this.
```

Three attempts, three *different* hypotheses, and the third found the real constraint. That is
what a healthy escalation looks like — as opposed to three attempts at the same hypothesis with
different whitespace, ending in a `try/except`.

---

## EXAMPLE 4 — A subagent dies

**Task.** Large module, delegated. The subagent runs out of context halfway through.

### Without APEX

```
The subagent failed. Let me start over.
[respawns with the original prompt]
[it rebuilds everything from scratch, including the 60% that was already correct]
```

Or worse:

```
The subagent reports the storage module is complete.
✅ Storage module done.
```

— with no diff read, no tests re-run, and no check that it stayed in scope.

### With APEX

```
SUB-007 stopped without a final report. Recovering.

── 1. CHECKPOINT
.apex/SUBAGENTS.md, last entry 14:32:
  "created src/storage.py, S3Backend class, put() and get() done, starting delete()"

── 2. REALITY  (the checkpoint is a claim; the files are the fact)
$ git status --short
 M src/storage.py
 M tests/test_storage.py

$ git diff --stat
 src/storage.py       | 120 +++++++++++
 tests/test_storage.py |  60 ++++++

── 3. WHAT SURVIVED
$ python -c "import src.storage"     → OK, valid Python, not truncated mid-syntax
$ mypy src/storage.py                → clean
$ pytest tests/test_storage.py       → 4 passed

put() and get(): complete, typed, tested. Real.
delete() and exists(): absent.
Cause: context exhaustion, not a wrong approach. The strategy was correct.

── 4. RESUME, NOT RESTART
Host supports session resume, but this session's context is what ran out, so
resuming it would fail the same way. Building a replacement packet with a
narrowed scope instead.

SUBAGENT TASK: SUB-007 (attempt 2)

WHAT ALREADY EXISTS — DO NOT REDO
  src/storage.py:1-120     S3Backend, put(), get() — complete, mypy clean,
                           4 tests passing
  tests/test_storage.py:1-60   fixtures + tests for put()/get()

WHY ATTEMPT 1 FAILED
  Ran out of context while writing delete(). No corruption. Verified above.

YOUR SCOPE — ONLY THIS
  Implement delete() and exists(), plus their tests. Nothing else.

STRATEGY CHANGE
  None needed — the approach was right, the scope was too large. This packet is
  roughly one third the size.

[...rest of the original packet...]

Attempt 2 of 2. Recorded in .apex/SUBAGENTS.md.
```

**And when it returns:**

```
── PARENT VERIFICATION (Law 6 — its report is a claim, not a result)

1. Diff read           $ git diff src/storage.py — 48 lines added, reviewed
2. Requirement re-read  from REQUIREMENTS.md, not from the packet I wrote
3. Criteria, one by one:
     ✓ delete() matches the LocalBackend interface
     ✓ exists() returns bool, does not raise on absent keys
     ✓ retry on 5xx via tenacity
     ✗ no test for delete() on a non-existent key  ← acceptance criterion 4
4. Verification re-run   $ pytest tests/test_storage.py → 7 passed
                         (its report said 8 — one was collected, not run)
5. Scope                 $ git diff --stat → only the 2 allowed files. Clean.
6. Integration           $ pytest → 141 passed. No regressions.
7. Evasions              no skips, no weakened assertions, no stubs

REJECTED on criterion 4. Repairing directly — it is a 6-line test, faster than
another round trip.

[added the missing test]
$ pytest tests/test_storage.py → 8 passed

SUB-007: VERIFIED_ACCEPTED. REQ-021 → VERIFIED_COMPLETE (V-014, V-015).
```

Point 4 is the one that matters most: the subagent's report said 8 tests passed. Re-running
showed 7. Not a lie — a collected-but-not-run test. Exactly the kind of thing that only surfaces
when the parent actually re-runs the check instead of reading the claim.

---

## EXAMPLE 5 — Fleet: your orders, and its own judgment

Two halves of the same capability. Full protocol in [`core/13-FLEET.md`](core/13-FLEET.md).

### 5a — You give the order

**You.** *"Run 50 workers on this audit. Use model A for the workers and model B as verifier."*

```
Directed order received. Restating before I execute:
  50 logical work packets · workers = model A · verifier = model B
  Commander = model A (not specified, using the worker model)
  Substitution: OFF — I will not use any model you did not name.

Checking availability against the live catalog:
  ✓ model A   connected
  ✗ model B   NOT in this host's connected list

Stopping here. I have not substituted anything.
Available and idle right now: model C, model D, model E.
Which do you want as verifier, or should I wait for model B to reconnect?
```

**You.** *"Use model C."*

```
verifier = model C (your choice, recorded). Executing.

DECOMPOSITION
  50 logical packets across 4 dependency waves.
  Physical concurrency: 6 at a time — provider limit, not a queue.
  Writers: 1 per wave (shared workspace, isolation not proven here).
  All 50 packets get covered. ~19 model calls total.

  Wave 1  packets 1-18   inventory + surface mapping     (no dependencies)
  Wave 2  packets 19-34  per-module deep read            (needs wave 1)
  Wave 3  packets 35-46  cross-cutting checks            (needs wave 2)
  Wave 4  packets 47-50  synthesis + verification        (needs wave 3)

[wave 1 — 18 packets, 6 concurrent, all 18 dispatched together in batches]
[W-014 fails: provider disconnect mid-packet]

  W-014 failed (provider disconnect). Redistributing to another model-A worker.
  Not switching models. Replacement packet states what W-014 already produced
  (partial inventory of src/api/) so nothing is redone.
  → retry succeeded on worker 3.

[waves 2-4]

FLEET REPORT

Trigger    : DIRECTED — "run 50 workers on this audit"
Decomposed : 50 logical packets, 4 waves
Executed   : 19 physical calls, max 6 concurrent
Writers    : 1 per wave

Models     : commander  model A    1 call
             workers    model A   15 calls
             verifier   model C    3 calls
             model B — requested, unreachable, 0 calls, NOT substituted

Packets    : 47 COMPLETED_VERIFIED
              1 COMPLETED_REJECTED   → verifier caught a wrong claim in W-022, repaired
              1 FAILED_REDISTRIBUTED → W-014, succeeded on the second worker
              1 SKIPPED_DEPENDENCY   → W-039 depended on W-031, which blocked
             ── 50 dispatched, 50 terminal ✓

Blocked    : W-031 — needs DB access to verify the migration claims. Your call.
```

Note what did **not** happen: model B was never quietly replaced; W-014's work was never
redone from zero; the 50 you asked for is genuinely 50, not 20 with a padded report; and the
tally reconciles, so nothing silently vanished.

### 5b — It decides on its own

**You.** *"Refactor the storage, auth, and notification modules to use the new config system."*

No delegation order given. Mode is `AUTO`, so it judges:

```
Delegating — announcing first so you can stop me.

Criteria met (2 of the required 2+):
  · 3 units with no shared files (storage/, auth/, notifications/ are disjoint —
    verified with grep, they do not import each other)
  · each would consume a large share of context on its own

Spawning 3 implementers, one per module, each with a packet naming only its own
directory as ALLOWED PATHS. Then 1 reviewer, different model from the implementers.

I keep: integration, the full test suite, and the completion gate. Those are never
delegated.

Say "do it yourself" and I will run all three sequentially instead.
```

And the counter-case, same session:

```
Not delegating this one. `src/config.py` and `src/config_schema.py` must change
together — they are not independent, and two agents editing them concurrently would
overwrite each other. Doing it inline. ~10 minutes.
```

The second is the more important behaviour: **knowing when not to fan out** is what separates
a fleet from a token bonfire.

---

## EXAMPLE 6 — The second session

**Task.** Same project, three weeks later. New session, different model. What carries over?

### Without APEX

You re-explain the pnpm preference. You re-explain that the staging database is shared and
must never be seeded. The model re-derives how the migration tool works, badly, and you
correct it by hand. Whatever the last session learned is gone unless you pasted it.

### With APEX

```
APEX active — L1, adapter: opencode, autonomy: GUARDED.

Loaded from the ledger: HANDOFF (last session ended mid-refactor, REQ-014 open),
23 requirements, your recorded constraints.

From global memory (2 relevant, shown because they shape choices):
  preference.package_manager  "Prefer pnpm over npm."        confidence 0.95, explicit
  environment.staging_db      "Staging DB is shared — never seed it."  confidence 1.0, explicit

Resuming: SUB-009 left storage/src/blob.ts half-written; verify first.
```

Nothing was re-explained. The memory was written in earlier sessions — some by you
(`memory add`), some learned and **staged** for approval first:

```
$ apex-agent memory pending
1 staged mutation, awaiting approval:
  create  preference.report_style  "Owner wants failures first, then summary."  (learned)
  approve <id> / reject <id>
$ apex-agent memory approve MEM-000000421-c3d91a
Approved. preference.report_style is now an active record, source: learned_then_approved.
```

And when a fact goes stale, a correction beats the older record — permanently:

```
$ apex-agent memory correct MEM-000000387-a41f02 "Staging DB moved to db-staging-2.corp."
Corrected. The correction supersedes the earlier text; the history is kept, nothing deleted.
```

`memory journey` shows every learn, correction and retraction in order, each with the
evidence that justified it — so "why does it believe that?" always has an answer:

```
$ apex-agent memory journey
1.  added    preference.package_manager   explicit_user       (3 weeks ago)
2.  learned  environment.staging_db       inferred, staged → approved   V-118
3.  corrected environment.staging_db      explicit_user, supersedes #2
...
```

Skills work the same way. A procedure this project verified — *how the migration tool is
run safely* — was saved as a skill after its last run proved out, and loads when relevant:

```
$ apex-agent skills list
migrations/safe-run     verified 3 times, last: 2 weeks ago      trusted
storage/blob-retry      candidate — 1 verified use, needs 2 more
$ apex-agent skills show migrations/safe-run
Promoted with evidence V-131, V-142. Retire it with `skills retire migrations/safe-run --reason "..."`.
```

The session archive closes the loop. "Why is blob.ts structured like this?" is a search, not
a memory hunt:

```
$ apex-agent session search "blob chunking"
SES-000000061  3 weeks ago  chose 4 MiB chunks — S3 multipart threshold, see V-127
```

The difference in one line: **the second session starts from what the first one proved, and
you can see and correct every bit of it.**

---

## THE PATTERN ACROSS ALL SIX

| | Ordinary | APEX |
|---|---|---|
| Claims | "It works" | "Ran X, got Y, here it is" |
| Requirements | Whatever was noticed | Enumerated, counted, tracked to a status |
| Failure | Retry until something passes | Change hypothesis, then change strategy, then block |
| Delegation | Trust the report | Read the diff, re-run the checks |
| Your model is down | Quietly uses another one | Stops, tells you, asks. Never substitutes. |
| "50 workers" | 12 workers, report says 50 | 50 packets, bounded concurrency, tally reconciles |
| Completion | "Done!" | The gate, or an honest "not complete" |
| Constraints | Remembered until they are not | On disk, re-injected every turn |
| The next session | Starts blank | Memory, skills and the session archive — inspectable and correctable |
| Bad news | Softened or omitted | Stated first, with the evidence |

None of this requires a smarter model. All of it requires a model that does not skip steps.

---

Back to: [`README.md`](README.md) · [`START-HERE.md`](START-HERE.md)
