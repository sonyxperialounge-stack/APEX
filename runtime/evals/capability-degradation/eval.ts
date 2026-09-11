/**
 * EVAL — capability-degradation: a tool disappears mid-task; expect honest re-plan.
 *
 * Inputs:        a registry with one AVAILABLE capability from a live provider.
 * Constraints:   simulated host = node; the "failure" is injected through the real
 *                structural-failure path, not by mutating the descriptor by hand.
 * Assertions:    deterministic — after the failure the capability is DEGRADED and
 *                `select` refuses it (no pretend call); a provider disconnect
 *                invalidates stale AVAILABLE truth; only fresh discovery
 *                (re-registration) lifts it back; and the doctrine gives the model
 *                an honest re-plan script ("UNAVAILABLE, effect, fallback").
 * Model label:   none — deterministic engine simulation (54 §16).
 */

import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { CapabilityRegistry, type CapabilityDescriptor } from "../../src/engines/capability-registry.ts"

const RUNTIME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..")

const descriptor: CapabilityDescriptor = {
  id: "fs.read",
  title: "Read a file",
  description: "Reads a file from the workspace.",
  aliases: [],
  source: { kind: "host", providerId: "probe-host", toolName: "read_file" },
  availability: "AVAILABLE",
  effects: ["READ"],
  trust: "TRUSTED",
  lastCheckedAt: "2026-09-11T00:00:00.000Z",
}

const registry = new CapabilityRegistry({})
registry.register(descriptor)
assert.equal(registry.select("fs.read")?.id, "fs.read", "initially usable")

// ── Mid-task: the call fails structurally. ───────────────────────────────────
const marked = registry.markStructuralFailure("fs.read", "ENOENT: provider socket closed")
assert.equal(marked?.availability, "DEGRADED", "the failure is recorded on the descriptor")
assert.equal(registry.select("fs.read"), null, "select refuses — no pretend call is issued")
assert.equal(registry.isAvailable("fs.read"), false, "availability is honestly false")

// A vanished tool is never silently "fine": DEGRADED/UNAVAILABLE persists until
// discovery re-registers it. Pretend the provider reconnects WITHOUT discovery…
registry.register({ ...descriptor, id: "fs.read" })
assert.equal(registry.select("fs.read")?.id, "fs.read", "only a fresh re-registration lifts it")

// ── The honest re-plan script the model follows instead of faking a call. ───
const caps = fs.readFileSync(path.join(RUNTIME, "payload", "core", "16-CAPABILITIES.md"), "utf8")
assert.match(caps, /UNAVAILABLE, effect, fallback/, "the nobody-skips-it re-plan contract")
assert.match(caps, /Fallback: /, "a concrete fallback line is templated")

console.log("EVAL capability-degradation PASS — failure recorded, select refuses, re-plan script present")
