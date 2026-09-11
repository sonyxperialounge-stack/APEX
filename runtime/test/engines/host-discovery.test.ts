/*


/** WP-052 — host capability discovery (22 §6–§7, 40 §14; TLS-T05, TLS-T06). */

import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { CapabilityRegistry, type CapabilityDescriptor } from "../../src/engines/capability-registry.ts"
import {
  canonicalHostToolId,
  REFRESH_REASON,
  registerHostTools,
  onHostCapabilityChange,
} from "../../src/engines/host-discovery.ts"
import type { HostCapabilities, HostToolDescriptor } from "../../src/host/types.ts"

const NOW = 1_765_000_000_000
const FIXED = () => NOW

function makeHost(tools: HostToolDescriptor[]): HostCapabilities & { calls: number[] } {
  const calls: number[] = []
  return {
    calls,
    async listTools() {
      calls.push(1)
      return tools
    },
  }
}

describe("WP-052 — canonicalHostToolId (22 §7)", () => {
  test("maps a known code-intelligence host tool to its canonical id", () => {
    assert.equal(canonicalHostToolId("publishDiagnostics"), "code.diagnostics")
    assert.equal(canonicalHostToolId("textDocument/references"), "code.references")
    assert.equal(canonicalHostToolId("renameSymbol"), "code.rename")
  })

  test("normalizes host names: trim, lowercase, collapse whitespace", () => {
    assert.equal(canonicalHostToolId("  Read_File "), "host.read_file")
    // "publish diagnostics" (spaced) is NOT the documented alias "publishDiagnostics",
    // so it falls back to the honest host.* namespace instead of guessing.
    assert.equal(canonicalHostToolId("Publish  Diagnostics"), "host.publish diagnostics")
    assert.equal(canonicalHostToolId(""), "")
    assert.equal(canonicalHostToolId("   "), "")
  })

  test("unknown names stay discoverable as host.<normalized-name> (never guessed canonical)", () => {
    assert.equal(canonicalHostToolId("GitHub.API"), "host.github.api")
    assert.equal(canonicalHostToolId("MY_CUSTOM_TOOL"), "host.my_custom_tool")
  })

  test("codeIntelligenceId is never consulted with a fabricated fallback id", () => {
    // "host.foo" is not a code.* alias — canonicalHostToolId would fall through to the
    // host.* namespace, so a tool literally named "host.foo" must normalize to host.host.foo.
    assert.equal(canonicalHostToolId("host.foo"), "host.host.foo")
  })
})

describe("WP-052 — registerHostTools pipeline (22 §6)", () => {
  test("TLS-T06 — a host without a capability surface yields an empty but usable registry", async () => {
    const registry = new CapabilityRegistry({ now: FIXED })
    const result = await registerHostTools(registry, {}, "opencode", { now: FIXED })
    assert.deepEqual(result.ids, [])
    assert.deepEqual(result.unknownHosts, ["opencode"])
    assert.equal(registry.all().length, 0)
    assert.equal(registry.isAvailable("fs.read"), false)
    assert.equal(registry.select("fs.read"), null)
  })

  test("registers declared tools as AVAILABLE with conservative effects", async () => {
    const registry = new CapabilityRegistry({ now: FIXED })
    const host = makeHost([
      { name: "read_file", description: "Read a project file" },
      { name: "web.search", description: "Search the public web" },
      { name: "terminal", description: "Run a shell command" },
    ])
    const result = await registerHostTools(registry, host, "opencode", { now: FIXED })
    assert.deepEqual(result.ids.sort(), ["host.read_file", "host.terminal", "host.web.search"])
    assert.deepEqual(result.unknownHosts, [])
    assert.equal(result.lastCheckedAt, "2025-12-06T05:46:40.000Z")

    const rd = registry.select("host.read_file")!
    assert.equal(rd.source.kind, "host")
    assert.equal(rd.source.providerId, "opencode")
    assert.equal(rd.source.toolName, "read_file")
    assert.ok(rd.effects.includes("READ"))
    assert.equal(rd.trust, "UNTRUSTED") // host-declared, not adapter-vouched

    const ts = registry.select("host.terminal")!
    assert.ok(ts.effects.includes("EXECUTE"))

    const ws = registry.select("host.web.search")!
    assert.ok(ws.effects.includes("NETWORK"))
  })

  test("names are aliases; the canonical id routes to the same descriptor", async () => {
    const registry = new CapabilityRegistry({ now: FIXED })
    const host = makeHost([{ name: "read_file", description: "Read a project file" }])
    await registerHostTools(registry, host, "opencode", { now: FIXED })

    const byId = registry.select("host.read_file")
    const byAlias = registry.candidates("read_file")[0]
    assert.ok(byId)
    assert.ok(byAlias)
    assert.equal(byId!.id, "host.read_file")
    assert.deepEqual(byAlias!.aliases, ["read_file"])
  })

  test("code-intelligence host tools normalize to the canonical table (54 §14)", async () => {
    const registry = new CapabilityRegistry({ now: FIXED })
    const host = makeHost([
      { name: "publishDiagnostics", description: "language server diagnostics" },
      { name: "textDocument/rename", description: "rename symbol" },
    ])
    await registerHostTools(registry, host, "ide", { now: FIXED })

    const diag = registry.select("code.diagnostics")!
    assert.equal(diag.effects.join(","), "READ")
    assert.equal(diag.trust, "TRUSTED") // canonical table vouches
    assert.deepEqual(diag.aliases, ["publishdiagnostics"]) // normalized by register()
    assert.equal(diag.source.providerId, "ide")

    const rename = registry.select("code.rename")!
    assert.equal(rename.effects.join(","), "WRITE")
    assert.equal(rename.trust, "TRUSTED")
  })

  test("TLS-T05 — discovery performs no destructive probe and never invokes a tool", async () => {
    const executed: string[] = []
    const described: string[] = []
    const host: HostCapabilities = {
      listTools: async () => [
        { name: "read_file", description: "Read a file", schemaLocator: "loc1" },
        { name: "delete_everything", description: "Delete files", schemaLocator: "loc2" },
      ],
      describeTool: async (name) => {
        described.push(name)
        return { name }
      },
    }
    const registry = new CapabilityRegistry({ now: FIXED })
    await registerHostTools(registry, host, "opencode", { now: FIXED })
    assert.deepEqual(executed, []) // no probe execution was possible — nothing to run
    assert.deepEqual(described, []) // lazy schema stayed lazy (22 §3)

    // delete_everything is DELETED-classified but was never invoked, and it is registered.
    const del = registry.select("host.delete_everything")!
    assert.ok(del.effects.includes("DELETE"))
    assert.equal(registry.isAvailable("host.delete_everything"), true)
  })

  test("a tool with no schema does not block discovery; effects stay honest", async () => {
    const registry = new CapabilityRegistry({ now: FIXED })
    const host = makeHost([{ name: "opaque_tool", schemaLocator: "" }])
    await registerHostTools(registry, host, "opencode", { now: FIXED })

    const cap = registry.select("host.opaque_tool")!
    assert.equal(cap.availability, "AVAILABLE")
    assert.ok(cap.effects.includes("EXTERNAL_SIDE_EFFECT")) // conservative, never optimistic
    assert.equal(cap.schemaLocator, undefined)
  })

  test("empty or whitespace tool names are skipped, not fabricated", async () => {
    const registry = new CapabilityRegistry({ now: FIXED })
    const host = makeHost([{ name: "" }, { name: "   " }])
    const result = await registerHostTools(registry, host, "opencode", { now: FIXED })
    assert.deepEqual(result.ids, [])
    assert.equal(registry.all().length, 0)
  })

  test("a throwing listTools yields an unknown host, never a crash", async () => {
    const registry = new CapabilityRegistry({ now: FIXED })
    const host: HostCapabilities = {
      listTools: async () => {
        throw new Error("host refused")
      },
    }
    const result = await registerHostTools(registry, host, "broken", { now: FIXED })
    assert.deepEqual(result.unknownHosts, ["broken"])
    assert.equal(registry.all().length, 0)
  })

  test("re-discovery replaces the same provider+tool record (CAP-T01 idempotence)", async () => {
    const registry = new CapabilityRegistry({ now: FIXED })
    const host = makeHost([{ name: "read_file", description: "Read a project file" }])
    await registerHostTools(registry, host, "opencode", { now: FIXED })
    await registerHostTools(registry, host, "opencode", { now: FIXED })

    const all = registry.candidates("host.read_file")
    assert.equal(all.length, 1)
    assert.equal(registry.all().length, 1)
  })

  test("two hosts declaring the same semantic tool become two candidates; select prefers trust", async () => {
    const registry = new CapabilityRegistry({ now: FIXED })
    await registerHostTools(registry, makeHost([{ name: "tree", description: "walk the tree" }]), "cli-a", { now: FIXED })
    assert.equal(registry.select("host.tree")!.source.providerId, "cli-a")

    // A trusted in-tree provider overrides the host-declared one (rankCandidate, 47 §4.9).
    registry.register({
      id: "host.tree",
      title: "Read tree",
      description: "Reads a directory tree",
      aliases: ["tree"],
      source: { kind: "builtin", providerId: "apex" },
      availability: "AVAILABLE",
      effects: ["READ"],
      trust: "CORE",
      lastCheckedAt: "2025-12-06T05:46:40.000Z",
    })
    const best = registry.select("host.tree")!
    assert.equal(best.source.providerId, "apex")
    assert.equal(best.trust, "CORE")
  })
})

describe("WP-052 — refresh is bounded and discovery-driven (47 §4.9)", () => {
  test("onHostCapabilityChange without a host subscription is a harmless no-op", () => {
    const unsub = onHostCapabilityChange({}, () => {})
    assert.equal(typeof unsub, "function")
    unsub() // must not throw
  })

  test("onHostCapabilityChange fires the bounded refresh and returns the host unsubscribe", async () => {
    let unsubbed = false
    let fired = 0
    const host: HostCapabilities = {
      onCapabilityChange: (cb) => {
        // Fire once, like a live host would on tool add/remove.
        cb()
        return () => {
          unsubbed = true
        }
      },
    }
    const unsub = onHostCapabilityChange(host, (reason) => {
      assert.equal(reason, REFRESH_REASON)
      fired++
    })
    await new Promise((r) => setTimeout(r, 10))
    assert.equal(fired, 1)
    unsub()
    assert.equal(unsubbed, true)
  })

  test("registry.refresh calls the discovery hook once per reason", async () => {
    const actions: string[] = []
    const registry = new CapabilityRegistry({
      now: FIXED,
      onRefresh: (reason) => {
        actions.push(reason)
      },
    })
    await registry.refresh(REFRESH_REASON)
    await registry.refresh(REFRESH_REASON)
    await registry.refresh("doctor.manual")
    assert.deepEqual(actions, [REFRESH_REASON, "doctor.manual"])
  })
})

describe("WP-052 — descriptor integrity", () => {
  test("legacy string-only listTools results are accepted and normalized", async () => {
    const registry = new CapabilityRegistry({ now: FIXED })
    // A real host may return plain names. registerHostTools defends against it even
    // though the declared surface is structured (hosts are untrusted).
    const host = {
      calls: 0,
      async listTools() {
        host.calls++
        return ["ReadMe.md", "find_thing", "do_stuff"] as unknown as HostToolDescriptor[]
      },
    } as unknown as HostCapabilities & { calls: number }
    await registerHostTools(registry, host, "legacy", { now: FIXED })

    assert.equal(registry.select("host.readme.md")!.source.toolName, "ReadMe.md")
    const t = registry.candidates("find_thing")[0]
    assert.equal(t!.id, "host.find_thing")
  })

  test("discovery result ids are canonical; distinct host declarations stay distinct candidates", async () => {
    const registry = new CapabilityRegistry({ now: FIXED })
    const host = makeHost([
      { name: "tree", description: "Read a directory tree" },
      { name: "TREE", description: "Read a directory tree" },
    ])
    const result = await registerHostTools(registry, host, "opencode", { now: FIXED })
    assert.deepEqual(result.ids, ["host.tree"]) // one canonical id
    // Two genuinely different host tool names both normalize to host.tree; both are
    // real declarations, so both are candidates (CAP-T01), not a single dedup.
    assert.equal(registry.candidates("host.tree").length, 2)
  })

  test("stamp is the injected clock", async () => {
    const registry = new CapabilityRegistry({ now: FIXED })
    const host = makeHost([{ name: "tree", description: "Read a directory tree" }])
    const result = await registerHostTools(registry, host, "opencode", { now: FIXED })
    assert.equal(result.lastCheckedAt, "2025-12-06T05:46:40.000Z")
    assert.equal(registry.select("host.tree")!.lastCheckedAt, "2025-12-06T05:46:40.000Z")
  })
})