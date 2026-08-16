/**
 * Packaging regressions.
 *
 * These exist because a live install found a failure the entire mock-based suite had
 * missed: Node refuses to strip TypeScript types for files under node_modules, so a
 * package shipping raw `.ts` installs cleanly and then throws on the very first run.
 *
 * That is the exact "mock-green, shipped-broken" class this project exists to prevent,
 * so it gets permanent tests rather than a note in a changelog.
 */

import { test, describe } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..")
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")) as {
  files: string[]
  bin: Record<string, string>
  scripts: Record<string, string>
  dependencies?: Record<string, string>
  engines?: Record<string, string>
}

describe("CORE-001 — the published package must actually run", () => {
  test("ships compiled JavaScript, not raw TypeScript", () => {
    assert.ok(pkg.files.includes("dist/"), "dist/ must be published")
    assert.ok(
      !pkg.files.some((f) => f.startsWith("src")),
      "src/ must NOT be published — Node cannot strip types under node_modules",
    )
  })

  test("a build step exists and prepack runs it", () => {
    assert.ok(pkg.scripts.build, "a build script is required")
    assert.match(pkg.scripts.prepack ?? "", /build/, "prepack must build, or the tarball ships stale output")
  })

  test("the bin entry is plain JavaScript", () => {
    const bin = pkg.bin["apex-agent"]!
    assert.match(bin, /\.js$/, "the bin entry must be .js — .ts would fail under node_modules")
    assert.ok(fs.existsSync(path.join(ROOT, bin)), `${bin} is missing`)
  })

  test("the bin entry prefers dist and falls back to src", () => {
    const source = fs.readFileSync(path.join(ROOT, pkg.bin["apex-agent"]!), "utf8")
    assert.match(source, /dist/, "must prefer the compiled build")
    assert.match(source, /src/, "must still work from a checkout")
    assert.ok(!/^import .* from ["'].*\.ts["']/m.test(source), "the bin must not statically import a .ts file")
  })

  test("the compiled build exists and imports .js, never .ts", () => {
    const dist = path.join(ROOT, "dist")
    if (!fs.existsSync(dist)) {
      assert.fail("dist/ is missing — run `npm run build` before packing")
    }
    const files: string[] = []
    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) walk(full)
        else if (entry.name.endsWith(".js")) files.push(full)
      }
    }
    walk(dist)
    assert.ok(files.length > 10, `expected a full build, found ${files.length} files`)

    for (const file of files) {
      const text = fs.readFileSync(file, "utf8")
      for (const m of text.matchAll(/from\s+["']([^"']+)["']/g)) {
        const spec = m[1]!
        assert.ok(!spec.endsWith(".ts"), `${path.relative(ROOT, file)} imports a .ts path: ${spec}`)
        if (spec.startsWith(".")) {
          assert.match(spec, /\.js$/, `${path.relative(ROOT, file)} has an extensionless relative import: ${spec}`)
        }
      }
    }
  })

  test("the compiled build contains no TypeScript-only syntax", () => {
    const entry = path.join(ROOT, "dist", "cli", "index.js")
    if (!fs.existsSync(entry)) assert.fail("dist/cli/index.js is missing — run `npm run build`")
    const text = fs.readFileSync(entry, "utf8")
    assert.ok(!/\binterface\s+\w+\s*\{/.test(text), "type-only syntax survived into the build")
    assert.ok(!/:\s*Promise<void>\s*\{/.test(text), "type annotations survived into the build")
  })

  test("the doctrine payload is published", () => {
    assert.ok(pkg.files.includes("payload/"), "attach must work offline, so the payload ships")
    assert.ok(fs.existsSync(path.join(ROOT, "payload", "START-HERE.md")), "payload/START-HERE.md is missing")
    assert.ok(fs.existsSync(path.join(ROOT, "payload", "core")), "payload/core is missing")
  })

  test("CORE-003 — no runtime dependencies", () => {
    assert.deepEqual(pkg.dependencies ?? {}, {})
  })

  test("the supported Node range is declared", () => {
    assert.match(pkg.engines?.node ?? "", />=/, "engines.node must be declared")
  })
})
