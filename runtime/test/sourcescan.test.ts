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
