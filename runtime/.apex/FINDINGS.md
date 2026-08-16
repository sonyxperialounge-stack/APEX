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
