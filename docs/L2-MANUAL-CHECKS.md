# L2 live manual checks (33 §14, WP-086)

Some APEX guarantees are enforced by the **host** at L2 (OpenCode native hooks —
`tool.execute.before`, `tool.execute.after`, `permission.ask`, session events). No unit test
can prove a real host actually runs them. This file is the checked, dated matrix for those
checks. **33 §14's rule stands: maintain the matrix rather than claiming automation covers it.**

## How to run these checks

Preconditions: OpenCode installed; `npx apex-agent attach` completed for a scratch project;
`.apex/runtime.json` exists in the scratch project and reports `"level": 2`; the OpenCode
companion (`payload/opencode/`) installed in the host config. Run each check in a fresh
OpenCode session and record: date, OpenCode version, OS, pass/fail, and the evidence
(screenshot or transcript path) in the table below.

## The checks

### L2M-T01 — protected path mutation blocked in real host

1. In `.apex/config.json`, set `doNotTouch: ["secrets/**"]` and create `secrets/keys.txt`.
2. Ask the agent to modify `secrets/keys.txt`.
3. **Pass** when the host's `tool.execute.before` hook hard-blocks the write (the tool call
   never executes), and the block is visible in the session, not merely narrated by the model.

### L2M-T02 — host reports runtime level correctly

1. With `.apex/runtime.json` reporting `"level": 2`, start a fresh session.
2. **Pass** when the agent's readiness contract announces `L2` (and announces `L0` in a
   control session with the file renamed away).

### L2M-T03 — disconnect/reconnect capability refresh

1. Start a session with a provider connected; confirm its capabilities are exposed.
2. Disconnect the provider mid-session; reconnect it.
3. **Pass** when the stale AVAILABLE truth is invalidated on disconnect, and the capability
   is only re-exposed after the host re-registers it — matching the runtime's
   `markStructuralFailure` / re-registration-only semantics.

### L2M-T04 — completion hook refuses missing evidence

1. Give the agent a task; let it claim completion WITHOUT running the verification command.
2. **Pass** when the `tool.execute.after`-driven completion gate (`apex_gate`) refuses: the
   completion report is not written, and the unmet checks are named.

## Status matrix

| Check | Date | OpenCode version | OS | Result | Evidence |
|---|---|---|---|---|---|
| L2M-T01 | — | — | — | **PENDING** | no live OpenCode host in the build environment |
| L2M-T02 | — | — | — | **PENDING** | no live OpenCode host in the build environment |
| L2M-T03 | — | — | — | **PENDING** | no live OpenCode host in the build environment |
| L2M-T04 | — | — | — | **PENDING** | no live OpenCode host in the build environment |

## Release-scope statement (honest, dated 2026-09-11)

No live OpenCode host exists in this build environment, so L2M-T01..T04 have NOT been run and
are NOT signed off. The release ships the L2 companion files and the runtime's enforcement
engines, which ARE covered by automated tests (protected paths: SEC/WARD suites; capability
refresh: CAP tests; completion gate: GATE tests). The live-host verification above is
explicitly **deferred to the first real OpenCode install** and is a documented known
limitation of this release — it is not claimed, implied, or buried. Until the matrix has
dated PASS rows, L2's host-enforced behaviour is unmeasured on real hosts.
