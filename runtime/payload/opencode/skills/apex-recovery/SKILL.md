---
name: apex-recovery
description: What to do when something fails twice — the escalation ladder and the anti-loop protocol. Load the moment a fix fails a second time.
---

# Recovery

**Attempt 1 — fix the actual cause.** Read the ENTIRE error, including the frames you would
normally skip. Fix the specific thing it named, not what you assume it means.

**Attempt 2 — your model of the problem is wrong.** Stop patching. Re-read the requirement and
the real code, freshly. State an explicit hypothesis, design a check that would disprove it, run
that check first, then fix.

**Attempt 3 — the strategy is wrong.** Change something structural: isolate to a minimal
reproduction, instrument the actual values, read the library source, bisect against a known-good
state, or ask a different model with a clean view.

**After that — block it, do not hide it.** Record what you tried, what you observed, the root
cause as best you can establish, and the smallest external action that would unblock it. Then
continue with everything independent.

**Never:** swallow the exception, skip the test, weaken the assertion, narrow the test run,
reframe the acceptance criterion, or declare it environmental without evidence.
