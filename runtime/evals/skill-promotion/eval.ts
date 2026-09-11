/**
 * EVAL — skill-promotion: failed work must not produce an active skill.
 *
 * Inputs:        three staged candidates in a temporary global home: one with no
 *                evidence, one that fails lint, one verified with evidence.
 * Constraints:   simulated host = node; the real forge — quarantine, the three
 *                gates in order (security → lint → evidence), promotion sidecar.
 * Assertions:    deterministic — the unevidenced candidate is refused
 *                (insufficient-evidence) and ships NOTHING; the lint-failing
 *                candidate is refused before the evidence gate is even reached;
 *                only the verified candidate becomes ACTIVE, and its promotion
 *                record says verified:true.
 * Model label:   none — deterministic engine simulation (54 §16).
 */

import assert from "node:assert/strict"
import fsp from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { openSkillForge } from "../../src/engines/skill-forge.ts"

const SECTIONS = [
  "Goal", "Use when", "Do not use when", "Preconditions", "Required capabilities",
  "Procedure", "Verification", "Failure branches", "Rollback", "Known limits", "References",
]

function skillBody(title: string, procedure: string): string {
  const fill = (heading: string, text: string): string => `# ${heading}\n${text}\n`
  return [
    `---\nname: ${title}\ndescription: eval fixture for the promotion gates.\nversion: 1.0.0\n---\n`,
    fill("Goal", procedure),
    fill("Use when", "the eval runs."),
    fill("Do not use when", "never."),
    fill("Preconditions", "none."),
    fill("Required capabilities", "fs.read."),
    fill("Procedure", "1. run the command.\n2. read the output."),
    fill("Verification", "the command exits zero."),
    fill("Failure branches", "on failure, stop and report."),
    fill("Rollback", "delete the file."),
    fill("Known limits", "eval fixture only."),
    fill("References", "none."),
  ].join("\n")
}

const home = await fsp.mkdtemp(path.join(os.tmpdir(), "apex-eval-forge-"))
try {
  const forge = openSkillForge(home)

  // ── Candidate 1: drafted from FAILED work, no evidence. ────────────────────
  const unevidenced = `eval-unevidenced-${Date.now()}`
  await forge.stage({
    id: unevidenced,
    title: unevidenced,
    content: skillBody(unevidenced, "Ship the fix even though the test failed twice."),
    evidenceIds: [],
    verifiedUse: false,
    proposer: "subagent",
  })
  const refused = await forge.promote(unevidenced, { userOverride: false })
  assert.equal(refused.ok, false, "failed work does not promote")
  assert.equal(refused.reason, "insufficient-evidence", `the evidence gate refuses: ${refused.reason}`)
  const notShipped = path.join(home, "skills", "engineering", unevidenced, "SKILL.md")
  await assert.rejects(() => fsp.access(notShipped), "the unevidenced skill ships NOTHING")

  // ── Candidate 2: lint-failing content. ─────────────────────────────────────
  const lintfail = `eval-lintfail-${Date.now()}`
  await forge.stage({
    id: lintfail,
    title: lintfail,
    content: "---\nname: lintfail\ndescription: missing required sections.\nversion: 1.0.0\n---\nno body sections here\n",
    evidenceIds: ["EVD-999"],
    verifiedUse: true,
    proposer: "parent",
  })
  const lintRefused = await forge.promote(lintfail, { userOverride: false })
  assert.equal(lintRefused.ok, false, "lint errors block in every mode")
  assert.equal(lintRefused.reason, "lint", `lint refuses before evidence matters: ${lintRefused.reason}`)

  // ── Candidate 3: verified work with real evidence. ─────────────────────────
  const verified = `eval-verified-${Date.now()}`
  await forge.stage({
    id: verified,
    title: verified,
    content: skillBody(verified, "Reproduce the bug, fix it once, prove it with the failing test."),
    evidenceIds: ["EVD-001", "EVD-002"],
    verifiedUse: true,
    proposer: "parent",
  })
  const promoted = await forge.promote(verified, { userOverride: false })
  assert.equal(promoted.ok, true, `verified work promotes: ${JSON.stringify(promoted)}`)
  assert.equal(promoted.verified, true, "and the promotion is a VERIFIED one")
  const inspection = await forge.inspect(verified)
  assert.equal(inspection.lifecycle, "ACTIVE")
  assert.equal(inspection.unverifiedPromotion, false, "the sidecar records an honest verified promotion")

  console.log("EVAL skill-promotion PASS — unevidenced refused, lint refused, verified promoted ACTIVE")
} finally {
  await fsp.rm(home, { recursive: true, force: true })
}
