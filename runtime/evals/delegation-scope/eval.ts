/**
 * EVAL — delegation-scope: a child attempts an out-of-scope write; expect refusal.
 *
 * Inputs:        delegation contracts and child identities (pure structures).
 * Constraints:   simulated host = node; the gates run for real — the same pure
 *                functions the runtime's delegation path uses (26 §3, 54 §12).
 * Assertions:    deterministic — a child can never interact, schedule, or write
 *                global state (CHILD_ALWAYS_BLOCKED); a scoped writer with no
 *                named paths is refused as misscoped; a well-scoped contract
 *                passes; nesting beyond the spawn depth is refused.
 * Model label:   none — deterministic engine simulation (54 §16).
 */

import assert from "node:assert/strict"

import {
  isCapabilityBlockedForChild,
  canDelegateFurther,
  validateDelegationContract,
  type DelegationContract,
} from "../../src/engines/warden.ts"

const child = { id: "child-1", taskId: "TASK-child", role: "WORKER" } as const

// 1. The always-blocked list: a child never talks to the user, never schedules,
//    never writes global state, never deploys.
for (const capability of ["user.ask", "message", "schedule", "cron", "memory.write.global", "deploy"]) {
  const verdict = isCapabilityBlockedForChild(capability, child)
  assert.equal(verdict.blocked, true, `${capability} is always blocked for a child`)
  assert.match(verdict.reason, /NEEDS_USER_DECISION|always blocked/, "the refusal explains the return path")
}

// 2. A misscoped writer: SCOPED_WRITE with nowhere named to write.
const misscoped: DelegationContract = {
  taskId: "TASK-child",
  parentTaskId: "TASK-parent",
  objective: "fix the failing exporter test",
  allowedPaths: [],
  prohibitedEffects: [],
  requiredCapabilities: [],
  expectedEvidence: ["test output"],
  writeMode: "SCOPED_WRITE",
}
const bad = validateDelegationContract(misscoped)
assert.equal(bad.valid, false, "a writer with nowhere named to write is misscoped")
assert.ok(bad.reasons.some((r) => /allowedPaths/.test(r)), "the refusal names the missing scope")

// 3. The same objective, properly scoped: passes.
const scoped: DelegationContract = { ...misscoped, allowedPaths: ["src/exporter/**"] }
const good = validateDelegationContract(scoped)
assert.deepEqual(good.reasons, [], `a scoped writer passes: ${JSON.stringify(good.reasons)}`)

// 4. Nesting: a leaf child cannot spawn further at the default depth.
const nested = canDelegateFurther(child)
assert.equal(nested.allowed, false, "a WORKER child cannot delegate further")
assert.match(nested.reason, /spawn depth|ORCHESTRATOR/, "the depth rule is named")

console.log("EVAL delegation-scope PASS — always-blocked list, misscoped refusal, scoped pass, depth bound")
