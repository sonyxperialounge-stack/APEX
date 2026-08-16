# 05 — THE LEDGER

> The durable state that outlives your context window. Law 7 made this mandatory; this file
> defines it exactly.
>
> Templates to copy: `../templates/`

---

## WHY FILES AND NOT MEMORY

Every long agentic session degrades identically:

1. Early on, you agree to a constraint. ("Don't touch `config/prod.yaml`.")
2. Forty messages later, that instruction has been compacted or pushed out of the window.
3. You violate it, confidently, with no awareness that you ever knew otherwise.

Context is a lossy, silently-truncating medium. Files are not. Everything that must survive
goes to disk the moment it exists — not at a checkpoint, not at the end.

The test for whether the ledger is working: **if you were terminated right now and replaced by
a model with zero context, would it lose anything but time?** If yes, the ledger is behind.
Fix it before continuing.

---

## LOCATION

The ledger lives in the **user's project**, at `<PROJECT_ROOT>/.apex/`. Never in the APEX
folder itself — APEX is shared across projects; the ledger is per-project.

```
<PROJECT_ROOT>/.apex/
├── config.json          Boundaries, autonomy mode, protected paths
├── REQUIREMENTS.md      Every requirement, its status, its evidence      ← the spine
├── PROGRESS.md          Rolling execution log + the exact resume point
├── VERIFICATION.md      Every check run, including the ones that failed
├── DECISIONS.md         Judgment calls made where the spec was silent
├── SUBAGENTS.md         Delegated work, checkpoints, retries
├── HANDOFF.md           Compact state for a replacement model
├── FINDINGS.md          Out-of-scope problems noticed, not acted on
├── COMPLETION.md        Written once, at the end, after the gate passes
├── snapshots/           Pre-change file copies, per requirement ID
└── archive/             Verbose detail from finished phases
```

Add `.apex/snapshots/` to `.gitignore` if the project uses git. Keep the markdown files —
they are the project's record of how it was built, and they are useful to humans.

**If `.apex/` already exists, it is a previous session's memory.** Do not overwrite it. Read
`HANDOFF.md` first, then `REQUIREMENTS.md`, then verify the recorded state against reality
before trusting it (`04-LOOP.md` → Phase 1, and Law 2 applies to your own past claims too).

---

## THE FILES

### `config.json` — the boundaries

Written once at intake, updated only when the user changes something.

```json
{
  "project_root": "D:/work/myapp",
  "autonomy": "GUARDED",
  "allowed_paths": ["."],
  "do_not_read": ["secrets/", ".env", "api-key.md"],
  "do_not_touch": ["config/prod.yaml", "migrations/", "vendor/"],
  "ignore": ["node_modules/", ".git/", "dist/", "__pycache__/"],
  "sources_of_truth": ["docs/plan.md", "docs/api-contract.md"],
  "verify_commands": {
    "parse":  "python -m py_compile",
    "types":  "mypy src/",
    "lint":   "ruff check src/",
    "test":   "pytest",
    "build":  null
  },
  "limits": {
    "max_same_strategy_failures": 3,
    "max_subagent_retries": 2,
    "handoff_at_context_pct": 80
  },
  "delegation": {
    "mode": "AUTO",
    "max_concurrent_calls": 6,
    "writers_per_wave": 1,
    "models": { "commander": null, "workers": [], "reviewer": null, "allow_substitution": false },
    "on_class_exhausted": "ask_user"
  }
}
```

`delegation` governs fleet behaviour — see `13-FLEET.md`. `allow_substitution` is `false` by
default and nothing may flip it automatically: when a user-named model is unavailable, the
correct action is to stop and ask, never to quietly use a different one.

`verify_commands` is important: discover the project's real commands once, record them, and
never guess again. `null` means the project has no such step — which is itself worth knowing.

---

### `REQUIREMENTS.md` — the spine

The single most important file. If you keep only one, keep this.

Two sections: a summary table for scanning, and detail blocks for substance.

```markdown
# Requirements

**Totals:** 23 total · 14 verified · 3 implemented-unverified · 4 not started · 1 blocked · 1 n/a
**Last updated:** 2026-08-15T18:40Z

| ID | Summary | Status | Evidence |
|---|---|---|---|
| REQ-001 | Config loader reads YAML | VERIFIED_COMPLETE | V-001, V-002 |
| REQ-014 | Reject expired tokens with 401 | VERIFIED_COMPLETE | V-007, V-008 |
| REQ-021 | Upload artifacts to S3 | IMPLEMENTED_NOT_VERIFIED | V-009 (NOT_RUN) |
| REQ-030 | Migrate the users table | BLOCKED | no DATABASE_URL |
| REQ-031 | Audit log for admin actions | NOT_STARTED | — |

---

### REQ-014
- **Source:** docs/plan.md §3.2
- **Requirement:** Reject tokens whose `exp` claim is in the past, returning HTTP 401.
- **Depends on:** REQ-011
- **Acceptance:** Expired token → 401, body `{"error":"token_expired"}`
- **Verify by:** `pytest tests/test_auth.py::test_expired_token`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** `src/auth.py:44-58`, `tests/test_auth.py:112-130`
- **Evidence:** V-007 (6 passed 0 failed), V-008 (suite 118 passed)
- **Notes:** Refresh-token path is out of scope per §3.2; tracked as REQ-022.
```

**Invariants.** No row is ever deleted. No ID is ever reused or renumbered. Every row has
exactly one status. The totals line is recomputed on every update — a totals line that does not
sum is a corrupted ledger.

**The six statuses, and nothing else:**

| Status | Means |
|---|---|
| `NOT_STARTED` | Identified, not begun |
| `IN_PROGRESS` | Being worked now, or failed verification and returned here |
| `IMPLEMENTED_NOT_VERIFIED` | Code exists; the oracle could not run. **Must** say why. |
| `VERIFIED_COMPLETE` | Implemented and proven at Tier 2+ with recorded evidence |
| `BLOCKED` | Cannot proceed. **Must** record exact evidence and what would unblock it. |
| `NOT_APPLICABLE` | **Must** carry a written justification |

---

### `PROGRESS.md` — the rolling log

Append-only during a phase, compacted between phases. The last section is the most important
thing in the entire ledger:

```markdown
# Progress

## Current
- **Phase:** 2 of 3 — Authentication
- **Working on:** REQ-021
- **Started:** 2026-08-15T14:00Z

## Completed
### 2026-08-15T18:22Z — REQ-014 · Expired token rejection
- Changed: `src/auth.py:44-58` (+14/-2), `tests/test_auth.py:112-130` (+18)
- Ran: `pytest tests/test_auth.py` → 6 passed, 0 failed
- Ran: `pytest` → 118 passed, 2 skipped (both pre-existing)
- Baseline: `a3f9c21` · Result: VERIFIED_COMPLETE

## Blocked
- REQ-030 — no `DATABASE_URL`. Unblock: read-only connection string.

## Known issues
- `tests/test_legacy.py` has 2 skips predating this session. Not mine; not fixed.

## RESUME POINT
Next action: implement REQ-021 (S3 upload) in `src/storage.py`.
Do not redo: REQ-001..REQ-014 are verified — see VERIFICATION.md.
Verify first: run `pytest` to confirm the tree is still green before editing.
Watch out: `src/storage.py` is imported by the worker; check blast radius.
```

Update after **every** unit, not at the end. The resume point is rewritten every time — it is
what a replacement model reads first.

Keep the active file under roughly 200 lines. When it exceeds that, move finished-phase detail
to `archive/PHASE-N.md` and leave a pointer. **Never archive an unresolved item.** Never delete
evidence to save space.

---

### `VERIFICATION.md` — the proof

```markdown
# Verification Log

| ID | REQ | Type | Command | Expected | Actual | Result |
|---|---|---|---|---|---|---|
| V-007 | REQ-014 | unit | `pytest tests/test_auth.py` | all pass | 6 passed, 0 failed | PASS |
| V-008 | REQ-014 | suite | `pytest` | no new failures | 118 passed, 2 skipped | PASS |
| V-009 | REQ-021 | integration | `pytest -m integration` | all pass | no AWS credentials | NOT_RUN |
| V-010 | REQ-018 | unit | `pytest tests/test_ser.py` | all pass | 4 failed | FAIL |

## Evidence

### V-010 — FAIL
```
FAILED tests/test_ser.py::test_nested - TypeError: Model.__init__() got an
unexpected keyword argument '__pydantic_fields_set__'
```
Cause: requirement assumes pydantic v2; project pins `pydantic<2`. → REQ-018 BLOCKED.
```

A log with no `FAIL` and no `NOT_RUN` rows over a long project is not excellence — it is
evidence that verification was not really happening.

---

### `DECISIONS.md` — the judgment calls

Only decisions that would matter to someone reading the code later. Not every choice.

```markdown
## DEC-003 — 2026-08-15T16:10Z
- **Context:** REQ-021, plan.md is silent on retry behaviour for S3 uploads.
- **Problem:** Transient 5xx will fail the whole job.
- **Options:** (a) no retry — matches the letter of the spec; (b) 3 retries with backoff
  using the already-present `tenacity`; (c) add a queue — new dependency, new scope.
- **Chose:** (b)
- **Why this does not violate the plan:** The spec is silent, `tenacity` is already a
  dependency, no interface changes, behaviour on permanent failure is unchanged.
- **Affects:** `src/storage.py:95-112`
- **Reversible:** yes — delete the decorator.
```

Also log here: conflicts between sources and how you resolved them; where code contradicted the
plan; anywhere you deviated for a reason.

This file is not a licence to invent scope. It is a record of gaps you filled minimally.

---

### `SUBAGENTS.md` — delegated work

One block per delegated task. Full protocol in `06-DELEGATION.md`.

```markdown
## SUB-002 — Migration module
- **Parent:** REQ-030 · **Agent/session:** ses_8f2a1c
- **Scope:** Write forward+rollback migration for the users table. Nothing else.
- **Allowed:** `migrations/`, `tests/test_migrations.py`
- **Forbidden:** `src/`, `config/prod.yaml`
- **Acceptance:** `alembic upgrade head` then `alembic downgrade -1` both succeed
- **State:** FAILED_RETRYING (attempt 2 of 2)
- **Checkpoint:** created `migrations/003_users.py` (forward complete, downgrade empty)
- **Files changed:** `migrations/003_users.py`
- **Parent verification:** REJECTED — downgrade is a no-op, violates acceptance
- **Failure class:** incomplete-implementation · **Next strategy:** narrow to downgrade only
```

`State` must be one of: `ASSIGNED`, `RUNNING`, `CHECKPOINTED`, `RETURNED_UNVERIFIED`,
`FAILED_RETRYING`, `VERIFIED_ACCEPTED`, `REJECTED`, `ABANDONED_BLOCKED`.

A subagent task is never `VERIFIED_ACCEPTED` on the subagent's own say-so (Law 6).

---

### `HANDOFF.md` — the successor's briefing

The one file a replacement model reads first. Keep it **short and current** — completeness
lives in the other files; this one is the index.

```markdown
# Handoff — 2026-08-15T18:40Z

## Objective
Implement docs/plan.md §3 (authentication) in D:/work/myapp.

## Sources of truth
docs/plan.md, docs/api-contract.md. User restrictions: never read `.env` or `api-key.md`;
never modify `config/prod.yaml` or `migrations/`.

## State
14/23 requirements verified. See REQUIREMENTS.md for the table.

## Architecture you need to know
Auth lives in `src/auth.py`; `verify_token()` is the single chokepoint — everything routes
through it. Tokens are PyJWT HS256. The test suite is pytest, run from the repo root.

## Commands
`pytest` · `mypy src/` · `ruff check src/`. No build step.

## Environment
Python 3.12, venv at `.venv`. No AWS credentials — integration tests cannot run here.

## Known failures
REQ-018 blocked on the pydantic v1/v2 conflict (see V-010). REQ-030 blocked on DATABASE_URL.

## Subagents
SUB-002 failed twice, currently rejected. Do not restart it from zero — its forward migration
is valid; only the downgrade is missing.

## RESUME
Start from: REQ-021, `src/storage.py`.
Do not redo: REQ-001..REQ-014 (verified, evidence in VERIFICATION.md).
Verify first: run `pytest` and confirm 118 pass before you change anything.
```

Rewrite this when: a phase completes · context is getting long · before switching models ·
before ending a session · after any blocker · after an architectural discovery.

---

### `FINDINGS.md` — what you saw but did not touch

Every real problem you notice outside your scope goes here instead of into your diff. This is
what makes Law 4 survivable — you are not ignoring the problem, you are routing it correctly.

```markdown
## F-004 — `src/legacy/parser.py:88` swallows all exceptions
Bare `except:` with `pass`. Will hide real failures. Out of scope for this session
(plan.md does not cover legacy/). Recommend a follow-up task.
```

---

## OPERATING RULES

1. **Write immediately.** The moment a fact exists, it goes to disk. Not at a checkpoint.
2. **Never let a requirement vanish.** Deletion from `REQUIREMENTS.md` is corruption.
3. **Compact, do not destroy.** Move verbose finished detail to `archive/`; leave a pointer.
4. **Files are claims, code is truth.** On resume, verify the ledger against reality before
   trusting it. A ledger entry saying `VERIFIED_COMPLETE` for code that no longer exists is
   just a stale claim.
5. **No secrets, ever.** Not in progress notes, not in evidence blocks, not in error output.
   Redact before writing. `03-EVIDENCE.md` output blocks are a common leak path.
6. **Keep evidence literal.** Paste the real command output. Your paraphrase is not evidence.
7. **The ledger is not the deliverable.** If maintaining it starts consuming more effort than
   the work, compact it — but never below `REQUIREMENTS.md` + the resume point.

---

Next: `06-DELEGATION.md` · `08-CONTEXT.md` (when the ledger gets big)
