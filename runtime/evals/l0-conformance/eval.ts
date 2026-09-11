/**
 * EVAL — l0-conformance: a fresh model receives ONLY payload/START-HERE.md.
 *
 * Inputs:        the shipped payload (payload/START-HERE.md and the files it names).
 * Constraints:   simulated host = none (L0, plain files); no tools, no runtime.
 * Assertions:    deterministic — the boot sequence is ordered and complete, every
 *                repository file START-HERE names actually ships, the degraded-mode
 *                escape hatch and the readiness contract exist, and there is no
 *                setup wizard to get stuck in.
 * Model label:   none — deterministic engine/text simulation (54 §16). No live-model
 *                claim is made; see test/fixtures/l0/MANUAL-RECORDS.md.
 */

import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const PAYLOAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "payload")
const start = fs.readFileSync(path.join(PAYLOAD, "START-HERE.md"), "utf8")

// 1. The boot sequence is ordered and complete.
const steps = [...start.matchAll(/^### Step (\d) — (.+)$/gm)].map((m) => Number(m[1]))
assert.deepEqual(steps, [1, 2, 3, 4, 5, 6, 7], "the boot sequence runs 1..7 in order")
assert.match(start, /Do not skip steps/, "the sequence is mandatory")

// 2. Every repository file the model is told to read actually ships.
const refs = [...new Set([...start.matchAll(/`([A-Za-z0-9][A-Za-z0-9_./-]*\.md)`/g)].map((m) => m[1]!))]
  .filter((ref) => !ref.startsWith(".apex/"))
const missing = refs.filter((ref) => !fs.existsSync(path.join(PAYLOAD, ref)))
assert.deepEqual(missing, [], `START-HERE names files that do not ship: ${missing.join(", ")}`)
assert.ok(refs.length >= 15, `the doctrine tree is referenced, not just one file (${refs.length} refs)`)

// 3. Degraded mode is an escape hatch, not a failure.
assert.match(start, /DEGRADED MODE/, "degraded mode is named")
assert.match(start, /If you can only read this one file/i, "the one-file escape hatch exists")

// 4. The readiness contract exists, is bounded, and is honest about limits.
assert.match(start, /at most five lines/, "the readiness contract is bounded")
assert.match(start, /never omit the\s+limitation/, "limits are never omitted from the contract")

// 5. No wizard: nothing in the bootstrap waits for an interactive setup.
assert.doesNotMatch(start, /wizard/i, "no setup wizard exists")

console.log("EVAL l0-conformance PASS — bootstrap ordered, %d referenced files all ship, no wizard", refs.length)
