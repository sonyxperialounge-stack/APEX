# Subagent Log

## FLEET RUN — FLEET-001
- **Trigger:** DIRECTED "<the user's exact words>"  |  AUTONOMOUS "<why you decided>"
- **Mode:** AUTO | DIRECTED_ONLY | AGGRESSIVE
- **Logical packets:** <n>  ·  **Waves:** <n>  ·  **Max concurrent calls:** <n>
- **Writers per wave:** 1  ·  **Isolation:** none
- **Models ordered:** commander=<...> workers=[<...>] reviewer=<...>
- **Models actually called:** <model> × <calls>  (never list one you did not call)
- **Unavailable, NOT substituted:** <model> — <what the host reported>
- **Packet tally:** COMPLETED_VERIFIED <n> · COMPLETED_REJECTED <n> ·
  FAILED_REDISTRIBUTED <n> · SKIPPED_DEPENDENCY <n> · BLOCKED <n>
- **Reconciles:** <dispatched> dispatched = <terminal> in a terminal state ✓/✗

<!-- The tally MUST reconcile. If it does not, the run is corrupted — report that,
     do not smooth it over. See core/13-FLEET.md. -->

---

## SUB-001 — <name>
- **Fleet run:** FLEET-001  ·  **Wave:** 1  ·  **Packet:** W-0007
- **Parent:** <REQ-ID>
- **Agent / session:**
- **Scope:**
- **Allowed paths:**
- **Forbidden paths:**
- **Acceptance:**
- **State:** ASSIGNED
- **Checkpoint:** <last reported: files created, what works, exact next action>
- **Files changed:**
- **Parent verification:** <NOT YET — diff read? tests re-run? scope checked?>
- **Failure class:**
- **Attempt:** 1 of 2
- **Next strategy:**

<!-- State: ASSIGNED | RUNNING | CHECKPOINTED | RETURNED_UNVERIFIED | FAILED_RETRYING
            | VERIFIED_ACCEPTED | REJECTED | ABANDONED_BLOCKED

     VERIFIED_ACCEPTED requires all seven parent checks in core/06-DELEGATION.md.
     A subagent's own claim never sets it. -->
