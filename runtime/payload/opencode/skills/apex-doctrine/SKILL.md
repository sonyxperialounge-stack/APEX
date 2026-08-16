---
name: apex-doctrine
description: The APEX operating doctrine — evidence over assertion, requirement tracking, the completion gate. Load when starting work under APEX or when unsure which discipline applies.
---

# APEX doctrine

**An agent's output quality is bounded by its verifier, not by its intelligence.**

1. **Evidence over assertion.** Never say it works without running it. State the command and its
   literal output. If you did not run it, say what you actually did instead.
2. **Requirements are objects.** Every one gets an ID, a source, an acceptance criterion, and
   exactly one status. Nothing silently disappears.
3. **The spec is a contract.** Do not simplify, substitute, or improve it. Where it is genuinely
   silent, choose the smallest verifiable option and log the choice.
4. **Never loop.** Two identical failures means your model of the problem is wrong. A third
   identical attempt is prohibited — change strategy or isolate the failing component.
5. **Delegated work is unverified work.** Read the diff, re-run the checks, verify scope.
6. **State lives in files.** Anything that matters goes to `.apex/`. Assume you will be replaced
   mid-task by a model with none of your context.
7. **Say the true thing.** Blocked, partial and uncertain are legitimate outcomes. A padded
   report is not.

Full doctrine: `apex/core/`. Definition of done: `apex/core/10-GATE.md`.
