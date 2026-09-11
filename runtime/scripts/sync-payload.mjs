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
const COPY_FILES = ["START-HERE.md", "README.md", "EXAMPLES.md", "LEGAL-NOTICE.md"]

/**
 * Verbatim payload subdirectories that are AUTHORED here (not copied from the project):
 * the seed skill library (54 §7) and the host companions. They are preserved across a
 * rebuild, never clobbered by a copy from the project root.
 */
const PRESERVE_DIRS = ["skills", "opencode"]

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
  // WP-075 — the changelog and the repo's docs/ folder stay in the repository; the
  // shipped copy points at the repository instead of at files that do not travel.
  [/\[`CHANGELOG\.md`\]\(CHANGELOG\.md\)/g, "the changelog in the project repository"],
  [
    /troubleshooting table in \[`install\/ATTACH\.md`\]\(install\/ATTACH\.md\)/g,
    "troubleshooting table in the project repository",
  ],
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
  // WP-082 — the "What is in here" tree must describe the folder it ships in. The
  // changelog, docs/, build/ and install/ stay in the repository; a tree that lists
  // them inside the package is a small lie the PKG-T01 test is built to catch.
  [/CHANGELOG\.md[ ]+what changed in each release, in plain language[^\r\n]*\r?\n/, ""],
  [/docs\/[ ]+Schema changelog and release notes[^\r\n]*\r?\n[ ]+SCHEMA-CHANGELOG\.md[^\r\n]*\r?\n\r?\n/, ""],
  [
    /build\/[ ]+The full plan for the L1\/L2 runtime[^\r\n]*\r?\n[ ]+for any capable AI to build it[^\r\n]*\r?\n[ ]+BUILD-MASTER-PROMPT\.md[^\r\n]*\r?\n\r?\ninstall\/[ ]+How to attach at each level[^\r\n]*\r?\n/,
    "(The full build plan, the per-store schema changelog and the per-host\n" +
      "install guides live in the project repository, not in this package.)\n",
  ],
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

/** The authored (non-copied) payload subdirectories, preserved across the rebuild. */
function preserve(entries) {
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((n) => PRESERVE_DIRS.includes(n))
}

function main() {
  // `payload/opencode/` and `payload/skills/` hold content authored here, not copied
  // from the project root — preserve them across a rebuild.
  const keep = fs.existsSync(PAYLOAD)
    ? (() => {
        const entries = fs.readdirSync(PAYLOAD, { withFileTypes: true })
        return preserve(entries).map((n) => path.join(PAYLOAD, n))
      })()
    : []

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

  if (keep)
    console.log(`payload preserved (${keep.length} authored dirs: ${keep.map((p) => path.basename(p)).join(", ")})`)
  console.log("payload synced and rewritten for shipping, from", path.relative(process.cwd(), PROJECT))
}

if (import.meta.url === `file://${process.argv[1]?.split(path.sep).join("/")}` || process.argv[1]?.endsWith("sync-payload.mjs")) {
  main()
}
