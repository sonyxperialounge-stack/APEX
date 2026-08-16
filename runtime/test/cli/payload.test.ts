/**
 * Payload integrity.
 *
 * These exist because a "dead links fixed" claim was only half true: START-HERE.md and
 * README.md were fixed, but five adapter files still pointed at `install/ATTACH.md`,
 * which does not ship. A grep would have caught it in two seconds; nothing ran one.
 *
 * The lesson generalises past this one bug: a claim of "fixed" needs a check that covers
 * the whole surface, not the files that happened to be open.
 */

import { test, describe } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const RUNTIME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..")
const PAYLOAD = path.join(RUNTIME, "payload")
const PROJECT = path.resolve(RUNTIME, "..")

/**
 * Directories that exist in the repository but never travel with the package.
 *
 * Only APEX's OWN directories. A reference to `.github/workflows` points at the USER's
 * project — "look there for the real test command" — and is a legitimate instruction,
 * not a link into this package.
 */
const NOT_SHIPPED = ["install", "build", "runtime"]

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (entry.isFile() && full.endsWith(".md")) out.push(full)
  }
  return out
}

const FILES = walk(PAYLOAD).map((f) => ({
  rel: path.relative(PAYLOAD, f).split(path.sep).join("/"),
  text: fs.readFileSync(f, "utf8"),
}))

describe("payload integrity", () => {
  test("the payload exists and has real content", () => {
    assert.ok(fs.existsSync(PAYLOAD), "payload/ is missing")
    assert.ok(FILES.length > 15, `expected the full doctrine, found ${FILES.length} markdown files`)
    assert.ok(fs.existsSync(path.join(PAYLOAD, "START-HERE.md")))
    assert.ok(fs.existsSync(path.join(PAYLOAD, "core", "01-LAWS.md")))
  })

  test("nothing references a directory that does not ship", () => {
    const offenders: string[] = []
    for (const { rel, text } of FILES) {
      for (const dir of NOT_SHIPPED) {
        // Match a path reference, in a link or in backticks: install/X, ../install/X
        const re = new RegExp(`(?:\\.\\./)*${dir}/[\\w.-]+`, "g")
        for (const m of text.matchAll(re)) {
          // A prose mention that explicitly scopes it to the repository is fine.
          const line = text.split(/\r?\n/).find((l) => l.includes(m[0])) ?? ""
          if (/project repository|repository, see|in the repo/i.test(line)) continue
          offenders.push(`${rel}: ${m[0]}`)
        }
      }
    }
    assert.deepEqual(offenders, [], `payload references files that are not shipped:\n  ${offenders.join("\n  ")}`)
  })

  test("every relative markdown link inside the payload resolves", () => {
    const broken: string[] = []
    for (const { rel, text } of FILES) {
      const dir = path.dirname(path.join(PAYLOAD, rel))
      for (const m of text.matchAll(/\]\(([^)#:]+\.md)\)/g)) {
        const target = path.resolve(dir, m[1]!)
        if (!fs.existsSync(target)) broken.push(`${rel} -> ${m[1]}`)
      }
    }
    assert.deepEqual(broken, [], `broken links in the shipped payload:\n  ${broken.join("\n  ")}`)
  })

  test("the payload is in sync with the doctrine source", () => {
    const drifted: string[] = []
    for (const dir of ["core", "adapters", "templates"]) {
      const source = path.join(PROJECT, dir)
      if (!fs.existsSync(source)) continue
      for (const file of walk(source)) {
        const rel = path.relative(PROJECT, file).split(path.sep).join("/")
        const copy = path.join(PAYLOAD, rel)
        if (!fs.existsSync(copy)) {
          drifted.push(`${rel}: missing from payload`)
        } else {
          // sync-payload.mjs rewrites repo-only links on copy, so a file containing such
          // a link legitimately differs. Everything else must match byte for byte.
          const source = fs.readFileSync(file, "utf8")
          const rewritten = /install\/ATTACH|\.\.\/build\/|build\/BUILD|build\/TESTING|runtime\//.test(source)
          if (source !== fs.readFileSync(copy, "utf8") && !rewritten) {
            drifted.push(`${rel}: payload differs from source`)
          }
        }
      }
    }
    assert.deepEqual(drifted, [], `run \`npm run sync:payload\`:\n  ${drifted.join("\n  ")}`)
  })

  test("host companions ship for the L2 install", () => {
    for (const rel of [
      "opencode/agents/apex-implementer.md",
      "opencode/agents/apex-reviewer.md",
      "opencode/commands/apex.md",
      "opencode/skills/apex-doctrine/SKILL.md",
    ]) {
      assert.ok(fs.existsSync(path.join(PAYLOAD, rel)), `missing companion: ${rel}`)
    }
  })

  test("the payload names no machine-specific path", () => {
    const offenders: string[] = []
    for (const { rel, text } of FILES) {
      // A drive letter or a home directory baked into a shipped file is wrong for
      // everyone except the machine it was written on.
      for (const m of text.matchAll(/[A-Z]:[\\/]Users[\\/][\w.-]+/g)) {
        // `C:\Users\x` inside a sentence about JSON escaping is a teaching example, not a
        // baked-in location. Only flag it where it reads as a real path.
        const line = text.split(/\r?\n/).find((l) => l.includes(m[0])) ?? ""
        if (/escap|backslash|invalid|must be|forward slash/i.test(line)) continue
        offenders.push(`${rel}: ${m[0]}`)
      }
    }
    assert.deepEqual(offenders, [], `machine-specific paths in the payload:\n  ${offenders.join("\n  ")}`)
  })
})
