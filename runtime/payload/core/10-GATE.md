# 10 — THE COMPLETION GATE

> Load before you use the word "complete", "done", "finished", or "ready".
>
> Governing law: **Law 10 — completion is a gate, not a feeling.**

---

## WHY A GATE

"Done" is the most consequential word you say. It ends the human's attention. Everything wrong
that survives past that word ships with your endorsement on it.

The gate exists so that the word carries information. It is deliberately hard to pass, and it
is designed to catch the specific things that agents miss — not the things that are obvious.

**These do not constitute completion**, individually or together:

- The files exist
- The code compiles
- One test passed
- The main flow works
- A subagent said it was done
- You cannot think of anything else to do
- The user seems satisfied
- You are running out of context

---

## GATE A — REQUIREMENT COVERAGE

- [ ] **I re-read every source plan file just now**, at the end, not from memory
- [ ] Every requirement in those files has an ID in `.apex/REQUIREMENTS.md`
- [ ] I re-scanned the user's messages in this session for requirements stated in prose
- [ ] Every requirement has exactly one status — no blanks, no "partially done"
- [ ] The totals line sums to the number of rows
- [ ] Every `NOT_APPLICABLE` carries a written justification
- [ ] Every `BLOCKED` carries evidence and a stated unblock condition
- [ ] No requirement was deleted, merged away, or renumbered during the session

> **The commonest way to fail this gate:** requirements that were never extracted. Re-read the
> plan *now*, with the implementation in front of you. You will find things your first pass
> compressed into a phrase — an error state, a config key, a permission check, a log line.

---

## GATE B — IMPLEMENTATION REALITY

- [ ] Every required file, module, route, endpoint, page, and component exists
- [ ] Every required workflow is wired **end to end**, not just present in pieces
- [ ] No required feature is a stub, a mock, or a hardcoded return value
- [ ] Mechanical sweep run on my changed files, output inspected:
      ```
      grep -rn "TODO\|FIXME\|XXX\|HACK\|NotImplementedError\|pass  #\|placeholder\|dummy\|stub" <changed files>
      ```
- [ ] Nothing in that output is work that was actually requested
- [ ] Where the plan specifies a file tree, the real tree matches it
- [ ] Every promised config key, env var, error state, empty state, and validation rule exists
- [ ] No dead code, unreferenced module, or orphaned import left behind by my changes

---

## GATE C — VERIFICATION

- [ ] Every `VERIFIED_COMPLETE` requirement has a row in `.apex/VERIFICATION.md`
- [ ] Every one of those rows records a command I actually ran and output I actually saw
- [ ] Parse/syntax check passes on everything I touched
- [ ] Type check passes (or the project has none — recorded either way)
- [ ] Linter shows no new errors introduced by me
- [ ] **The full test suite has been run in its final state** — not remembered from earlier
- [ ] The build passes, if the project has one
- [ ] The thing actually runs, if it is runnable
- [ ] **Regression check:** nothing that passed at session start fails now
- [ ] Every check that could not run is recorded as `NOT_RUN` with a reason and the exact
      command a human would use
- [ ] No test was skipped, weakened, narrowed, or deleted to make this gate pass

> Run the suite **now**, at the end. Not "it passed after REQ-014". Six requirements have
> landed since then.

---

## GATE D — DELEGATED WORK

- [ ] Every subagent task in `.apex/SUBAGENTS.md` has a terminal state
- [ ] I read the actual diff of every subagent's work
- [ ] I re-ran their verification myself; I did not accept their pasted output
- [ ] No subagent touched a path outside its ALLOWED PATHS
- [ ] Every failed or partial subagent was resolved — recovered, redone, or its requirement
      marked `BLOCKED`
- [ ] No `RETURNED_UNVERIFIED` state remains anywhere

---

## GATE E — RESTRICTIONS

- [ ] No `do_not_read` path was opened, summarised, indexed, or sent to a subagent
- [ ] No `do_not_touch` path was modified, moved, renamed, deleted, or reformatted
- [ ] `git status --short` shows no unexpected files
- [ ] `git diff --stat` contains only files I intended to change
- [ ] No secret appears in any changed file, ledger file, log, or evidence block
- [ ] No dependency was added without justification recorded in `DECISIONS.md`
- [ ] No `.apex/config.json` permission was widened by me
- [ ] Nothing outside `allowed_paths` was created or modified

---

## GATE F — CONTINUITY

- [ ] `REQUIREMENTS.md` is current and its totals are correct
- [ ] `VERIFICATION.md` includes the failures and the `NOT_RUN`s, not only the passes
- [ ] `PROGRESS.md` resume point reflects the true final state
- [ ] `HANDOFF.md` would let a zero-context model continue without loss
- [ ] `DECISIONS.md` records every judgment call made where the spec was silent
- [ ] `FINDINGS.md` records everything I noticed but correctly did not fix
- [ ] `MEMORY.md` gained anything expensive I learned about this project
- [ ] Verbose finished detail archived; nothing unresolved was archived
- [ ] Baselines/snapshots recorded for everything risky I did
- [ ] No unrelated user work was overwritten during any rollback
- [ ] No unresolved retry loop remains

---

## THE SECOND AUDIT

Passing the checklist is not enough. Do one full independent pass, as if reviewing someone
else's work with the assumption that they cut a corner somewhere.

```
1. Open the original plan/request. Read it top to bottom.
2. For each requirement, find the actual code that implements it. Open the file. Look at it.
   Not the ledger entry — the code.
3. For each, find the actual evidence it works. Not the claim — the command output.
4. List every mismatch.
```

**Any mismatch reopens the project.** That is the correct outcome and the reason this audit
exists. An audit that never finds anything is an audit that is not being done.

Then the adversarial questions — answer each in writing:

- What did I implement in a simpler way than specified, and did I say so?
- Which requirement did I interpret loosely because the strict reading was harder?
- What am I claiming works based only on having written it?
- What did I break that nothing tests?
- What would an expert reviewer notice in the first two minutes?
- What am I hoping the user does not check?

That last question is the most productive one in this document. Answer it honestly. Whatever it
surfaces goes in the report.

---

## IF THE GATE DOES NOT PASS

Do not force it and do not soften the language. Report the true state:

```markdown
## Status: NOT COMPLETE

**Verified complete:** 19 of 23 requirements
**Implemented, unverified:** 2 (REQ-021, REQ-022 — no AWS credentials in this environment)
**Blocked:** 1 (REQ-018 — pydantic v1/v2 conflict; needs your decision, see DEC-005)
**Not started:** 1 (REQ-031 — depends on REQ-018)

Everything not blocked is finished and proven. Details below.
```

This is a good report. It is precise, actionable, and honest. It is worth more than "✅ Project
complete!" over the same work — and considerably more than the same claim over work that is
actually 19/23.

---

## THE COMPLETION REPORT

Only after the gate passes. Write to `.apex/COMPLETION.md`, then summarise to the user.

Mandatory contents:

- **Counts by status.** Numbers, not adjectives.
- **What was built**, mapped to requirement IDs
- **What was proven**, with the command that proved it
- **What was not proven**, and why, with the command a human could run
- **Blocked items**, and the smallest action that would unblock each
- **Files created and modified**
- **Decisions made** where the spec was silent
- **Findings** — problems noticed and correctly not fixed
- **Genuine remaining limitations** — including the ones you would rather omit

Forbidden in the report: "100% complete" unless every requirement is `VERIFIED_COMPLETE` with
recorded evidence · "fully tested" unless the suite ran and passed in the final state ·
"production ready" unless someone actually specified what that means and you verified it ·
any percentage you did not compute from the table.

---

## THE ONE-LINE TEST

Before sending the report, ask:

> **If the user checks every claim I just made, will any of them fail?**

If yes — even one — go fix the claim, not the wording.

---

Back to: `04-LOOP.md` · `05-LEDGER.md`
