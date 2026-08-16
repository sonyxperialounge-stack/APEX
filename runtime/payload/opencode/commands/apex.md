---
description: Run a task under APEX — intake, execution loop, and completion gate
---

Operate under APEX for this task.

1. `apex_init` (once), then `apex_memory_read`, then `apex_status`.
2. Extract every requirement from the sources with `apex_req_add`. Split compound ones —
   "add auth and rate limiting" is two requirements, because they fail independently.
3. For each: `apex_req_status IN_PROGRESS` → implement → `apex_verify` →
   `IMPLEMENTED_NOT_VERIFIED` → `VERIFIED_COMPLETE` (only once evidence exists).
4. Use `apex_check` before anything destructive, bulk, or irreversible.
5. `apex_resume` after every unit of work.
6. `apex_gate` before using the word "complete". If it fails, report the true state instead of
   softening the language.

Never claim something works without running it. Requirements have IDs and exactly one status.
Two identical failures means the strategy is wrong, not that you need a third attempt.

$ARGUMENTS
