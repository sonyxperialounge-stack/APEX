#!/usr/bin/env node
/**
 * APEX CLI entry point.
 *
 * Prefers the compiled `dist/` build, which is what ships. Falls back to the TypeScript
 * sources when running from a checkout.
 *
 * The compiled build is NOT optional: Node refuses to strip types for files under
 * node_modules, so a package that shipped raw .ts would install fine and then fail on
 * first run. That is precisely the mock-green / shipped-broken failure this project
 * exists to prevent, so it has a live install test.
 */

import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const compiled = path.join(here, "..", "dist", "cli", "index.js")
const sources = path.join(here, "..", "src", "cli", "index.ts")

const entry = existsSync(compiled) ? compiled : sources

const { main } = await import(pathToFileURL(entry).href)

main(process.argv.slice(2)).catch((err) => {
  process.stderr.write(`apex: ${err?.message ?? String(err)}\n`)
  process.exitCode = 1
})
