# Findings

## F-001 — The PLG-002 safety wrapper caught deliberate blocks as if they were failures, so tool.execute.before computed the correct refusal, logged it, and the protected write happened anyway. The entire L2 enforcement layer was inert.
**Where:** src/plugin/index.ts safe()
**What:** The PLG-002 safety wrapper caught deliberate blocks as if they were failures, so tool.execute.before computed the correct refusal, logged it, and the protected write happened anyway. The entire L2 enforcement layer was inert.
**Why not fixed now:** FIXED — blocks now throw BlockedError and safe() re-throws them. Found only by a live run against real OpenCode 1.18.18 with a real model; every mock test had passed.
**Recommend:** Keep the END-TO-END tests that call the WRAPPED hook. Testing an unwrapped hook cannot catch this class.

## F-002 — OpenCode passes worktree:'/' before a project is resolved. The plugin trusted it and wrote a full ledger to C:.apex on the drive root.
**Where:** src/plugin/index.ts ApexPlugin()
**What:** OpenCode passes worktree:'/' before a project is resolved. The plugin trusted it and wrote a full ledger to C:.apex on the drive root.
**Why not fixed now:** FIXED — safeProjectRoot() rejects filesystem roots, Ledger.init() refuses them as defence in depth, and the stray C:.apex was removed.
**Recommend:** Never trust a host-supplied path without validating it.

## F-003 — All four live checks passed: protected-path hard block, in-turn auto-verification with literal output injected, MCP tools called by a real model, and subagent recovery that resumed without redoing completed work.
**Where:** live verification — OpenCode 1.18.18 + opencode-zen/deepseek-v4-flash-free
**What:** All four live checks passed: protected-path hard block, in-turn auto-verification with literal output injected, MCP tools called by a real model, and subagent recovery that resumed without redoing completed work.
**Why not fixed now:** Not a defect — recorded as the evidence that closes the live checklist in build/TESTING.md.
**Recommend:** Re-run after any change to safe(), the plugin hooks, or the host client.

## F-004 — Four MCP-004 tools, MCP-010 async polling and PLG-014 native tools were silently dropped, and the test REQUIRED list had been rewritten to match the code instead of the spec — so nothing failed.
**Where:** external scan of build/REQUIREMENTS.md vs src/
**What:** Four MCP-004 tools, MCP-010 async polling and PLG-014 native tools were silently dropped, and the test REQUIRED list had been rewritten to match the code instead of the spec — so nothing failed.
**Why not fixed now:** FIXED — all implemented, the test now asserts the spec verbatim, and REQ-005/REQ-008 were reopened before any of it was claimed.
**Recommend:** Assert specs verbatim in tests. A list derived from the implementation can never catch an omission.

## F-005 — A claim that payload dead links were fixed was HALF TRUE: only START-HERE.md and README.md were corrected. Five adapter files still pointed at install/ATTACH.md, which does not ship. Caught by a second external scan.
**Where:** runtime/payload/adapters/*.md (5 files)
**What:** A claim that payload dead links were fixed was HALF TRUE: only START-HERE.md and README.md were corrected. Five adapter files still pointed at install/ATTACH.md, which does not ship. Caught by a second external scan.
**Why not fixed now:** FIXED at the source, not the copy — plus scripts/sync-payload.mjs now rewrites repo-only links when building the payload, and test/cli/payload.test.ts fails on any unshipped reference, broken relative link, source drift or machine-specific path.
**Recommend:** A fix claim needs a check covering the WHOLE surface. Grep the whole tree, do not fix the files that happen to be open.

## F-006 — attach wrote into EVERY detected host directory. On this machine that put files and config entries into Claude Code, Cursor and Gemini CLI as well as OpenCode. Three were never asked for and had to be cleaned up by hand. Two of them I did not notice until a third scan prompted a full sweep.
**Where:** src/cli/attach.ts — attach with no --host
**What:** attach wrote into EVERY detected host directory. On this machine that put files and config entries into Claude Code, Cursor and Gemini CLI as well as OpenCode. Three were never asked for and had to be cleaned up by hand. Two of them I did not notice until a third scan prompted a full sweep.
**Why not fixed now:** FIXED — attach now installs into ONE host (the deepest available) and reports the rest as untouched. --all-hosts opts back in. Four tests assert the other host directories stay empty.
**Recommend:** Touching a config the user did not name is a surprise they have to clean up, not a convenience. Default to the narrowest action.

## F-007 — The ledger stopped at V-012 (640 tests) while the code had moved on to 650. Verification was run and not recorded — by this project's own doctrine, unrecorded verification is indistinguishable from none, and the gate was passing on evidence for code that no longer existed.
**Where:** runtime/.apex/VERIFICATION.md
**What:** The ledger stopped at V-012 (640 tests) while the code had moved on to 650. Verification was run and not recorded — by this project's own doctrine, unrecorded verification is indistinguishable from none, and the gate was passing on evidence for code that no longer existed.
**Why not fixed now:** FIXED — this session recorded V-013..V-023 through apex_verify itself, including an async task poll, so the evidence describes the current tree.
**Recommend:** Record evidence through the tools, in the same action that produces it. Running a check and writing it down later is two chances to skip the second half.
