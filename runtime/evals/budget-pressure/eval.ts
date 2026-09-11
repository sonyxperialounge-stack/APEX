/**
 * EVAL — budget-pressure: under a tight token budget, requirements survive;
 * memory and skills are evicted first.
 *
 * Inputs:        a real Ledger plus global memory and skills sections, assembled
 *                by the real Cortex at two budgets.
 * Constraints:   simulated host = node; no model call — the assertion is on the
 *                assembly itself (what WOULD be sent).
 * Assertions:    deterministic — with room, everything fits; under pressure the
 *                eviction degrades from the BOTTOM of the priority list: skills
 *                and globalMemory are dropped, while protected, autonomy and the
 *                active requirement survive; the assembly never exceeds the
 *                budget and names what it dropped.
 * Model label:   none — deterministic engine simulation (54 §16).
 */

import assert from "node:assert/strict"
import fsp from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { Cortex, SECTION_ORDER } from "../../src/engines/cortex.ts"
import { Ledger } from "../../src/engines/ledger.ts"
import { estimateTokens } from "../../src/engines/cortex.ts"

const project = await fsp.mkdtemp(path.join(os.tmpdir(), "apex-eval-budget-"))
try {
  const ledger = new Ledger(project)
  await ledger.addRequirement({
    source: "user",
    text: "the exporter must fail loudly when the API key is missing",
    acceptance: "no key → non-zero exit + reason printed",
    verifyBy: "node src/cli.js export --no-key",
  })
  // Give the protected section real content, as a real project would, and put
  // the requirement IN PROGRESS so it renders as the active one.
  const cfg = await ledger.loadConfig()
  await ledger.saveConfig({ ...cfg, doNotTouch: ["secrets/**", ".apex/**"] })
  await ledger.setStatus("REQ-001", "IN_PROGRESS")

  const globalMemory = Array.from({ length: 40 }, (_, i) => ({
    text: `remembered fact ${i}: the deploy script lives in scripts/deploy and needs the staging key`,
    kind: "fact",
  }))
  const skillIndex = [{ name: "reproduce-then-fix", description: "reproduce, fix once, re-run the test.", status: "active" }]

  // ── With room: everything fits, including the tail. ────────────────────────
  const roomy = await new Cortex(ledger, null).assemble({ budget: 9000, globalMemory, skillIndex })
  assert.ok(roomy.estimatedTokens <= 9000, "within budget")
  assert.ok(roomy.dropped.length === 0, `nothing dropped when there is room: ${roomy.dropped.join(",")}`)
  assert.match(roomy.text, /remembered fact/, "memory is present when it fits")
  assert.match(roomy.text, /reproduce/, "the skill index is present when it fits")

  // ── Under pressure: the tail is evicted, the head survives. ───────────────
  const tight = await new Cortex(ledger, null).assemble({ budget: 600, globalMemory, skillIndex })
  assert.ok(tight.estimatedTokens <= 600, `the budget is hard: ${tight.estimatedTokens} > 600`)
  assert.ok(tight.dropped.length > 0, "eviction is named, never silent")
  assert.ok(
    tight.dropped.includes("globalMemory") || tight.dropped.includes("skills"),
    `memory/skills are evicted first: ${tight.dropped.join(",")}`,
  )
  for (const head of ["protected", "autonomy", "active", "state"]) {
    assert.ok(
      tight.sections.includes(head),
      `"${head}" survives pressure (priority ${SECTION_ORDER.indexOf(head)})`,
    )
  }
  assert.match(tight.text, /fail loudly/, "the active requirement's text survives even when the tail does not")
  const evictedPriority = Math.min(...tight.dropped.map((s) => SECTION_ORDER.indexOf(s)))
  const keptPriority = Math.max(...tight.sections.map((s) => SECTION_ORDER.indexOf(s)))
  assert.ok(evictedPriority > keptPriority, "eviction degrades strictly from the bottom of the priority list")

  console.log(
    "EVAL budget-pressure PASS — roomy %d tokens all in; tight %d of 600, dropped [%s]; head intact",
    roomy.estimatedTokens, tight.estimatedTokens, tight.dropped.join(","),
  )
} finally {
  await fsp.rm(project, { recursive: true, force: true })
}

// estimateTokens is asserted to be the ⌈chars/4⌉ rule the START-HERE ceiling uses.
assert.equal(estimateTokens("abcd".repeat(100)), 100, "the token rule is the documented one")
