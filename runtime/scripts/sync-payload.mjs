#!/usr/bin/env node
/**
 * Rebuild `payload/` from the doctrine sources.
 *
 * The payload ships inside the npm package, so it must be a faithful copy of the source
 * doctrine — and it must not reference anything that does not travel with it. Copying by
 * hand let five dead links survive a "fixed" claim; this makes the copy reproducible and
 * `test/cli/payload.test.ts` makes the link integrity checkable, and runs with the suite.
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const RUNTIME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const PROJECT = path.resolve(RUNTIME, "..")
const PAYLOAD = path.join(RUNTIME, "payload")

/** Directories and files copied verbatim from the project root into the payload. */
const COPY_DIRS = ["core", "adapters", "templates"]
const COPY_FILES = ["START-HERE.md", "README.md", "EXAMPLES.md"]

/** Present only in the repository, never in the shipped package. */
export const NOT_SHIPPED = ["install", "build", "runtime", ".github"]

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true })
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name)
    const dst = path.join(to, entry.name)
    if (entry.isDirectory()) copyDir(src, dst)
    else if (entry.isFile()) fs.copyFileSync(src, dst)
  }
}

/**
 * The repository copy and the shipped copy have different audiences.
 *
 * In the repo, `build/` and `install/` are real neighbours and linking to them is correct.
 * In the package they do not exist, so the same link is dead. Rewriting on copy keeps both
 * correct — and keeps the fix from being clobbered the next time the payload is rebuilt,
 * which is exactly how five dead links survived a "fixed" claim.
 */
const REWRITES = [
  [/\[`install\/ATTACH\.md`\]\(install\/ATTACH\.md\)/g, "`npx apex-agent attach`"],
  [/\[`build\/BUILD-MASTER-PROMPT\.md`\]\(build\/BUILD-MASTER-PROMPT\.md\)/g, "the build plan in the project repository"],
  [/\[`build\/TESTING\.md`\]\(build\/TESTING\.md\)/g, "the test plan in the project repository"],
  [/\[`build\/`\]\(build\/\)/g, "the project repository"],
  [/\[`runtime\/`\]\(runtime\/\)/g, "the runtime package"],
  [/`\.\.\/build\/[\w.-]+`/g, "the build plan in the project repository"],
  [/`\.\.\/install\/ATTACH\.md`/g, "`npx apex-agent attach`"],
  [/`install\/ATTACH\.md`/g, "`npx apex-agent attach`"],
  [/`build\/BUILD-MASTER-PROMPT\.md`/g, "the build plan in the project repository"],
  [/`build\/TESTING\.md`/g, "the test plan in the project repository"],
  [/`runtime\/\.apex\/?`/g, "the runtime package's own ledger"],
  [/^.*Building the enforced runtime.*$/gm, ""],
  [/^- Deeper integration.*install\/ATTACH.*$/gm, "- Deeper integration, one command: `npx apex-agent attach`"],
]

function rewriteShippedCopy(file) {
  if (!file.endsWith(".md")) return
  const before = fs.readFileSync(file, "utf8")
  let after = before
  for (const [pattern, replacement] of REWRITES) after = after.replace(pattern, replacement)
  if (after !== before) fs.writeFileSync(file, after, "utf8")
}

function rewriteAll(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) rewriteAll(full)
    else rewriteShippedCopy(full)
  }
}

function main() {
  // `payload/opencode/` holds host companions authored here, not copied from the project
  // root — preserve it across a rebuild.
  const companions = path.join(PAYLOAD, "opencode")
  const keep = fs.existsSync(companions) ? fs.readdirSync(companions) : null

  for (const dir of COPY_DIRS) {
    const from = path.join(PROJECT, dir)
    if (!fs.existsSync(from)) continue
    fs.rmSync(path.join(PAYLOAD, dir), { recursive: true, force: true })
    copyDir(from, path.join(PAYLOAD, dir))
  }
  for (const file of COPY_FILES) {
    const from = path.join(PROJECT, file)
    if (fs.existsSync(from)) fs.copyFileSync(from, path.join(PAYLOAD, file))
  }

  rewriteAll(PAYLOAD)

  if (keep) console.log(`payload/opencode preserved (${keep.length} entries)`)
  console.log("payload synced and rewritten for shipping, from", path.relative(process.cwd(), PROJECT))
}

if (import.meta.url === `file://${process.argv[1]?.split(path.sep).join("/")}` || process.argv[1]?.endsWith("sync-payload.mjs")) {
  main()
}
