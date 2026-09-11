/*


/** WP-053 — capability search and the compact index (22 §2–§4; TLS-T01, TLS-T07). */

import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { CapabilityRegistry, type CapabilityDescriptor } from "../../src/engines/capability-registry.ts"
import {
  CapabilitySearch,
  type CapabilityHit,
  type SearchOptions,
} from "../../src/engines/capability-search.ts"

// ── helpers ─────────────────────────────────────────────────────────────────

let seq = 0
/** A synthetic descriptor with a deterministic, memorable shape. */
function desc(overrides: Partial<CapabilityDescriptor> = {}): CapabilityDescriptor {
  seq += 1
  return {
    id: overrides.id ?? `tool.${seq.toString().padStart(4, "0")}`,
    title: overrides.title ?? `Synthetic capability ${seq}`,
    description: overrides.description ?? "A synthetic capability used by the WP-053 tests.",
    aliases: overrides.aliases ?? [],
    source: overrides.source ?? { kind: "host", providerId: "host" },
    availability: overrides.availability ?? "AVAILABLE",
    effects: overrides.effects ?? ["READ"],
    trust: overrides.trust ?? "TRUSTED",
    lastCheckedAt: overrides.lastCheckedAt ?? "2026-09-11T00:00:00.000Z",
    ...(overrides.schemaLocator !== undefined ? { schemaLocator: overrides.schemaLocator } : {}),
    ...(overrides.platforms !== undefined ? { platforms: overrides.platforms } : {}),
    ...(overrides.requiredPermissions !== undefined ? { requiredPermissions: overrides.requiredPermissions } : {}),
    ...(overrides.reason !== undefined ? { reason: overrides.reason } : {}),
  }
}

function makeRegistry(descriptors: CapabilityDescriptor[]): CapabilityRegistry {
  const registry = new CapabilityRegistry({})
  for (const d of descriptors) registry.register(d)
  return registry
}

function makeSearch(descriptors: CapabilityDescriptor[]): CapabilitySearch {
  return new CapabilitySearch(makeRegistry(descriptors), { now: () => 1_765_000_000_000 })
}

function ids(hits: CapabilityHit[]): string[] {
  return hits.map((h) => h.id)
}

// ── WP-053 — the search engine (22 §2–§3) ──────────────────────────────────

describe("WP-053 — tokenized lexical search", () => {
  test("exact id outranks everything else", () => {
    const s = makeSearch([
      desc({ id: "host.write_file", title: "Write a file", description: "write file contents to disk" }),
      desc({ id: "host.write", title: "Generic write", description: "write anything" }),
      desc({ id: "file.write", title: "File writer", description: "write file" }),
    ])
    const hits = s.search("host.write_file")
    assert.equal(hits[0]!.id, "host.write_file")
    assert.equal(hits[0]!.score, 1_000_000)
    assert.ok(ids(hits).includes("file.write"), "other token-matched tools still surface")
  })

  test("exact alias outranks token matches", () => {
    const s = makeSearch([
      desc({ id: "host.publish_diagnostics", aliases: ["publishDiagnostics"], description: "publish diagnostics" }),
      desc({ id: "host.publish", description: "publish diagnostics to the channel" }),
    ])
    const hits = s.search("publishDiagnostics")
    assert.equal(hits[0]!.id, "host.publish_diagnostics")
    assert.equal(hits[0]!.score, 500_000)
  })

  test("an id token outranks a description-only token", () => {
    const s = makeSearch([
      desc({ id: "host.search_symbols", description: "search symbols in the project" }),
      desc({ id: "host.read", description: "search the codebase with grep" }),
    ])
    const hits = s.search("search")
    assert.equal(hits[0]!.id, "host.search_symbols")
    assert.ok(hits[0]!.score > hits[1]!.score && hits[1]!.score > 0, "both tools scored, id ranked first")
  })

  test("weighted fields: id tokens beat title-only tokens", () => {
    const s = makeSearch([
      desc({ id: "host.fmt", title: "Format source", description: "run the formatter", effects: ["WRITE"] }),
      desc({ id: "host.format_file", title: "Format file", description: "format code", effects: ["WRITE"] }),
    ])
    const hits = s.search("format")
    assert.equal(hits[0]!.id, "host.format_file", "an id token (weight 10) beats a title-only token (weight 5)")
    assert.deepEqual(ids(s.search("FORMAT")), ids(hits), "query case must not change ranking")
  })

  test("effects and platforms tokens contribute", () => {
    const s = makeSearch([
      desc({ id: "host.run_code", effects: ["EXECUTE"], description: "run a snippet" }),
      desc({ id: "host.copy_file", effects: ["WRITE", "READ"], description: "copy a file", platforms: ["win32"] }),
    ])
    assert.equal(s.search("execute")[0]!.id, "host.run_code")
    assert.equal(s.search("win32")[0]!.id, "host.copy_file")
  })

  test("deterministic tie-break: equal scores sort by id ascending", () => {
    const s = makeSearch([
      desc({ id: "host.zzz", description: "uniquely worded loud description" }),
      desc({ id: "host.aaa", description: "uniquely worded loud description" }),
    ])
    const hits = s.search("uniquely worded loud description")
    assert.deepEqual(ids(hits), ["host.aaa", "host.zzz"])
    assert.equal(hits[0]!.score, hits[1]!.score, "the tie was real")
  })

  test("multi-token queries rank documents matching more tokens first", () => {
    const s = makeSearch([
      desc({ id: "host.delete_all", description: "delete every matching file" }),
      desc({ id: "host.delete_file", description: "delete one file by name" }),
      desc({ id: "host.list_files", description: "list files" }),
    ])
    const hits = s.search("delete file")
    assert.equal(hits[0]!.id, "host.delete_file", "matches both tokens before one")
    assert.ok(ids(hits).includes("host.delete_all"))
  })

  test("onlyAvailable defaults to true and skips unavailable", () => {
    const registry = makeRegistry([
      desc({ id: "host.gone", description: "no longer installed" }),
      desc({ id: "host.here", description: "installed today" }),
    ])
    // availability changes arrive as a re-registration, not a mutation
    registry.register(desc({ id: "host.gone", description: "no longer installed", availability: "UNAVAILABLE" }))
    const s = new CapabilitySearch(registry, { now: () => 1_765_000_000_000 })
    assert.deepEqual(ids(s.search("installed")), ["host.here"])
    assert.deepEqual(ids(s.search("installed", { onlyAvailable: false })), ["host.gone", "host.here"])
  })

  test("empty or blank queries return no hits", () => {
    const s = makeSearch([desc({ id: "host.anything", description: "anything" })])
    assert.deepEqual(s.search(""), [])
    assert.deepEqual(s.search("   "), [])
  })

  test("no matches returns an empty list", () => {
    const s = makeSearch([desc({ id: "host.thing", description: "a thing" })])
    assert.deepEqual(s.search("zzzznope"), [])
  })

  test("limit caps results deterministically", () => {
    const s = makeSearch([
      desc({ id: "tool.0001", description: "first synthetic tool" }),
      desc({ id: "tool.0002", description: "second synthetic tool" }),
      desc({ id: "tool.0003", description: "third synthetic tool" }),
      desc({ id: "tool.0004", description: "fourth synthetic tool" }),
    ])
    assert.equal(s.search("synthetic tool", { limit: 2 } satisfies SearchOptions).length, 2)
  })
})

// ── WP-053 — compact index (22 §2, 54 §4) ──────────────────────────────────

describe("WP-053 — compact index bounded by schemaBudgetTokens", () => {
  test("budget 0 defers everything honestly", () => {
    const s = makeSearch([desc({ id: "host.a", effects: ["READ"] }), desc({ id: "host.b", effects: ["WRITE"] })])
    const index = s.compactIndex(0)
    assert.deepEqual(index.capabilities, [])
    assert.equal(index.deferred, 2)
    assert.equal(index.usedTokens, 0)
    assert.equal(index.budgetTokens, 0)
  })

  test("index is sorted by id and bounded to the token budget", () => {
    const s = makeSearch([
      desc({ id: "host.zzz", effects: ["READ"] }),
      desc({ id: "host.aaa", effects: ["READ"] }),
      desc({ id: "host.mmm", effects: ["WRITE"] }),
    ])
    const index = s.compactIndex(2000)
    assert.deepEqual(
      index.capabilities.map((c) => c.id),
      ["host.aaa", "host.mmm", "host.zzz"],
    )
    assert.equal(index.deferred, 0)
    assert.ok(index.usedTokens <= index.budgetTokens)
  })

  test("TLS-T01 — 1,000 synthetic tools stay prompt-efficient", () => {
    const descriptors: CapabilityDescriptor[] = []
    const effects = ["READ", "WRITE", "EXECUTE", "NETWORK", "INSTALL"] as const
    for (let i = 0; i < 1_000; i += 1) {
      descriptors.push(
        desc({
          id: `tool.${i.toString().padStart(4, "0")}`,
          title: `Synthetic tool ${i}`,
          description: `A synthetic capability for exercising the search and compact index at scale, number ${i}.`,
          effects: [effects[i % effects.length]!],
          aliases: i % 7 === 0 ? [`t${i}`, `tool-${i}`] : [],
        }),
      )
    }
    const s = makeSearch(descriptors)

    // search stays relevant at scale
    const hits = s.search("synthetic tool")
    assert.ok(hits.length > 0 && hits.length <= 10)
    assert.ok(hits.every((h) => h.score > 0))
    assert.ok(hits.every((h) => h.effects.length === 1), "hits carry their effects")

    // the compact index obeys the budget and reports the honest remainder
    const index = s.compactIndex(1000)
    assert.ok(index.capabilities.length > 0, "at least the first entries fit")
    assert.ok(index.capabilities.length < 1_000, "the budget must defer most of the catalogue")
    assert.equal(index.capabilities.length + index.deferred, 1_000, "every tool is either served or deferred")
    assert.ok(index.usedTokens <= index.budgetTokens)

    // the serialized Level-A index is small enough to be prompt-efficient
    const json = JSON.stringify(index.capabilities)
    assert.ok(json.length <= 8_000, `compact index too large: ${json.length} chars`)
  })

  test("duplicate ids are deduplicated in the index", () => {
    const s = makeSearch([
      desc({ id: "host.dup", effects: ["READ"] }),
      desc({ id: "host.dup", effects: ["WRITE"], source: { kind: "extension", providerId: "other" } }),
    ])
    const index = s.compactIndex(1000)
    assert.equal(index.capabilities.length, 1, "one entry per canonical id (22 §2)")
    assert.equal(index.deferred, 0)
  })
})

// ── WP-053 — describe (54 §4 tier-2 door) ──────────────────────────────────

describe("WP-053 — describe resolves a full capability", () => {
  test("describe returns the full descriptor for an available capability", () => {
    const s = makeSearch([desc({ id: "host.read_file", description: "read a project file" })])
    const cap = s.describe("host.read_file")
    assert.ok(cap)
    assert.equal(cap!.id, "host.read_file")
    assert.equal(cap!.description, "read a project file")
  })

  test("describe returns null for a missing id", () => {
    const s = makeSearch([desc({ id: "host.read_file" })])
    assert.equal(s.describe("host.nope"), null)
  })

  test("TLS-T07 — describe withholds unavailable capabilities", () => {
    const registry = makeRegistry([desc({ id: "host.gone", description: "disconnected" })])
    registry.register(desc({ id: "host.gone", description: "disconnected", availability: "UNAVAILABLE" }))
    const s = new CapabilitySearch(registry, { now: () => 1_765_000_000_000 })
    assert.equal(s.describe("host.gone"), null)
  })
})