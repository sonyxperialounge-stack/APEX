import { test, describe, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import fsp from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import {
  parseJsonLenient,
  serialiseChecked,
  writeJson,
  writeText,
  readTextOrNull,
  readJson,
  backup,
  mergeConfigObjects,
  mergeConfigFile,
} from "../../src/core/json.ts"
import { toJsonPath } from "../../src/core/paths.ts"

let dir: string

beforeEach(async () => {
  dir = await fsp.mkdtemp(path.join(os.tmpdir(), "apex-json-"))
})
afterEach(async () => {
  await fsp.rm(dir, { recursive: true, force: true })
})

describe("parseJsonLenient", () => {
  test("plain JSON", () => {
    assert.deepEqual(parseJsonLenient('{"a":1}'), { a: 1 })
  })

  test("strips a BOM", () => {
    assert.deepEqual(parseJsonLenient('\uFEFF{"a":1}'), { a: 1 })
  })

  test("strips line comments", () => {
    assert.deepEqual(parseJsonLenient('{\n  // a comment\n  "a": 1\n}'), { a: 1 })
  })

  test("strips block comments", () => {
    assert.deepEqual(parseJsonLenient('{ /* hi */ "a": 1 }'), { a: 1 })
  })

  test("strips trailing commas", () => {
    assert.deepEqual(parseJsonLenient('{"a":1,}'), { a: 1 })
    assert.deepEqual(parseJsonLenient('{"a":[1,2,]}'), { a: [1, 2] })
  })

  test("does NOT strip comment-like text inside strings", () => {
    const v = parseJsonLenient<{ url: string }>('{"url":"https://x.dev/a"}')
    assert.equal(v.url, "https://x.dev/a")
  })

  test("throws a useful error on real garbage", () => {
    assert.throws(() => parseJsonLenient("{not json"), /Invalid JSON/)
  })
})

// ── INS-004: the bug that silently disabled the previous version of this system ──
describe("INS-004 — Windows path regression", () => {
  const WINDOWS_PATHS = {
    python: "C:\\Users\\lalit\\AppData\\Local\\Programs\\Python\\Python312\\python.exe",
    src: "D:\\multiworker opencode\\Army-V3\\runtime",
    unc: "\\\\server\\share\\project",
  }

  test("serialiseChecked escapes backslashes and round-trips", () => {
    const text = serialiseChecked(WINDOWS_PATHS)
    assert.doesNotThrow(() => JSON.parse(text))
    assert.deepEqual(JSON.parse(text), WINDOWS_PATHS)
  })

  test("emitted JSON contains no lone backslash escape", () => {
    const text = serialiseChecked(WINDOWS_PATHS)
    // A single backslash followed by a letter that is not a valid JSON escape
    const lone = /(?<!\\)\\(?![\\"/bfnrtu])/.exec(text.replace(/\\\\/g, ""))
    assert.equal(lone, null, `lone backslash escape found in: ${text}`)
  })

  test("toJsonPath produces forward slashes", () => {
    assert.equal(toJsonPath(WINDOWS_PATHS.python), "C:/Users/lalit/AppData/Local/Programs/Python/Python312/python.exe")
  })

  test("the exact Army-V2 failure is now impossible", async () => {
    // Army-V2 shipped this by string concatenation. It is invalid JSON.
    const broken = `{"command": ["${WINDOWS_PATHS.python}"]}`
    assert.throws(() => JSON.parse(broken), "the historical bug reproduces")

    // The sanctioned path cannot produce it.
    const file = path.join(dir, "opencode.json")
    await writeJson(file, { command: [WINDOWS_PATHS.python] })
    const back = JSON.parse(fs.readFileSync(file, "utf8"))
    assert.deepEqual(back.command, [WINDOWS_PATHS.python])
  })

  test("writeJson re-reads and verifies what landed on disk", async () => {
    const file = path.join(dir, "nested", "deep", "config.json")
    await writeJson(file, { paths: WINDOWS_PATHS, n: 1 })
    assert.deepEqual(await readJson(file, null), { paths: WINDOWS_PATHS, n: 1 })
  })
})

describe("writes are redacted (CORE-005)", () => {
  test("writeText redacts", async () => {
    const file = path.join(dir, "log.md")
    await writeText(file, "FAILED: token=ghp_AAaa11BBbb22CCcc33DDdd44EEee55FF")
    const back = await readTextOrNull(file)
    assert.ok(back && !back.includes("ghp_AAaa11"))
    assert.ok(back.includes("[REDACTED]"))
  })

  test("writeJson redacts nested values", async () => {
    const file = path.join(dir, "c.json")
    await writeJson(file, { env: { TOKEN: "sk-ant-api03-AAaa11BBbb22CCcc33DDdd" }, ok: true })
    const raw = await readTextOrNull(file)
    assert.ok(raw && !raw.includes("sk-ant-api03"))
    const parsed = await readJson<{ ok: boolean }>(file, { ok: false })
    assert.equal(parsed.ok, true, "non-secret values survive")
  })
})

describe("backup", () => {
  test("returns null when there is nothing to back up", async () => {
    assert.equal(await backup(path.join(dir, "absent.json")), null)
  })

  test("copies byte-for-byte (INS-005)", async () => {
    const file = path.join(dir, "a.json")
    const original = '{\n  "a": 1,\n  "b": "x"\n}\n'
    await fsp.writeFile(file, original, "utf8")
    const bak = await backup(file)
    assert.ok(bak)
    assert.equal(await readTextOrNull(bak), original)
  })
})

describe("mergeConfigObjects — INS-003", () => {
  test("adds absent keys", () => {
    const { merged, added } = mergeConfigObjects({ a: 1 }, { b: 2 })
    assert.deepEqual(merged, { a: 1, b: 2 })
    assert.deepEqual(added, ["b"])
  })

  test("LEAVES an existing scalar alone", () => {
    const { merged, added } = mergeConfigObjects({ snapshot: false }, { snapshot: true })
    assert.equal(merged.snapshot, false, "the user set this deliberately")
    assert.deepEqual(added, [])
  })

  test("unions arrays, existing order first", () => {
    const { merged } = mergeConfigObjects({ plugin: ["their-plugin"] }, { plugin: ["apex-agent@1"] })
    assert.deepEqual(merged.plugin, ["their-plugin", "apex-agent@1"])
  })

  test("does not duplicate an array entry that is already present", () => {
    const { merged } = mergeConfigObjects({ plugin: ["apex-agent@1"] }, { plugin: ["apex-agent@1"] })
    assert.deepEqual(merged.plugin, ["apex-agent@1"])
  })

  test("shallow-merges objects with existing winning", () => {
    const { merged } = mergeConfigObjects(
      { mcp: { theirs: { a: 1 }, apex: { keep: "mine" } } },
      { mcp: { apex: { keep: "ours" } } },
    )
    assert.deepEqual(merged.mcp, { theirs: { a: 1 }, apex: { keep: "mine" } })
  })

  test("preserves every unknown key byte-for-byte", () => {
    const existing = { theme: "dark", model: "x/y", weird: { deep: [1, { z: true }] } }
    const { merged } = mergeConfigObjects(existing, { plugin: ["apex-agent@1"] })
    assert.deepEqual(merged.weird, existing.weird)
    assert.equal(merged.theme, "dark")
    assert.equal(merged.model, "x/y")
  })
})

describe("mergeConfigFile", () => {
  test("merges into a rich pre-existing config and backs it up", async () => {
    const file = path.join(dir, "opencode.json")
    const existing = {
      theme: "tokyonight",
      model: "provider/model",
      mcp: { other: { type: "local", command: ["x"] } },
      permission: { edit: "allow" },
    }
    await fsp.writeFile(file, JSON.stringify(existing, null, 2), "utf8")

    const report = await mergeConfigFile(file, {
      plugin: ["apex-agent@1"],
      instructions: ["AGENTS.md"],
      snapshot: true,
    })

    const after = await readJson<Record<string, unknown>>(file, {})
    assert.equal(after.theme, "tokyonight")
    assert.equal(after.model, "provider/model")
    assert.deepEqual(after.mcp, existing.mcp)
    assert.deepEqual(after.permission, existing.permission)
    assert.deepEqual(after.plugin, ["apex-agent@1"])
    assert.equal(after.snapshot, true)
    assert.deepEqual(report.keysAdded.sort(), ["instructions", "plugin", "snapshot"])
    assert.ok(report.backup)
  })

  test("creates the file when absent, with no backup", async () => {
    const file = path.join(dir, "new.json")
    const report = await mergeConfigFile(file, { plugin: ["apex-agent@1"] })
    assert.equal(report.backup, null)
    assert.deepEqual(await readJson(file, {}), { plugin: ["apex-agent@1"] })
  })

  test("tolerates a config with comments and trailing commas", async () => {
    const file = path.join(dir, "commented.json")
    await fsp.writeFile(file, '{\n  // mine\n  "theme": "dark",\n}\n', "utf8")
    await mergeConfigFile(file, { snapshot: true })
    const after = await readJson<Record<string, unknown>>(file, {})
    assert.equal(after.theme, "dark")
    assert.equal(after.snapshot, true)
  })
})
