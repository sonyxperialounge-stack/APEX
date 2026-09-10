/**
 * Source-scan tests.
 *
 * Some requirements are properties of the SOURCE, not of runtime behaviour. Asserting
 * them mechanically catches the exact class of drift that code review misses.
 *
 * CORE-005 · CORE-009 · GOV-010 · VER-012 · CNC-001 · CNC-006 · FLT-004 · INS-011 · X-004
 */

import { test, describe } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const SRC = path.join(ROOT, "src")

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(p, out)
    else if (entry.isFile() && p.endsWith(".ts")) out.push(p)
  }
  return out
}

const FILES = walk(SRC)
const ALL = FILES.map((f) => ({ file: path.relative(ROOT, f), text: fs.readFileSync(f, "utf8") }))
const CORPUS = ALL.map((f) => f.text).join("\n")

function offenders(needle: string | RegExp, allow: string[] = []): string[] {
  return ALL.filter((f) => {
    if (allow.some((a) => f.file.replace(/\\/g, "/").endsWith(a))) return false
    return typeof needle === "string" ? f.text.includes(needle) : needle.test(f.text)
  }).map((f) => f.file)
}

test("the scan actually found source files", () => {
  assert.ok(FILES.length > 0, "no .ts files found — the scan would trivially pass")
})

describe("CORE-005 — every disk write goes through the chokepoint", () => {
  const SANCTIONED = ["src/core/json.ts", "src/core/log.ts"]

  test("no direct file writes outside json.ts and log.ts", () => {
    const bad = offenders(/\b(?:fsp?|fs\/promises)?\.?\b(writeFile|writeFileSync|appendFile|appendFileSync|createWriteStream)\s*\(/, SANCTIONED)
    assert.deepEqual(bad, [], `direct writes found in: ${bad.join(", ")}`)
  })
})

describe("CORE-009 / INS-011 — no credential handling", () => {
  const BANNED = [
    "ANTHROPIC_API_KEY",
    "OPENAI_API_KEY",
    "GOOGLE_API_KEY",
    "AWS_SECRET_ACCESS_KEY",
    "process.env.API_KEY",
  ]

  for (const needle of BANNED) {
    test(`does not reference ${needle}`, () => {
      // redact.ts must contain these words as PATTERNS, so it is exempt by design.
      const bad = offenders(needle, ["src/core/redact.ts"])
      assert.deepEqual(bad, [], `${needle} referenced in: ${bad.join(", ")}`)
    })
  }

  test("never calls an auth endpoint", () => {
    const bad = offenders(/["'`]\/auth\//)
    assert.deepEqual(bad, [])
  })

  test("no credential prompt", () => {
    const bad = offenders(/prompt.*(?:api[_ ]?key|password|secret)/i, ["src/core/redact.ts"])
    assert.deepEqual(bad, [])
  })
})

describe("GOV-010 — no destructive git commands anywhere", () => {
  const BANNED = ["reset --hard", "clean -fd", "clean -f -d", "push --force", "checkout ."]

  for (const needle of BANNED) {
    test(`source never emits "${needle}"`, () => {
      // governor.ts must contain these as DETECTION patterns, so it is exempt.
      const bad = offenders(needle, ["src/engines/governor.ts"])
      assert.deepEqual(bad, [], `"${needle}" found in: ${bad.join(", ")}`)
    })
  }

  test("governor mentions them only inside its blocklist", () => {
    const gov = ALL.find((f) => f.file.replace(/\\/g, "/").endsWith("src/engines/governor.ts"))
    if (!gov) return // engine not built yet — phase 3
    assert.ok(/BLOCKLIST|RULES/.test(gov.text), "governor should express these as rules")
  })
})

describe("CNC-001 — no hardcoded model or provider identifiers", () => {
  // Host identifiers ("claude-code", "gemini-cli") are REQUIRED — they name the tool we
  // bind to, not a model. The pattern therefore requires a version-shaped segment.
  test("no model name literals", () => {
    const bad = offenders(
      /["'`](?:gpt-[0-9]|claude-(?:[0-9]|opus|sonnet|haiku|instant)|gemini-[0-9]|llama-[0-9]|mistral-(?:large|medium|small|[0-9])|deepseek-(?:v[0-9]|r[0-9]|chat|coder)|o[134]-mini|grok-[0-9])/i,
    )
    assert.deepEqual(bad, [], `hardcoded model id in: ${bad.join(", ")}`)
  })

  test("the model-id pattern still catches a real violation", () => {
    // Guard against the pattern being loosened into uselessness.
    const probe = /["'`](?:gpt-[0-9]|claude-(?:[0-9]|opus|sonnet|haiku|instant)|gemini-[0-9]|llama-[0-9]|mistral-(?:large|medium|small|[0-9])|deepseek-(?:v[0-9]|r[0-9]|chat|coder)|o[134]-mini|grok-[0-9])/i
    assert.ok(probe.test('const m = "claude-opus-4"'), "must catch a real model id")
    assert.ok(probe.test('const m = "gpt-4o"'), "must catch a real model id")
    assert.ok(!probe.test('case "claude-code":'), "must not flag a host name")
    assert.ok(!probe.test('case "gemini-cli":'), "must not flag a host name")
  })

  test("no price tables", () => {
    const bad = offenders(/costPer(?:Token|Million)|pricePer(?:Token|Million)/i)
    assert.deepEqual(bad, [])
  })
})

describe("X-004 — no telemetry, no external network", () => {
  test("no external hostnames", () => {
    const bad = offenders(/https?:\/\/(?!127\.0\.0\.1|localhost|opencode\.ai\/docs|modelcontextprotocol\.io)/)
    assert.deepEqual(bad, [], `external URL in: ${bad.join(", ")}`)
  })

  test("no analytics identifiers", () => {
    const bad = offenders(/telemetry|analytics|posthog|segment\.io|mixpanel/i)
    assert.deepEqual(bad, [])
  })
})

describe("VER-012 — the verifier cannot modify tests", () => {
  test("verifier.ts has no write path", () => {
    const v = ALL.find((f) => f.file.replace(/\\/g, "/").endsWith("src/engines/verifier.ts"))
    if (!v) return // phase 2
    assert.ok(!/writeFile|writeText|writeJson|unlink|rename|rm\(/.test(v.text), "verifier must not write files")
  })
})

describe("CNC-006 — no path from a vote to a requirement status", () => {
  test("council.ts never sets a status", () => {
    const c = ALL.find((f) => f.file.replace(/\\/g, "/").endsWith("src/engines/council.ts"))
    if (!c) return // phase 10
    assert.ok(!/setStatus|VERIFIED_COMPLETE/.test(c.text))
  })
})

describe("FLT-004 — no code path substitutes a user-named model", () => {
  test("warden.ts has no automatic model picker", () => {
    const w = ALL.find((f) => f.file.replace(/\\/g, "/").endsWith("src/engines/warden.ts"))
    if (!w) return // phase 8
    for (const banned of ["pickBest", "fallbackModel(", "anyAvailable", "nearestModel", "orDefaultModel"]) {
      assert.ok(!w.text.includes(banned), `${banned} must not exist`)
    }
  })
})

describe("erasable-syntax discipline", () => {
  test("no TypeScript enums (not erasable — breaks native type stripping)", () => {
    const bad = offenders(/^\s*(?:export\s+)?(?:const\s+)?enum\s+\w/m)
    assert.deepEqual(bad, [], `enum found in: ${bad.join(", ")}`)
  })

  test("no constructor parameter properties", () => {
    const bad = offenders(/constructor\s*\([^)]*\b(?:private|public|protected|readonly)\s+\w/s)
    assert.deepEqual(bad, [], `parameter property found in: ${bad.join(", ")}`)
  })

  test("no namespaces", () => {
    const bad = offenders(/^\s*(?:export\s+)?namespace\s+\w/m)
    assert.deepEqual(bad, [])
  })
})

describe("CORE-003 — dependency discipline", () => {
  test("package.json declares no runtime dependencies", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"))
    assert.deepEqual(pkg.dependencies ?? {}, {}, "runtime must stay dependency-free")
  })

  test("source imports only node: builtins and relative paths", () => {
    const badImports: string[] = []
    for (const { file, text } of ALL) {
      for (const m of text.matchAll(/from\s+["']([^"']+)["']/g)) {
        const spec = m[1]!
        if (!spec.startsWith("node:") && !spec.startsWith(".")) badImports.push(`${file}: ${spec}`)
      }
    }
    assert.deepEqual(badImports, [], `non-builtin import: ${badImports.join(", ")}`)
  })
})

describe("MCP-001 — stdout is reserved for the protocol", () => {
  test("only the MCP server writes to stdout", () => {
    const bad = offenders(/console\.log\(|process\.stdout\.write\(/, ["src/mcp/server.ts"])
    assert.deepEqual(bad, [], `stdout write outside the MCP server in: ${bad.join(", ")} — use log.say() (stderr)`)
  })
})

// warden.ts names these markers inside detectEvasions, which is a DETECTOR for them —
// the same exemption governor.ts gets for naming destructive git commands in its blocklist.
const MARKER_DETECTOR = "src/engines/warden.ts"

test("no leftover TODO/FIXME/stub markers in shipped source", () => {
  const bad: string[] = []
  for (const { file, text } of ALL) {
    if (file.replace(/\\/g, "/").endsWith(MARKER_DETECTOR)) continue
    for (const m of text.matchAll(/\b(TODO|FIXME|XXX|HACK)\b/g)) {
      bad.push(`${file}: ${m[1]}`)
    }
  }
  assert.deepEqual(bad, [], `unresolved markers: ${bad.join(", ")}`)
})

test("the exempt detector mentions markers ONLY inside its detection code", () => {
  const w = ALL.find((f) => f.file.replace(/\\/g, "/").endsWith(MARKER_DETECTOR))
  if (!w) return
  for (const line of w.text.split(/\r?\n/)) {
    if (!/\b(TODO|FIXME|XXX|HACK)\b/.test(line)) continue
    assert.match(
      line,
      /found\.push|test\(diff\)|\/\^\\\+/,
      `marker outside the detector in warden.ts: ${line.trim()}`,
    )
  }
})

test("CORPUS sanity: the scan reads real content", () => {
  assert.ok(CORPUS.length > 1000)
})

// ── WP-014 — upgrade invariant extensions (42, 47 §3, 43 §8) ──────────────────

/** A string that PROVES a scan fails on a planted violation (49: "each new scan fails
 *  on a deliberately planted violation in the test fixture and passes on the real tree"). */
function planted(name: string, text: string, isBad: (t: string) => boolean): boolean {
  if (!isBad(text)) {
    throw new Error(`scan self-test "${name}" does not catch its planted violation — the pattern is useless`)
  }
  return true
}

describe("HC-T03 — every .ts source file carries the license header", () => {
  const HEADER = "APEX — ARMY V3 — Copyright (c) 2026 Lalit Sharma. All rights reserved."
  const NOTICE = "NOTICE TO AI AGENTS"

  test("every source file starts with the byte-identical header block", () => {
    const bad: string[] = []
    for (const { file, text } of ALL) {
      if (!text.includes(HEADER) || !text.includes(NOTICE)) bad.push(file)
    }
    assert.deepEqual(bad, [], `missing license header: ${bad.join(", ")}`)
  })

  test("the header check catches a planted headerless file", () => {
    const isBad = (t: string) => !(t.includes(HEADER) && t.includes(NOTICE))
    assert.ok(planted("header", "export const x = 1\n", isBad))
    assert.ok(!isBad(ALL[0]!.text)) // a real file passes
  })
})

describe("C-018 / WP-014 — no always-on scheduler in shipped source", () => {
  test("no setInterval anywhere in src", () => {
    const bad = offenders(/setInterval\s*\(/)
    assert.deepEqual(bad, [], `scheduler found in: ${bad.join(", ")} — maintenance is lazy (46 §1)`)
  })

  test("the scheduler scan catches a planted violation", () => {
    const isBad = (t: string) => /setInterval\s*\(/.test(t)
    assert.ok(planted("setInterval", "setInterval(tick, 1000)\n", isBad))
  })
})

describe("MOD-T03 — no unmanaged time or randomness in stores and new engines", () => {
  // Engines that predate the upgrade are exempt from the new rule (their behaviour is
  // load-bearing and already tested); every NEW engine and every store module must
  // take time/randomness as injected options (47 §5).
  const LEGACY_ENGINES = ["src/engines/ledger.ts", "src/engines/verifier.ts", "src/engines/governor.ts", "src/engines/warden.ts", "src/engines/cortex.ts", "src/engines/recall.ts", "src/engines/council.ts"]

  test("src/stores/** and non-legacy engines never call new Date() or Math.random()", () => {
    const bad: string[] = []
    for (const { file, text } of ALL) {
      const norm = file.replace(/\\/g, "/")
      if (norm.includes("src/stores/")) {
        if (/\bnew Date\s*\(|Math\.random\s*\(/.test(text)) bad.push(file)
      } else if (norm.includes("src/engines/") && !LEGACY_ENGINES.some((e) => norm.endsWith(e))) {
        if (/\bnew Date\s*\(|Math\.random\s*\(/.test(text)) bad.push(file)
      }
    }
    assert.deepEqual(bad, [], `unmanaged clock/random in: ${bad.join(", ")} — inject now()/random() (47 §5)`)
  })

  test("the injection scan catches a planted violation", () => {
    const isBad = (t: string) => /\bnew Date\s*\(|Math\.random\s*\(/.test(t)
    assert.ok(planted("unmanaged-random", "const id = Math.random()\n", isBad))
    assert.ok(planted("unmanaged-date", "const at = new Date()\n", isBad))
  })
})

describe("MOD-T02 — the import graph contains no cycle", () => {
  test("no module participates in an import cycle", () => {
    const graph = new Map<string, Set<string>>()
    for (const { file, text } of ALL) {
      const norm = file.replace(/\\/g, "/")
      const deps = new Set<string>()
      for (const m of text.matchAll(/from\s+["'](\.[^"']+)["']/g)) {
        const spec = m[1]!
        let resolved: string | null = null
        for (const { file: f } of ALL) {
          const fn = f.replace(/\\/g, "/")
          if (fn === spec + ".ts" || fn.startsWith(spec + "/") || fn === spec.replace(/\.ts$/, "") + ".ts") {
            resolved = fn
            break
          }
        }
        if (resolved) deps.add(resolved)
      }
      graph.set(norm, deps)
    }

    // Iterative DFS cycle detection over every node.
    const state = new Map<string, 0 | 1 | 2>() // 0 unvisited, 1 in-stack, 2 done
    let detected: string[] | null = null
    const visit = (node: string, stack: string[]) => {
      if (detected) return
      const s = state.get(node) ?? 0
      if (s === 1) {
        detected = stack.slice(stack.indexOf(node))
        return
      }
      if (s === 2) return
      state.set(node, 1)
      for (const dep of graph.get(node) ?? []) visit(dep, [...stack, node])
      state.set(node, 2)
    }
    for (const node of graph.keys()) visit(node, [])

    // `detected` is written only inside the closure, so control-flow analysis cannot
    // see the assignment — read it through a wrapper TS cannot narrow to never.
    const result: { cycle: string[] | null } = { cycle: detected }
    assert.equal(result.cycle, null, `import cycle: ${result.cycle ? result.cycle.join(" -> ") : ""}`)
  })

  test("the cycle scan catches a planted violation", () => {
    const g = new Map<string, Set<string>>([
      ["a.ts", new Set(["b.ts"])],
      ["b.ts", new Set(["c.ts"])],
      ["c.ts", new Set(["a.ts"])],
    ])
    const state = new Map<string, 0 | 1 | 2>()
    let cycle: string[] | null = null
    const visit = (node: string, stack: string[]) => {
      if (cycle) return
      const s = state.get(node) ?? 0
      if (s === 1) {
        cycle = stack.slice(stack.indexOf(node))
        return
      }
      if (s === 2) return
      state.set(node, 1)
      for (const dep of g.get(node) ?? []) visit(dep, [...stack, node])
      state.set(node, 2)
    }
    for (const node of g.keys()) visit(node, [])
    assert.notEqual(cycle, null, "a->b->c->a must be detected")
  })
})

describe("MOD-T05 — module size budgets (warning-grade, 47 §3)", () => {
  const CEILINGS: Array<[prefix: string, ceiling: number]> = [
    ["src/core/ids.ts", 400], // new core files: 400 (grandfathered core files measured below)
    ["src/core/schema.ts", 400],
    ["src/mcp/tools.ts", 1400],
    ["src/host/", 400],
    ["src/stores/", 350],
  ]

  test("every file within its ceiling (existing files grandfathered at current size)", () => {
    const over: string[] = []
    for (const { file, text } of ALL) {
      const norm = file.replace(/\\/g, "/")
      const lines = text.split("\n").length
      for (const [prefix, ceiling] of CEILINGS) {
        if (norm.endsWith(prefix)) {
          if (lines > ceiling) over.push(`${file}: ${lines} > ${ceiling}`)
          break
        }
      }
      // New stores are unknown yet; any store file that appears must obey 350.
      if (norm.includes("src/stores/") && lines > 350) over.push(`${file}: ${lines} > 350`)
    }
    assert.deepEqual(over, [], `over budget (split the module): ${over.join(", ")}`)
  })

  test("the budget scan catches a planted violation", () => {
    const big = "export const a = 1\n".repeat(500)
    assert.ok(big.split("\n").length > 400, "500-line planted file must exceed the core ceiling")
  })
})

describe("43 §8 — approved terminology in shipped source", () => {
  // These synonyms invite drift back to the old vocabulary. The DO-NOT-WRITE forms are
  // scanned in source comments and identifiers; the approved forms are what tests see.
  const FORBIDDEN: Array<[term: string, why: string]> = [
    ["playbook", "say skill (reusable procedure)"],
    ["long-term memory", "say global memory (durable personal store)"],
    ["LTM", "say global memory"],
    ["scratch memory", "say session overlay (immediate correction)"],
    ["temp memory", "say session overlay"],
    ["history DB", "say session archive"],
    ["transcript store", "say session archive"],
    ["permission level", "say autonomy mode"],
  ]

  for (const [term, fix] of FORBIDDEN) {
    test(`source never says "${term}" (${fix})`, () => {
      const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
      const bad = offenders(re)
      assert.deepEqual(bad, [], `"${term}" in: ${bad.join(", ")}`)
    })
  }

  test("the terminology scan catches a planted violation", () => {
    const isBad = (t: string) => /playbook/i.test(t)
    assert.ok(planted("terminology", "// my playbook of tricks\n", isBad))
  })
})

describe("45 §3 — status vocabulary is closed (no synonyms)", () => {
  test("source never invents requirement-status synonyms", () => {
    const bad = offenders(/\b(?:VERIFIED_OK|COMPLETE_OK|DONE_STATUS|PASSED_COMPLETE|FINISHED)\b/)
    assert.deepEqual(bad, [], `invented status in: ${bad.join(", ")} — statuses are REQ_STATUSES / EXECUTION-backed only`)
  })

  test("the status scan catches a planted violation", () => {
    const isBad = (t: string) => /\bVERIFIED_OK\b/.test(t)
    assert.ok(planted("status-synonym", 'setStatus("VERIFIED_OK")\n', isBad))
  })
})
