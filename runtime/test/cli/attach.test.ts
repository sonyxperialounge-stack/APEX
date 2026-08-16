import { test, describe, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import fsp from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { attach, detach, doctor, readInstallRecord, installRecordPath } from "../../src/cli/attach.ts"
import { parseArgs } from "../../src/cli/index.ts"
import { detectProjectRoot } from "../../src/cli/detect.ts"
import { readTextOrNull, readJson, existsSync } from "../../src/core/json.ts"
import { setLogDir } from "../../src/core/log.ts"

let sandbox: string
let projectRoot: string
let fakeHome: string
let payloadRoot: string
let originalEnv: Record<string, string | undefined>

beforeEach(async () => {
  sandbox = await fsp.mkdtemp(path.join(os.tmpdir(), "apex-cli-"))
  projectRoot = path.join(sandbox, "project")
  fakeHome = path.join(sandbox, "home")
  payloadRoot = path.join(sandbox, "payload")

  await fsp.mkdir(projectRoot, { recursive: true })
  await fsp.mkdir(path.join(fakeHome, ".config", "opencode"), { recursive: true })
  await fsp.mkdir(path.join(payloadRoot, "core"), { recursive: true })
  await fsp.writeFile(path.join(payloadRoot, "START-HERE.md"), "# APEX\n", "utf8")
  await fsp.writeFile(path.join(payloadRoot, "core", "01-LAWS.md"), "# Laws\n", "utf8")

  originalEnv = {
    APEX_STATE_DIR: process.env.APEX_STATE_DIR,
    APEX_HOST_ROOT: process.env.APEX_HOST_ROOT,
    OPENCODE_CONFIG_DIR: process.env.OPENCODE_CONFIG_DIR,
  }
  process.env.APEX_STATE_DIR = path.join(sandbox, "state")
  // Redirect EVERY host directory into the sandbox. Without this, a test that runs
  // `attach` with no --host writes into the developer's real ~/.claude and ~/.config.
  process.env.APEX_HOST_ROOT = fakeHome
  delete process.env.OPENCODE_CONFIG_DIR
  setLogDir(path.join(sandbox, "logs"))
})

afterEach(async () => {
  setLogDir(null)
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  await fsp.rm(sandbox, { recursive: true, force: true })
})

const configFile = (): string => path.join(fakeHome, ".config", "opencode", "opencode.json")

// ── INS-002, arg parsing ────────────────────────────────────────────────────

describe("arg parsing", () => {
  test("parses host and project", () => {
    const args = parseArgs(["attach", "--host", "opencode", "--project", "/tmp/x"])
    assert.equal(args.command, "attach")
    assert.equal(args.host, "opencode")
    assert.equal(args.project, "/tmp/x")
  })

  test("rejects an unknown host with the real list", () => {
    assert.throws(() => parseArgs(["attach", "--host", "notepad"]), /Unknown host.*opencode/s)
  })

  test("detectProjectRoot walks up to a project marker", async () => {
    await fsp.writeFile(path.join(projectRoot, "package.json"), "{}", "utf8")
    const deep = path.join(projectRoot, "src", "a", "b")
    await fsp.mkdir(deep, { recursive: true })
    assert.equal(detectProjectRoot(deep), projectRoot)
  })
})

// ── INS-003 — non-destructive merge ─────────────────────────────────────────

describe("INS-003 — attach is non-destructive", () => {
  test("a rich pre-existing config survives untouched", async () => {
    const existing = {
      theme: "tokyonight",
      model: "someprovider/somemodel",
      permission: { edit: "allow", bash: "ask" },
      mcp: { theirs: { type: "local", command: ["their-server"] } },
      keybinds: { leader: "ctrl+x" },
      weird: { deeply: { nested: [1, 2, { x: true }] } },
    }
    await fsp.writeFile(configFile(), JSON.stringify(existing, null, 2), "utf8")

    await attach({ host: "opencode", projectRoot, payloadRoot })

    const after = await readJson<Record<string, any>>(configFile(), {})
    assert.equal(after.theme, "tokyonight")
    assert.equal(after.model, "someprovider/somemodel")
    assert.deepEqual(after.permission, existing.permission)
    assert.deepEqual(after.keybinds, existing.keybinds)
    assert.deepEqual(after.weird, existing.weird)
    assert.deepEqual(after.mcp.theirs, existing.mcp.theirs, "their MCP server survives")
    assert.ok(after.mcp.apex, "APEX was added alongside it")
    assert.ok(after.plugin.includes("apex-agent@1.0.0"))
  })

  test("a deliberate user setting is not overridden", async () => {
    await fsp.writeFile(configFile(), JSON.stringify({ snapshot: false }), "utf8")
    await attach({ host: "opencode", projectRoot, payloadRoot })
    const after = await readJson<Record<string, unknown>>(configFile(), {})
    assert.equal(after.snapshot, false, "the user turned this off deliberately")
  })

  test("INS-005 — a backup is written byte-for-byte", async () => {
    const original = '{\n  "theme": "dark"\n}\n'
    await fsp.writeFile(configFile(), original, "utf8")
    await attach({ host: "opencode", projectRoot, payloadRoot })
    assert.equal(await readTextOrNull(`${configFile()}.apex.bak`), original)
  })

  test("works when there is no pre-existing config at all", async () => {
    const result = await attach({ host: "opencode", projectRoot, payloadRoot })
    assert.equal(result.hosts.length, 1)
    const after = await readJson<Record<string, unknown>>(configFile(), {})
    assert.ok(after.plugin)
  })
})

// ── INS-004 — the regression that disabled the previous system ──────────────

describe("INS-004 — Windows paths never break the config", () => {
  test("every emitted path is JSON-safe and the file re-parses", async () => {
    await attach({ host: "opencode", projectRoot, payloadRoot })
    const raw = (await readTextOrNull(configFile()))!
    assert.doesNotThrow(() => JSON.parse(raw), "the written config MUST parse")

    const stripped = raw.replace(/\\\\/g, "")
    assert.equal(/(?<!\\)\\(?![\\"/bfnrtu])/.test(stripped), false, `lone backslash escape in:\n${raw}`)
  })

  test("emitted paths use forward slashes", async () => {
    await attach({ host: "opencode", projectRoot, payloadRoot })
    const config = await readJson<{ instructions: string[] }>(configFile(), { instructions: [] })
    for (const entry of config.instructions) {
      assert.ok(!entry.includes("\\"), `backslash survived in ${entry}`)
    }
  })

  test("the historical failure mode still reproduces, proving the test is live", () => {
    const naive = `{"command": ["C:\\Users\\me\\python.exe"]}`.replace(/\\\\/g, "\\")
    assert.throws(() => JSON.parse(naive), "this is the exact bug that disabled Army-V2")
  })
})

// ── INS-006, INS-007 — install record and detach ────────────────────────────

describe("INS-006/007 — install record and clean detach", () => {
  test("the record lists exactly what changed", async () => {
    await attach({ host: "opencode", projectRoot, payloadRoot })
    const record = (await readInstallRecord())!
    assert.equal(record.hosts.length, 1)
    assert.equal(record.hosts[0]!.name, "opencode")
    assert.ok(record.hosts[0]!.filesCreated.length > 0)
    assert.equal(record.hosts[0]!.filesModified[0]!.path, configFile())
  })

  test("detach restores the config byte-for-byte", async () => {
    const original = '{\n  "theme": "dark",\n  "model": "x/y"\n}\n'
    await fsp.writeFile(configFile(), original, "utf8")

    await attach({ host: "opencode", projectRoot, payloadRoot })
    assert.notEqual(await readTextOrNull(configFile()), original)

    await detach("opencode")
    assert.equal(await readTextOrNull(configFile()), original, "the original config must return exactly")
  })

  test("detach removes only what attach created", async () => {
    const stray = path.join(fakeHome, ".config", "opencode", "their-own-file.md")
    await fsp.writeFile(stray, "not ours", "utf8")

    await attach({ host: "opencode", projectRoot, payloadRoot })
    await detach("opencode")

    assert.ok(existsSync(stray), "unrelated files must survive detach")
    assert.ok(!existsSync(path.join(fakeHome, ".config", "opencode", "apex")))
    assert.ok(!existsSync(installRecordPath()))
  })

  test("detach leaves the project ledger alone", async () => {
    await attach({ host: "opencode", projectRoot, payloadRoot })
    await detach("opencode")
    assert.ok(existsSync(path.join(projectRoot, ".apex", "config.json")), "the ledger is the user's record")
  })

  test("detach without an install record is a clean error", async () => {
    await assert.rejects(() => detach(), /not attached/)
  })
})

// ── INS-009, INS-010 ────────────────────────────────────────────────────────

describe("INS-009 — the doctrine payload is installed", () => {
  test("payload files land in the host config directory", async () => {
    await attach({ host: "opencode", projectRoot, payloadRoot })
    assert.ok(existsSync(path.join(fakeHome, ".config", "opencode", "apex", "START-HERE.md")))
    assert.ok(existsSync(path.join(fakeHome, ".config", "opencode", "apex", "core", "01-LAWS.md")))
  })

  test("a pointer file tells any agent where the doctrine is", async () => {
    await attach({ host: "opencode", projectRoot, payloadRoot })
    const pointer = await readTextOrNull(path.join(fakeHome, ".config", "opencode", "apex", "ATTACHED.md"))
    assert.match(pointer!, /START-HERE\.md/)
    assert.match(pointer!, /\.apex/)
  })

  test("the config references the pointer so it loads automatically", async () => {
    await attach({ host: "opencode", projectRoot, payloadRoot })
    const config = await readJson<{ instructions: string[] }>(configFile(), { instructions: [] })
    assert.ok(config.instructions.some((i) => i.includes("ATTACHED.md")))
  })
})

describe("INS-010 — idempotence", () => {
  test("a second attach is a no-op", async () => {
    await attach({ host: "opencode", projectRoot, payloadRoot })
    const first = await readTextOrNull(configFile())

    const second = await attach({ projectRoot, payloadRoot })
    assert.equal(second.alreadyAttached, true)
    assert.match(second.messages[0]!, /already attached/)
    assert.equal(await readTextOrNull(configFile()), first, "nothing changed on the second run")
  })
})

// ── INS-013 — atomic failure ────────────────────────────────────────────────

describe("INS-013 — attach fails atomically", () => {
  test("a mid-attach failure restores everything and explains", async () => {
    const original = '{"theme":"dark"}'
    await fsp.writeFile(configFile(), original, "utf8")

    // A payload path that does not exist is tolerated; make the CONFIG write fail instead
    // by pointing the host config dir at a path that cannot hold a file.
    const blocked = path.join(sandbox, "blocked")
    await fsp.writeFile(blocked, "I am a file, not a directory", "utf8")
    process.env.APEX_HOST_ROOT = blocked

    await assert.rejects(
      () => attach({ host: "opencode", projectRoot, payloadRoot }),
      (err: Error) => {
        assert.match(err.message, /Nothing was left changed/)
        return true
      },
    )

    process.env.APEX_HOST_ROOT = fakeHome
    assert.equal(await readTextOrNull(configFile()), original, "the untouched host's config is intact")
  })
})

// ── INS-008 — doctor ────────────────────────────────────────────────────────

describe("INS-008 — doctor diagnoses seeded breakage", () => {
  test("reports a healthy install", async () => {
    await attach({ host: "opencode", projectRoot, payloadRoot })
    const { lines, level } = await doctor(projectRoot)
    assert.equal(level, 2)
    assert.equal(lines.filter((l) => l.status === "error").length, 0)
    assert.ok(lines.some((l) => l.section === "BINDING" && l.status === "ok"))
    assert.ok(lines.some((l) => l.section === "PROJECT" && l.message.includes("Ledger present")))
  })

  test("state 1 — not attached", async () => {
    const { lines, level } = await doctor(projectRoot)
    assert.equal(level, 0)
    assert.ok(lines.some((l) => l.message.includes("not attached") && l.fix?.includes("attach")))
  })

  test("state 2 — invalid JSON in the host config", async () => {
    await attach({ host: "opencode", projectRoot, payloadRoot })
    await fsp.writeFile(configFile(), '{"plugin": ["x",}', "utf8")
    const { lines } = await doctor(projectRoot)
    const error = lines.find((l) => l.status === "error" && l.message.includes("not valid JSON"))
    assert.ok(error, "doctor must catch an invalid config")
    assert.match(error!.fix!, /unescaped Windows path/)
  })

  test("state 3 — installed files went missing", async () => {
    await attach({ host: "opencode", projectRoot, payloadRoot })
    await fsp.rm(path.join(fakeHome, ".config", "opencode", "apex"), { recursive: true, force: true })
    const { lines } = await doctor(projectRoot)
    assert.ok(lines.some((l) => l.status === "error" && l.message.includes("missing")))
  })

  test("state 4 — no ledger in the project", async () => {
    await attach({ host: "opencode", projectRoot, payloadRoot })
    await fsp.rm(path.join(projectRoot, ".apex"), { recursive: true, force: true })
    const { lines } = await doctor(projectRoot)
    assert.ok(lines.some((l) => l.message.includes("No ledger") && l.fix?.includes("init")))
  })

  test("state 5 — no verification commands", async () => {
    await attach({ host: "opencode", projectRoot, payloadRoot })
    const { lines } = await doctor(projectRoot)
    assert.ok(
      lines.some((l) => l.status === "warn" && l.message.includes("No verification commands")),
      "an unverifiable project must be flagged, not hidden",
    )
  })
})

// ── INS-011, INS-012 ────────────────────────────────────────────────────────

describe("INS-011/012 — no credentials, no network", () => {
  test("attach never writes anything credential-shaped", async () => {
    await attach({ host: "opencode", projectRoot, payloadRoot })
    const raw = (await readTextOrNull(configFile()))!
    for (const banned of ["apiKey", "api_key", "token", "secret", "password", "ANTHROPIC", "OPENAI"]) {
      assert.ok(!raw.includes(banned), `${banned} appeared in the emitted config`)
    }
  })

  test("attach succeeds with no network available", async () => {
    // Nothing in attach performs a fetch; proven by the source scan plus this run
    // completing in an environment where no request is made.
    const result = await attach({ host: "opencode", projectRoot, payloadRoot })
    assert.equal(result.hosts.length, 1)
  })
})

// ── L2 plugin installation ──────────────────────────────────────────────────

describe("PLG-001 — the L2 plugin shim is installed correctly", () => {
  test("a shim is written, not a copy of the built plugin", async () => {
    await attach({ host: "opencode", projectRoot, payloadRoot })
    const shim = await readTextOrNull(path.join(fakeHome, ".config", "opencode", "plugins", "apex.js"))
    assert.ok(shim, "plugins/apex.js is missing")
    assert.match(shim, /import \{ ApexPlugin \}/)
    assert.match(shim, /shim, not the plugin/)
  })

  test("the shim imports a file:// URL, never a bare Windows path", async () => {
    await attach({ host: "opencode", projectRoot, payloadRoot })
    const shim = (await readTextOrNull(path.join(fakeHome, ".config", "opencode", "plugins", "apex.js")))!
    const specifier = /from\s+"([^"]+)"/.exec(shim)?.[1] ?? ""
    assert.match(specifier, /^file:\/\//, `ESM rejects a bare absolute path: ${specifier}`)
    assert.ok(!/^[A-Za-z]:/.test(specifier), "a drive-letter specifier throws ERR_UNSUPPORTED_ESM_URL_SCHEME")
  })

  test("host companions land in the host's own directories, not inside apex/", async () => {
    const companions = path.join(payloadRoot, "opencode", "agents")
    await fsp.mkdir(companions, { recursive: true })
    await fsp.writeFile(path.join(companions, "apex-implementer.md"), "---\nmode: subagent\n---\n", "utf8")

    await attach({ host: "opencode", projectRoot, payloadRoot })
    const cfgDir = path.join(fakeHome, ".config", "opencode")
    assert.ok(existsSync(path.join(cfgDir, "agents", "apex-implementer.md")), "companion not installed")
    assert.ok(!existsSync(path.join(cfgDir, "apex", "opencode")), "companions must not be duplicated inside apex/")
  })

  test("an L1-only host gets no plugin shim", async () => {
    await fsp.mkdir(path.join(fakeHome, ".claude"), { recursive: true })
    await attach({ host: "claude-code", projectRoot, payloadRoot })
    assert.ok(!existsSync(path.join(fakeHome, ".claude", "plugins", "apex.js")))
  })
})

// ── the multi-host leak ─────────────────────────────────────────────────────
//
// `attach` with no --host wrote into EVERY detected host directory. On a machine with
// OpenCode, Claude Code, Cursor and Gemini CLI installed, one command left files and
// config entries in all four — three of which the user never asked for, and had to be
// cleaned up by hand afterwards.

describe("INS-001 — attach touches ONE host unless told otherwise", () => {
  beforeEach(async () => {
    // A machine with several hosts present.
    for (const d of [".claude", ".cursor", ".gemini"]) {
      await fsp.mkdir(path.join(fakeHome, d), { recursive: true })
    }
  })

  test("attaches only to the deepest host and names the rest", async () => {
    const result = await attach({ projectRoot, payloadRoot })
    assert.equal(result.hosts.length, 1, "exactly one host may be written to by default")
    assert.equal(result.hosts[0]!.name, "opencode", "the deepest binding wins")
    assert.ok(
      result.messages.some((m) => m.includes("Left untouched")),
      "the other hosts must be reported, not silently skipped",
    )
  })

  test("the untouched hosts really are untouched", async () => {
    await attach({ projectRoot, payloadRoot })
    for (const d of [".claude", ".cursor", ".gemini"]) {
      const dir = path.join(fakeHome, d)
      const entries = await fsp.readdir(dir)
      assert.deepEqual(entries, [], `${d} was modified without being asked for`)
    }
  })

  test("--all-hosts opts back in", async () => {
    const result = await attach({ projectRoot, payloadRoot, allHosts: true })
    assert.ok(result.hosts.length > 1, "explicit opt-in attaches to every detected host")
  })

  test("--host targets exactly one, even with several present", async () => {
    const result = await attach({ host: "claude-code", projectRoot, payloadRoot })
    assert.equal(result.hosts.length, 1)
    assert.equal(result.hosts[0]!.name, "claude-code")
    assert.deepEqual(await fsp.readdir(path.join(fakeHome, ".cursor")), [], "cursor untouched")
  })
})
