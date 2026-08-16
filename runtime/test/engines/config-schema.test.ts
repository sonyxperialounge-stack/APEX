/**
 * Template ↔ code schema agreement.
 *
 * The shipped template used snake_case while the code read camelCase. A user who filled in
 * `do_not_touch` had their protected paths dropped in SILENCE — `config/prod.yaml` became
 * writable and `.env` readable, with no warning anywhere. That is the worst failure this
 * system can have: it is the exact thing it exists to prevent, in its own configuration.
 */

import { test, describe, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import fsp from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { Ledger, DEFAULT_CONFIG } from "../../src/engines/ledger.ts"
import { Governor } from "../../src/engines/governor.ts"
import { VERIFY_TYPES } from "../../src/core/types.ts"
import { setLogDir } from "../../src/core/log.ts"

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..")
const TEMPLATE = path.join(PROJECT, "templates", "config.json")

let dir: string
beforeEach(async () => {
  dir = await fsp.mkdtemp(path.join(os.tmpdir(), "apex-schema-"))
  setLogDir(path.join(dir, "logs"))
  await fsp.mkdir(path.join(dir, ".apex"))
})
afterEach(async () => {
  setLogDir(null)
  await fsp.rm(dir, { recursive: true, force: true })
})

const template = () => JSON.parse(fs.readFileSync(TEMPLATE, "utf8")) as Record<string, unknown>

describe("the shipped template matches ApexConfig", () => {
  test("every template key exists in ApexConfig", () => {
    const keys = Object.keys(template()).filter((k) => !k.startsWith("_"))
    const known = new Set(Object.keys(DEFAULT_CONFIG))
    const unknown = keys.filter((k) => !known.has(k))
    assert.deepEqual(unknown, [], `template keys APEX does not read: ${unknown.join(", ")}`)
  })

  test("every ApexConfig key appears in the template", () => {
    const keys = new Set(Object.keys(template()))
    const missing = Object.keys(DEFAULT_CONFIG).filter((k) => !keys.has(k))
    assert.deepEqual(missing, [], `config keys a user could not discover from the template: ${missing.join(", ")}`)
  })

  test("template verify tiers are real tier names", () => {
    const tiers = Object.keys((template().verifyCommands ?? {}) as Record<string, unknown>)
    const invalid = tiers.filter((t) => !(VERIFY_TYPES as readonly string[]).includes(t))
    assert.deepEqual(invalid, [], `not verify tiers: ${invalid.join(", ")}`)
  })

  test("nested sections match too", () => {
    const t = template() as Record<string, Record<string, unknown>>
    for (const section of ["limits", "council", "delegation"] as const) {
      const expected = new Set(Object.keys((DEFAULT_CONFIG as unknown as Record<string, object>)[section] ?? {}))
      const unknown = Object.keys(t[section] ?? {}).filter((k) => !k.startsWith("_") && !expected.has(k))
      assert.deepEqual(unknown, [], `${section}: ${unknown.join(", ")}`)
    }
  })

  test("a user who copies the template gets a config that actually binds", async () => {
    const t = template()
    t.projectRoot = dir
    ;(t as Record<string, unknown>).doNotTouch = ["config/prod.yaml"]
    ;(t as Record<string, unknown>).doNotRead = [".env"]
    ;(t as Record<string, unknown>).autonomy = "AUTO"
    await fsp.writeFile(path.join(dir, ".apex", "config.json"), JSON.stringify(t, null, 2))

    const ledger = new Ledger(dir)
    const config = await ledger.loadConfig()
    assert.deepEqual(config.doNotTouch, ["config/prod.yaml"], "the user's protected paths must survive")
    assert.deepEqual(config.doNotRead, [".env"])
    assert.deepEqual(ledger.configIssues, [], "a clean template must produce zero warnings")

    const gov = new Governor(config)
    assert.equal(gov.decide({ kind: "write", path: "config/prod.yaml" }).allowed, false)
    assert.equal(gov.decide({ kind: "read", path: ".env" }).allowed, false)
  })
})

describe("an unrecognised config key is REPORTED, never silently dropped", () => {
  async function load(raw: Record<string, unknown>) {
    await fsp.writeFile(path.join(dir, ".apex", "config.json"), JSON.stringify(raw, null, 2))
    const ledger = new Ledger(dir)
    return { config: await ledger.loadConfig(), issues: ledger.configIssues }
  }

  test("the old snake_case template still protects the user, and says so", async () => {
    const { config, issues } = await load({
      project_root: dir,
      autonomy: "AUTO",
      do_not_touch: ["config/prod.yaml"],
      do_not_read: [".env"],
    })
    assert.deepEqual(config.doNotTouch, ["config/prod.yaml"], "a legacy key must not lose the user's intent")
    assert.deepEqual(config.doNotRead, [".env"])
    assert.ok(issues.some((i) => i.includes("do_not_touch") && i.includes("doNotTouch")))
    assert.equal(new Governor(config).decide({ kind: "write", path: "config/prod.yaml" }).allowed, false)
  })

  test("legacy verify tiers map to real ones and are reported", async () => {
    const { config, issues } = await load({ verify_commands: { test: "pytest", run: "npm start" } })
    assert.equal(config.verifyCommands.suite, "pytest")
    assert.equal(config.verifyCommands.runtime, "npm start")
    assert.ok(issues.some((i) => i.includes('"test"') && i.includes("suite")))
  })

  test("a genuine typo is reported as IGNORED, not swallowed", async () => {
    const { issues } = await load({ doNotTuoch: ["x"] })
    assert.ok(
      issues.some((i) => i.includes("doNotTuoch") && i.includes("IGNORED")),
      `a misspelled protected-path key must be visible; got ${JSON.stringify(issues)}`,
    )
  })

  test("nested legacy keys are migrated and reported", async () => {
    const { config, issues } = await load({ limits: { max_subagent_retries: 5 } })
    assert.equal(config.limits.maxSubagentRetries, 5)
    assert.ok(issues.some((i) => i.includes("limits.max_subagent_retries")))
  })

  test("documentation keys starting with _ are not reported", async () => {
    const { issues } = await load({ _comment: "hello", autonomy: "AUTO" })
    assert.deepEqual(issues, [])
  })

  test("a correct config produces no issues at all", async () => {
    const { issues } = await load({ projectRoot: dir, autonomy: "GUARDED", doNotTouch: ["a"] })
    assert.deepEqual(issues, [])
  })
})
