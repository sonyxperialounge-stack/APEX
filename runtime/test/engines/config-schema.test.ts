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
import { VERIFY_TYPES, type MemoryRecordV1 } from "../../src/core/types.ts"
import { selectMemory } from "../../src/engines/memory-librarian.ts"
import { openTrustStore, hashSkillContent } from "../../src/stores/trust-store.ts"
import { readJson } from "../../src/core/json.ts"
import { setLogDir } from "../../src/core/log.ts"
import { toIsoString } from "../../src/core/ids.ts"

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..")
const TEMPLATE = path.join(PROJECT, "templates", "config.json")

let dir: string
let home: string
let savedApexHome: string | undefined
beforeEach(async () => {
  dir = await fsp.mkdtemp(path.join(os.tmpdir(), "apex-schema-"))
  home = await fsp.mkdtemp(path.join(os.tmpdir(), "apex-schema-home-"))
  savedApexHome = process.env.APEX_HOME
  process.env.APEX_HOME = home // hermetic global layer — never the developer's real home
  setLogDir(path.join(dir, "logs"))
  await fsp.mkdir(path.join(dir, ".apex"))
})
afterEach(async () => {
  if (savedApexHome === undefined) delete process.env.APEX_HOME
  else process.env.APEX_HOME = savedApexHome
  setLogDir(null)
  await fsp.rm(dir, { recursive: true, force: true })
  await fsp.rm(home, { recursive: true, force: true })
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
    for (const section of ["limits", "council", "delegation", "context", "skills", "capabilities", "memory", "archive", "learning"] as const) {
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

// ── WP-074 — the V4 config surface (44 §§1–6; CFG-T01..T09) ─────────────────

describe("WP-074 config surface", () => {
  async function writeProject(raw: Record<string, unknown>): Promise<void> {
    await fsp.writeFile(path.join(dir, ".apex", "config.json"), JSON.stringify(raw, null, 2))
  }
  async function writeGlobal(raw: Record<string, unknown>): Promise<void> {
    await fsp.writeFile(path.join(home, "config.json"), JSON.stringify(raw, null, 2))
  }

  test("CFG-T01 — a V3 config loads unchanged and gains V4 defaults", async () => {
    await writeProject({
      _comment: "an untouched V3 file",
      projectRoot: dir,
      autonomy: "GUARDED",
      doNotTouch: ["config/prod.yaml"],
    })
    const ledger = new Ledger(dir)
    const config = await ledger.loadConfig()
    assert.deepEqual(ledger.configIssues, [], "a V3 file is not a problem")
    assert.deepEqual(config.doNotTouch, ["config/prod.yaml"], "V3 keys keep their meaning")
    // Defaults for every V4 group come from the resolver, not the file.
    assert.equal(config.memory?.useGlobal, true)
    assert.equal(config.memory?.globalCategories.relationship, false)
    assert.equal(config.archive?.detail, "compact")
    assert.deepEqual(config.learning?.extractOn, ["gate_pass", "session_end"])
    assert.equal(config.skills.projectSkills, "off")
    assert.equal(config.context.learnedContextTokens, 3000)
    assert.equal(config.context.freezeHotSnapshot, true)
    assert.equal(config.capabilities.discovery, "auto")
  })

  test("CFG-T02 — migration adds only schemaVersion, preserving comments and order", async () => {
    const original = {
      _comment: "hand-written V3 config",
      projectRoot: dir,
      autonomy: "GUARDED",
      doNotTouch: ["config/prod.yaml"],
    }
    await writeProject(original)
    const ledger = new Ledger(dir)
    await ledger.loadConfig()

    const file = path.join(dir, ".apex", "config.json")
    const migrated = await readJson<Record<string, unknown>>(file, {})
    assert.equal(migrated.schemaVersion, 2, "the generation marker is written")
    assert.equal(migrated._comment, "hand-written V3 config", "comment keys survive")
    const keys = Object.keys(migrated)
    assert.deepEqual(
      keys.slice(1),
      Object.keys(original),
      "schemaVersion is prepended; every existing key keeps its order",
    )

    const bak = await readJson<Record<string, unknown> | null>(`${file}.apex.bak`, null)
    assert.ok(bak, "a backup was written")
    assert.equal(bak?.schemaVersion, undefined, "the backup is the ORIGINAL file")
    assert.equal(bak?._comment, "hand-written V3 config")

    const journal = await readJson<{ entries: Array<{ id: string; status: string; store: string }> }>(
      path.join(dir, ".apex", "migrations", "journal.json"),
      { entries: [] },
    )
    const mig = journal.entries.find((e) => e.id.startsWith("MIG-config"))
    assert.ok(mig, "a MIG record was journalled")
    assert.equal(mig?.status, "COMPLETED")
    assert.equal(mig?.store, "config")

    // Idempotent: a second load rewrites nothing and journals nothing new.
    const count = journal.entries.length
    const before = await fsp.readFile(file, "utf8")
    const ledger2 = new Ledger(dir)
    await ledger2.loadConfig()
    assert.equal(await fsp.readFile(file, "utf8"), before, "an already-migrated file is untouched")
    const journal2 = await readJson<{ entries: unknown[] }>(path.join(dir, ".apex", "migrations", "journal.json"), { entries: [] })
    assert.equal(journal2.entries.length, count, "no duplicate migration record")
  })

  test("CFG-T03 — global FULL_AUTO cannot widen a project GUARDED", async () => {
    await writeGlobal({ autonomy: "FULL_AUTO" })
    await writeProject({ autonomy: "GUARDED" })
    const config = await new Ledger(dir).loadConfig()
    assert.equal(config.autonomy, "GUARDED", "the more restrictive layer wins")

    // And the reverse direction: a project cannot escape a MANUAL global either.
    await writeGlobal({ autonomy: "MANUAL" })
    await writeProject({ autonomy: "FULL_AUTO" })
    const narrowed = await new Ledger(dir).loadConfig()
    assert.equal(narrowed.autonomy, "MANUAL", "safety cannot be widened by the weaker scope")
  })

  test("CFG-T04 — doNotTouch unions across layers; allowedPaths intersects", async () => {
    await writeGlobal({ doNotTouch: [".env", "secrets/"], allowedPaths: ["src", "docs"] })
    await writeProject({ doNotTouch: ["config/prod.yaml", ".env"], allowedPaths: ["src", "tests"] })
    const config = await new Ledger(dir).loadConfig()
    assert.deepEqual(
      [...config.doNotTouch].sort(),
      [".env", "config/prod.yaml", "secrets/"],
      "protected paths are the UNION — neither layer can unprotect what the other protected",
    )
    assert.deepEqual(config.allowedPaths, ["src"], "allowed paths INTERSECT — the narrower permission wins")

    // A silent global layer contributes nothing: the project's explicit list stands.
    await writeGlobal({})
    await writeProject({ allowedPaths: ["src"] })
    const solo = await new Ledger(dir).loadConfig()
    assert.deepEqual(solo.allowedPaths, ["src"], "one explicit layer replaces the default outright")
  })

  test("CFG-T05 — an unknown key is reported with its source file and a suggestion", async () => {
    await writeProject({ projectRoot: dir, doNotTuoch: ["x"], limits: { handoffAtContexPct: 80 } })
    const ledger = new Ledger(dir)
    await ledger.loadConfig()
    const projectFile = path.join(dir, ".apex", "config.json")
    assert.ok(
      ledger.configIssues.some((i) => i.includes(projectFile) && i.includes("doNotTuoch") && i.includes('did you mean "doNotTouch"')),
      `top-level unknown names file + suggestion; got ${JSON.stringify(ledger.configIssues)}`,
    )
    assert.ok(
      ledger.configIssues.some((i) => i.includes("limits.handoffAtContexPct") && i.includes('did you mean "limits.handoffAtContextPct"')),
      `nested unknown names file + suggestion; got ${JSON.stringify(ledger.configIssues)}`,
    )

    // The global file's unknown keys are reported against the GLOBAL path.
    await writeGlobal({ skills: { maxBodiesPrTask: 3 } })
    const ledger2 = new Ledger(dir)
    await ledger2.loadConfig()
    assert.ok(
      ledger2.configIssues.some(
        (i) => i.includes(path.join(home, "config.json")) && i.includes("skills.maxBodiesPrTask"),
      ),
      `global unknown keys carry the global file path; got ${JSON.stringify(ledger2.configIssues)}`,
    )
  })

  test("CFG-T06 — memory.useGlobal:false yields zero global records in selection", async () => {
    await writeProject({ projectRoot: dir, memory: { useGlobal: false } })
    const config = await new Ledger(dir).loadConfig()
    const now = toIsoString(Date.now())
    const record = (id: string, scope: MemoryRecordV1["scope"]): MemoryRecordV1 => ({
      schemaVersion: 1,
      id,
      scope,
      kind: "fact",
      semanticKey: "fact.test",
      text: `${id} text`,
      status: "active",
      confidence: 0.8,
      provenance: [{ sourceType: "explicit_user", observedAt: now }],
      createdAt: now,
      updatedAt: now,
      scanner: { verdict: "allow", reasons: [] },
      revision: 1,
    })
    const out = selectMemory(
      [record("MEM-global-1", { kind: "global" }), record("MEM-project-1", { kind: "project", projectKey: "prj_x" })],
      { projectKey: "prj_x", useGlobal: config.memory?.useGlobal },
      "",
      toIsoString(Date.now()),
    )
    assert.deepEqual(
      out.records.filter((r) => r.scope.kind === "global"),
      [],
      "no global record reaches the selection when the project says useGlobal:false",
    )
    assert.ok(out.records.some((r) => r.id === "MEM-project-1"), "the project's own records still serve")
    assert.ok(out.skipped.some((s) => s.id === "MEM-global-1" && s.reason.includes("useGlobal")), "the skip names the rule")
  })

  test("CFG-T07 — projectSkills defaults to off and a project skill cannot self-trust", async () => {
    const config = await new Ledger(dir).loadConfig()
    assert.equal(config.skills.projectSkills, "off", "repository skills are data by default")

    const skillFile = path.join(dir, "SKILL.md")
    await fsp.writeFile(skillFile, "# Goal\nnothing secret\n")
    const trust = openTrustStore(home)
    const hash = await hashSkillContent(skillFile)
    await assert.rejects(
      trust.grant({ skillId: "sneaky", contentHash: hash, tier: "PROJECT", grantedBy: "the skill file itself" }, await fsp.readFile(skillFile, "utf8")),
      (e: unknown) => e instanceof Error && /cannot grant itself trust/i.test(e.message),
      "CFG-T07: a repository-supplied SKILL.md never grants itself trust",
    )
  })

  test("CFG-T08 — a trust grant is refused without explicit approval, FULL_AUTO included", async () => {
    await writeProject({ projectRoot: dir, autonomy: "FULL_AUTO" })
    await new Ledger(dir).loadConfig() // FULL_AUTO is the operating mode; the store does not care

    const trust = openTrustStore(home, {
      scanner: () => ({ verdict: "review", findings: [{ rule: "installs-dependency", severity: "warn", excerpt: "" }] }),
    })
    const skillFile = path.join(dir, "SKILL.md")
    await fsp.writeFile(skillFile, "installs a dependency\n")
    const content = await fsp.readFile(skillFile, "utf8")
    const hash = await hashSkillContent(skillFile)
    await assert.rejects(
      trust.grant({ skillId: "a", contentHash: hash, tier: "USER", grantedBy: "model-session" }, content),
      (e: unknown) => e instanceof Error && /explicit/i.test(e.message),
      "no unattended path to trust exists in any autonomy mode (44 §5)",
    )
    const granted = await trust.grant(
      { skillId: "a", contentHash: hash, tier: "USER", grantedBy: "cli:user", override: true, justification: "reviewed by the owner" },
      content,
    )
    assert.equal(granted.granted, true)
    assert.equal(granted.justification, "reviewed by the owner", "the human's decision is on record")
  })

  test("CFG-T09 — ResolvedConfig reports the originating layer for every key", async () => {
    await writeGlobal({ context: { budgetTokens: 4000 }, doNotRead: [".env"] })
    await writeProject({ projectRoot: dir, doNotRead: [".env.local"], memory: { writePolicy: "stage" } })
    const { config, layers } = await new Ledger(dir).loadResolved()

    assert.equal(config.context.budgetTokens, 4000)
    assert.equal(layers.context, "global")
    assert.equal(layers.memory, "project", "the project set memory.writePolicy")
    assert.equal(layers.skills, "default")
    assert.equal(layers.doNotRead, "project+global", "a union names BOTH layers")
    assert.equal(layers.autonomy, "default")
    assert.equal(layers.projectRoot, "project")
    assert.ok(Object.keys(layers).length >= Object.keys(DEFAULT_CONFIG).length, "every key has a layer")
  })
})
