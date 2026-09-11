/**
 * EVAL — memory-lifecycle: learn → correct → retrieve, across simulated sessions.
 *
 * Inputs:        an empty temporary global memory store; two simulated sessions.
 * Constraints:   simulated host = node; store = the real MemoryStore with real
 *                atomic commits; no global home is touched (tmpdir only).
 * Assertions:    deterministic — session A's fact is invisible-or-fresh to session B
 *                only through a real store read; an explicit correction supersedes
 *                transactionally (11 §7); retrieval returns the CORRECTED text and
 *                never the stale one; the superseded original is retained, not deleted.
 * Model label:   none — deterministic engine simulation (54 §16).
 */

import assert from "node:assert/strict"
import fsp from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { openMemoryStore } from "../../src/stores/memory-store.ts"
import { resolveCandidate, selectMemory } from "../../src/engines/memory-librarian.ts"
import { toIsoString } from "../../src/core/ids.ts"

const home = await fsp.mkdtemp(path.join(os.tmpdir(), "apex-eval-mem-"))
try {
  const store = openMemoryStore(path.join(home, "memory"))
  const provenance = { sourceType: "explicit_user" as const, observedAt: toIsoString(Date.now()) }

  // ── Session A: learn. ──────────────────────────────────────────────────────
  const a = await store.read()
  const learned = await resolveCandidate(a.records, {
    text: "the test command is npm test",
    semanticKey: "fact.test.command",
    scope: { kind: "global" },
    kind: "fact",
    relation: "new",
    provenance,
  })
  await store.commit(a.revision, learned.records)

  // ── Session B: a fresh read (memory frozen per session; B starts new). ────
  const b = await store.read()
  const original = b.records.find((r) => r.semanticKey === "fact.test.command" && r.status === "active")
  assert.ok(original, "session B sees session A's fact through the store, not through chat")

  // Session B corrects it — same subject, explicit target.
  const corrected = await resolveCandidate(b.records, {
    text: "the test command is nox",
    semanticKey: "fact.test.command",
    scope: { kind: "global" },
    kind: "fact",
    relation: "correct",
    targetIds: [original!.id],
    provenance,
  })
  assert.ok(
    corrected.actions.some((x) => x.action === "supersede"),
    `the correction supersedes: ${JSON.stringify(corrected.actions)}`,
  )
  await store.commit(b.revision, corrected.records)

  // ── Session C: retrieval returns the corrected fact only. ─────────────────
  const c = await store.read()
  const stale = c.records.find((r) => r.id === original!.id)
  assert.equal(stale!.status, "superseded", "the stale original is retained but marked superseded")
  assert.deepEqual(stale!.supersededBy, corrected.records.at(-1)!.id, "the 11 §7 chain points forward")

  const selection = selectMemory(
    c.records,
    { projectKey: "eval", maxTokens: 2000, useGlobal: true },
    "what is the test command?",
    toIsoString(Date.now()),
  )
  const texts = selection.records.map((r) => r.text)
  assert.ok(texts.some((t) => t.includes("nox")), `the corrected text is retrieved: ${JSON.stringify(texts)}`)
  assert.ok(!texts.some((t) => t.includes("npm test")), "the stale text is never retrieved")

  console.log("EVAL memory-lifecycle PASS — learn → correct → supersede chain → corrected retrieval")
} finally {
  await fsp.rm(home, { recursive: true, force: true })
}
