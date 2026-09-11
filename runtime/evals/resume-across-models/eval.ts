/**
 * EVAL — resume-across-models: session A writes the ledger; session B (a
 * different model label) resumes from disk alone.
 *
 * Inputs:        an empty temporary project; a real Ledger.
 * Constraints:   simulated host = node; no chat history carries over — B sees
 *                exactly what A wrote to `<project>/.apex/`.
 * Assertions:    deterministic — the requirement, its status and the handoff
 *                survive verbatim; and the ledger records FACTS, not the
 *                writer's identity: no model-identity field exists for B to
 *                fill or B to trip over.
 * Model label:   none — deterministic engine simulation (54 §16).
 */

import assert from "node:assert/strict"
import fs from "node:fs"
import fsp from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { Ledger } from "../../src/engines/ledger.ts"

const project = await fsp.mkdtemp(path.join(os.tmpdir(), "apex-eval-resume-"))
try {
  // ── Session A (call it "model-a"): do work, write it down. ────────────────
  const a = new Ledger(project)
  await a.addRequirement({
    source: "user",
    text: "the exporter must fail loudly when the API key is missing",
    acceptance: "running the CLI with no API key exits non-zero and prints the reason",
    verifyBy: "node src/cli.js export --no-key",
  })
  const handoff = await a.generateHandoff({ architecture: "single-module CLI" })
  assert.match(handoff, /requirements verified/, "the handoff reports the state, not a summary")
  assert.match(handoff, /REQUIREMENTS\.md/, "and points at the durable table")

  // ── Session B ("model-b"): a fresh Ledger over the same project. ──────────
  const b = new Ledger(project)
  const status = await b.status()
  assert.equal(status.totalRequirements, 1, "session B sees exactly what A recorded")

  const reqs = await b.readRequirements()
  assert.equal(reqs.length, 1)
  assert.equal(reqs[0]!.id, "REQ-001", "B sees the same durable ID A recorded")
  assert.match(reqs[0]!.text, /fail loudly/, "the requirement text survives verbatim")
  assert.match(reqs[0]!.verifyBy, /export --no-key/, "the proof command survives verbatim")

  // The ledger stores facts, not the writer's identity: nothing in the durable
  // record names or depends on which model wrote it.
  const ledgerFiles: string[] = []
  const walk = (d: string): void => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) walk(p)
      else ledgerFiles.push(p)
    }
  }
  walk(path.join(project, ".apex"))
  const identityFields = ledgerFiles.filter((f) => {
    if (!f.endsWith(".json")) return false
    const doc = JSON.parse(fs.readFileSync(f, "utf8")) as Record<string, unknown>
    return Object.keys(doc).some((k) => /model|llm|provider/i.test(k))
  })
  assert.deepEqual(identityFields, [], "no model-identity field exists in the ledger — any model may resume")

  console.log("EVAL resume-across-models PASS — requirement, proof command and handoff survive; no identity to fill")
} finally {
  await fsp.rm(project, { recursive: true, force: true })
}
