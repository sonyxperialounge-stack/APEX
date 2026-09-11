# EVD-065b — WP-065b Child limits: depth, budget, stall, cleanup (54 §12; FLT-T07..T11)

Date: 2026-09-11 · Packet: WP-065b (Dep WP-065) · Branch: upgrade/army-v4

## Context

54 §12 hardens delegation: no child user channel, an explicit blocked list,
spawn depth + iteration budget + stall window (defaults 1 / 100 / 600s from
54 §20), and cleanup of child-owned resources. Done-when is FLT-T07..T11.

## What was built

- `~runtime/src/engines/warden.ts` (+limits, contracts untouched):
  `CHILD_ALWAYS_BLOCKED` (user.ask/clarify, global memory write,
  skill.promote, message/deploy/payment, schedule/cron),
  `DEFAULT_CHILD_LIMITS`, `isCapabilityBlockedForChild` (delegate nests
  only for ORCHESTRATOR below depth), `canDelegateFurther` (FLT-T08),
  `checkChildBudget` (FLT-T09: spent budget → BLOCKED naming partial
  results), `checkChildStall` (FLT-T10: window spent → interrupt + report +
  cleanup), `childCleanupChecklist` (FLT-T11: terminate processes, remove
  temp dirs, release handles; handed-to-parent items survive; the host
  performs it, the list audits it). Config surfacing stays in WP-074 (44);
  the engine takes limits as parameters with the 54 §20 defaults.
- `~runtime/test/engines/warden.test.ts` (+5): FLT-T07 blocked list +
  NEEDS_USER_DECISION reason, FLT-T08 depth gate, FLT-T09 BLOCKED-with-
  partials, FLT-T10 interrupt action, FLT-T11 checklist with handover
  exclusion.

## Verify

`npm run verify` → 1305 pass, 0 fail, 0 cancelled, exit 0 (~40s).
Was 1300 before (+5 new).

## Acceptance mapping

| Id | How |
|---|---|
| FLT-T07 | all nine blocked ids refused with the NEEDS_USER_DECISION reason; `fs.read` and unlisted ids pass |
| FLT-T08 | depth-1 ORCHESTRATOR refused, depth-0 ORCHESTRATOR allowed, non-ORCHESTRATOR refused at any depth |
| FLT-T09 | 100/100 → BLOCKED naming completed steps; 99/100 still RUNNING |
| FLT-T10 | 600s → stalled with interrupt+report+cleanup; 599s → supervise |
| FLT-T11 | checklist terminates the process, releases the handle, spares the handed-over dir |

## Surprises

- None. Limits ride as function parameters (deterministic tests); WP-074
  wires them to `44` config keys.

## Files

- `~runtime/src/engines/warden.ts`
- `~runtime/test/engines/warden.test.ts`
- `~.apex/upgrade/STATE.json` (WP-065b IN_PROGRESS → DONE)

## Next

WP-066 (council triggers, Dep WP-065).
