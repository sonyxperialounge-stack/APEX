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

import { test, describe, before, after } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import os from "node:os"
import { createHash } from "node:crypto"
import zlib from "node:zlib"
import { execFileSync, spawn } from "node:child_process"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..")
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")) as {
  files: string[]
  bin: Record<string, string>
  scripts: Record<string, string>
  license?: string
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

// ── WP-082 — the packed artifact itself (33 §5, §16) ────────────────────────
// A source test pass does not prove published package contents are correct, so this
// block packs the REAL tarball and interrogates it: required files, no nested
// archives, no scratch paths, resolvable links, a payload hash inventory that matches
// the source, clean gzip/tar structure, no credential fixtures, and the license.

describe("PKG-T01..T08 — the packed artifact (33 §5, §16)", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "apex-pkg-"))
  const extract = path.join(tmp, "x")

  // --ignore-scripts is deliberate: prepack would `npm run clean`, destroying the dist/
  // that OTHER test files (running in parallel) are reading. The artifact under test is
  // the tree as verify built and synced it — the same thing prepack would pack.
  let tarball = ""
  let entries: string[] = []
  let gzipLayerOk = false

  before(() => {
    execFileSync("npm", ["pack", "--ignore-scripts", "--pack-destination", tmp], { cwd: ROOT, shell: true, stdio: "pipe" })
    tarball = fs.readdirSync(tmp).filter((f) => f.endsWith(".tgz")).map((f) => path.join(tmp, f))[0] ?? ""
    assert.ok(tarball, "npm pack produced no tarball")
    zlib.gunzipSync(fs.readFileSync(tarball)) // throws if the gzip layer is corrupt
    gzipLayerOk = true
    // Run tar with a RELATIVE name from its own cwd: GNU tar reads "C:/…" as a
    // remote host, and msys tar misreads backslashes — a bare filename is the only
    // spelling every tar understands.
    const base = path.basename(tarball)
    const listing = execFileSync("tar", ["-tzf", base], { encoding: "utf8", cwd: tmp })
    entries = listing.split(/\r?\n/).filter(Boolean)
    fs.mkdirSync(extract)
    execFileSync("tar", ["-xzf", base, "-C", path.basename(extract)], { cwd: tmp })
  })
  after(() => {
    fs.rmSync(tmp, { recursive: true, force: true })
  })

  const norm = (p: string): string => p.replace(/\\/g, "/")
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full, out)
      else out.push(full)
    }
    return out
  }
  const readTexts = (dir: string): Array<{ file: string; text: string }> =>
    walk(dir)
      .filter((f) => /\.(md|json|js|mjs|sh|txt|jsonl)$/i.test(f))
      .map((f) => ({ file: norm(path.relative(extract, f)), text: fs.readFileSync(f, "utf8") }))

  test("PKG-T06 — the archive opens cleanly with standard tooling", () => {
    assert.ok(gzipLayerOk, "gzip layer corrupt")
    assert.ok(entries.length > 50, `a full package expects many entries, found ${entries.length}`)
    assert.ok(entries.every((e) => e.startsWith("package/")), "every tar entry is namespaced under package/")
  })

  test("PKG-T01 — the archive contains every documented required file", () => {
    const required = [
      "package/package.json",
      "package/README.md",
      "package/LICENSE",
      "package/bin/apex-agent.js",
      "package/dist/cli/index.js",
      "package/dist/mcp/server.js",
      "package/dist/plugin/index.js",
      "package/scripts/sync-payload.mjs",
      "package/payload/START-HERE.md",
      "package/payload/README.md",
      "package/payload/EXAMPLES.md",
      "package/payload/core/01-LAWS.md",
      "package/payload/core/13-FLEET.md",
      "package/payload/adapters/opencode.md",
      "package/payload/templates/REQUIREMENTS.md",
    ]
    const have = new Set(entries)
    const missing = required.filter((r) => !have.has(r))
    assert.deepEqual(missing, [], "required files missing from the tarball")
  })

  test("PKG-T02 — no source archive is accidentally nested in the deliverable", () => {
    const nested = entries.filter((e) => /\.(tgz|tar\.gz|zip)$/i.test(e))
    assert.deepEqual(nested, [], "nested archives inside the package")
  })

  test("PKG-T03 — no temp, research or internal scratch paths ship", () => {
    const BAD_PATH = /\.apex\/|army-update-plan|(^|\/)(EVIDENCE|WORKLOG)(\/|$)|STATE\.json|\.DS_Store$|Thumbs\.db$|\.log$|(^|\/)tmp\//i
    const badPaths = entries.filter((e) => BAD_PATH.test(e))
    assert.deepEqual(badPaths, [], "scratch paths in the tarball")
    const BAD_TEXT = /army-update-plan|D:\\APEX/i
    const badText = readTexts(extract).filter((f) => BAD_TEXT.test(f.text)).map((f) => f.file)
    assert.deepEqual(badText, [], "scratch/research paths named in shipped file contents")
  })

  test("PKG-T04 — markdown links to package-local docs resolve", () => {
    const md = walk(extract).filter((f) => f.endsWith(".md"))
    for (const file of md) {
      const text = fs.readFileSync(file, "utf8")
      const base = path.dirname(file)
      for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) {
        const target = m[1]!
        if (/^(https?:|mailto:|#)/.test(target)) continue
        // Only doc-like targets are in scope. Example citations such as
        // [auth.py:44](src/auth.py:44) in the adapter docs are demonstration text.
        if (!/\.(md|txt|json|html)$/i.test(target) && !target.endsWith("/")) continue
        const resolved = path.resolve(base, decodeURIComponent(target.split("#")[0]!))
        assert.ok(fs.existsSync(resolved), `${norm(path.relative(extract, file))} links to missing package file: ${target}`)
      }
    }
    // The two links that once shipped dead must never come back (sync rewrites them).
    const all = readTexts(extract).map((f) => f.text).join("\n")
    assert.ok(!all.includes("](CHANGELOG.md)"), "a CHANGELOG.md link shipped — the file does not travel")
    assert.ok(!all.includes("](install/ATTACH.md)"), "an install/ATTACH.md link shipped — the file does not travel")
  })

  test("PKG-T05 — the payload hash inventory matches the source exactly", () => {
    const sha = (f: string): string => createHash("sha256").update(fs.readFileSync(f)).digest("hex")
    const inventory = (root: string): Map<string, string> => {
      const map = new Map<string, string>()
      for (const f of walk(root)) map.set(norm(path.relative(root, f)), sha(f))
      return map
    }
    const shipped = inventory(path.join(extract, "package", "payload"))
    const source = inventory(path.join(ROOT, "payload"))
    const missing = [...source.keys()].filter((k) => !shipped.has(k))
    const extra = [...shipped.keys()].filter((k) => !source.has(k))
    const drifted = [...source.keys()].filter((k) => shipped.has(k) && shipped.get(k) !== source.get(k))
    assert.deepEqual(missing, [], "payload files missing from the tarball")
    assert.deepEqual(extra, [], "payload files in the tarball that the source does not have")
    assert.deepEqual(drifted, [], "payload files whose shipped bytes differ from source")
  })

  test("PKG-T07 — no credential fixture ships outside the tests", () => {
    // The seeded fake values from test/fixtures/security must never travel; neither
    // may an unexplained real-shaped secret. dist/core/redact.js is exempt from the
    // SHAPE patterns only: the redactor's compiled rules name what they detect.
    const SEEDED = [/sk-FAKE/, /hunter2/, /FAKE\.token\.value/, /FAKE0000service/]
    const SHAPES = [/\bsk-[A-Za-z0-9_-]{16,}\b/, /BEGIN [A-Z ]*PRIVATE KEY/, /\bBearer [A-Za-z0-9._-]{16,}\b/]
    const offenders: string[] = []
    for (const f of readTexts(extract)) {
      const isRedactor = f.file.endsWith("dist/core/redact.js")
      for (const re of SEEDED) if (re.test(f.text)) offenders.push(`${f.file}: seeded value ${re}`)
      if (isRedactor) continue
      for (const re of SHAPES) if (re.test(f.text)) offenders.push(`${f.file}: secret shape ${re}`)
    }
    assert.deepEqual(offenders, [], "credential-shaped content in the shipped package")
  })

  test("PKG-T08 — the license travels with the artifact and the sources carry it", () => {
    assert.equal(
      fs.readFileSync(path.join(extract, "package", "LICENSE"), "utf8"),
      fs.readFileSync(path.join(ROOT, "LICENSE"), "utf8"),
      "the shipped LICENSE must be byte-identical to the source LICENSE",
    )
    assert.equal(pkg.license, "SEE LICENSE IN LICENSE")

    // dist is shipped; its banner must carry the same notice (removeComments stays off).
    const banner = fs.readFileSync(path.join(extract, "package", "dist", "cli", "index.js"), "utf8").slice(0, 400)
    assert.match(banner, /Copyright \(c\) 2026 Lalit Sharma/)
    assert.match(banner, /APEX Personal Use License/)

    // REQ-SEC-005 / 42 §5 — every source file carries the byte-for-byte header, checked
    // again at pack time so a headerless file cannot sneak between verify and release.
    const canon = fs.readFileSync(path.join(ROOT, "src", "core", "paths.ts"), "utf8").replace(/\r\n/g, "\n").split("\n").slice(0, 17).join("\n")
    const src = walk(path.join(ROOT, "src")).filter((f) => f.endsWith(".ts"))
    assert.ok(src.length > 20, "the scan found the source tree")
    const headerless = src.filter((f) => !fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n").startsWith(canon))
    assert.deepEqual(headerless, [], "source files missing the license header")
  })

  test("PKG-MCP — the shipped binary answers the MCP handshake over stdio", async () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "apex-pkg-mcp-"))
    const child = spawn(process.execPath, [path.join(extract, "package", "bin", "apex-agent.js"), "mcp"], {
      cwd: project,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, APEX_STATE_DIR: path.join(project, "state") },
    })
    let buffer = ""
    let stderr = ""
    child.stdout.on("data", (chunk: Buffer) => (buffer += chunk.toString("utf8")))
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString("utf8")))
    try {
      child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } }) + "\n")
      const deadline = Date.now() + 20_000
      while (Date.now() < deadline) {
        const nl = buffer.indexOf("\n")
        if (nl !== -1) {
          const frame = JSON.parse(buffer.slice(0, nl).trim()) as { id?: number; result?: { serverInfo?: { name: string } } }
          assert.equal(frame.id, 1)
          assert.equal(frame.result?.serverInfo?.name, "apex")
          return
        }
        await new Promise((r) => setTimeout(r, 50))
      }
      assert.fail(`the shipped MCP server never answered initialize. stderr: ${stderr}`)
    } finally {
      child.kill()
      try {
        fs.rmSync(project, { recursive: true, force: true })
      } catch {
        // Windows keeps the directory busy while the child process is dying — the
        // handshake result stands either way; the OS clears the temp dir later.
      }
    }
  })
})
