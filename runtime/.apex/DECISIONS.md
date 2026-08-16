# Decision Log

## DEC-001 — 2026-08-16T02:21:36.055Z
- **Context:** PLG-016 — verify hook signatures against the installed @opencode-ai/plugin types
- **Problem:** The implementation returned values from hooks; the real contract is Promise<void> with output-object mutation. Returning would have been a silent no-op.
- **Options:** trust the published docs · read the installed .d.ts and match it exactly
- **Chose:** read the installed types and rewrite every hook to mutate its output object
- **Why this does not violate the plan:** build/BUILD-MASTER-PROMPT.md rule 5 states the installed types outrank the plan.
- **Affects:** src/plugin/index.ts
- **Reversible:** yes

## DEC-002 — 2026-08-16T02:34:46.316Z
- **Context:** External scan of the MCP tool surface against build/REQUIREMENTS.md MCP-004
- **Problem:** Four tools the spec names — apex_delegate, apex_subagent_status, apex_council, apex_findings — were never implemented. Worse, the test REQUIRED list was written from the implementation instead of the spec, so the omission could not fail a test.
- **Options:** leave it and update the spec · implement the missing tools and fix the test to assert the SPEC
- **Chose:** implement the missing tools; the test asserts the spec, not the code
- **Why this does not violate the plan:** It WAS a violation — of Law 3 and Law 11. Recording it and reopening the requirement is the correction.
- **Affects:** src/mcp/tools.ts, test/mcp/server.test.ts
- **Reversible:** n/a

## DEC-003 — 2026-08-16T02:34:46.322Z
- **Context:** MCP-010 and PLG-014
- **Problem:** Long operations blocked the protocol loop (no task id, no polling), and the L2 plugin never registered apex_* natively via the tool hook.
- **Options:** drop both from the spec · implement both
- **Chose:** implement both
- **Why this does not violate the plan:** Both were silently dropped. Reopening Phase 4 and Phase 7 restores the truth.
- **Affects:** src/mcp/server.ts, src/mcp/tools.ts, src/plugin/index.ts
- **Reversible:** n/a
