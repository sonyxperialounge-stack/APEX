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
