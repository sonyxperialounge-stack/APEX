import { test, describe, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import fsp from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { Governor, extractPathArguments, toOperationKind, isDestructive, type GitClient } from "../../src/engines/governor.ts"
import { DEFAULT_CONFIG } from "../../src/engines/ledger.ts"
import { setLogDir } from "../../src/core/log.ts"
import type { ApexConfig, AutonomyMode, CapabilityEffect, Operation } from "../../src/core/types.ts"

let dir: string
let cfg: ApexConfig

async function write(rel: string, content = "x"): Promise<string> {
  const file = path.join(dir, rel)
  await fsp.mkdir(path.dirname(file), { recursive: true })
  await fsp.writeFile(file, content, "utf8")
  return file
}

beforeEach(async () => {
  dir = await fsp.mkdtemp(path.join(os.tmpdir(), "apex-gov-"))
  setLogDir(path.join(dir, "logs"))
  cfg = {
    ...DEFAULT_CONFIG,
    projectRoot: dir,
    allowedPaths: ["."],
    doNotRead: [".env", "secrets/", "api-key.md"],
    doNotTouch: ["config/prod.yaml", "migrations/", "vendor/"],
  }
  await write("config/prod.yaml", "secret: no")
  await write("config/dev.yaml", "ok: yes")
  await write("migrations/001_init.sql", "CREATE TABLE x;")
  await write("src/app.ts", "export const x = 1")
  await write(".env", "TOKEN=abc")
})
afterEach(async () => {
  setLogDir(null)
  await fsp.rm(dir, { recursive: true, force: true })
})

function gov(overrides: Partial<ApexConfig> = {}, git: GitClient | null = null): Governor {
  return new Governor({ ...cfg, ...overrides }, git)
}

// ── GOV-003 — path protection must survive every evasion ────────────────────

describe("GOV-003 — protected write, evasion resistance", () => {
  const EVASIONS = [
    "config/prod.yaml",
    "./config/prod.yaml",
    "config/../config/prod.yaml",
    "config//prod.yaml",
    "config\\prod.yaml",
    "migrations/001_init.sql",
    "migrations",
    "migrations/",
    "vendor/anything/deep/file.js",
    "../{ESCAPE}/config/prod.yaml",
  ]

  for (const raw of EVASIONS) {
    test(`blocks: ${raw}`, () => {
      const target = raw.replace("{ESCAPE}", path.basename(dir))
      assert.equal(gov().isProtectedWrite(target), true, `${target} was NOT blocked`)
    })
  }

  test("blocks an absolute path into a protected file", () => {
    assert.equal(gov().isProtectedWrite(path.join(dir, "config", "prod.yaml")), true)
  })

  test("blocks case variation exactly when the filesystem resolves case variants", async () => {
    // The block comes from realpath resolving "CONFIG/PROD.YAML" onto the real
    // "config/prod.yaml", which only happens on a case-INSENSITIVE filesystem. That is
    // Windows (always), macOS (APFS default), and usually NOT Linux — so the expectation
    // is probed from the filesystem itself, never hardcoded to a platform. The first
    // version guessed `platform === "win32"` and broke on macOS CI for exactly this reason.
    const probeFile = path.join(dir, "case-probe.txt")
    await fsp.writeFile(probeFile, "x")
    const fsResolvesCase = await fsp
      .access(path.join(dir, "CASE-PROBE.TXT"))
      .then(() => true)
      .catch(() => false)

    const result = gov().isProtectedWrite("CONFIG/PROD.YAML")
    assert.equal(
      result,
      fsResolvesCase,
      `case variation was ${result ? "blocked" : "allowed"} but the filesystem ` +
        `${fsResolvesCase ? "does" : "does not"} resolve case variants`,
    )
  })

  test("blocks anything outside allowed_paths (deny by default)", () => {
    assert.equal(gov().isProtectedWrite(path.join(os.tmpdir(), "elsewhere.txt")), true)
    assert.equal(gov().isProtectedWrite("../outside.txt"), true)
  })

  test("blocks an empty or missing path", () => {
    assert.equal(gov().isProtectedWrite(""), true)
  })

  test("blocks writes to the APEX config itself (GOV-011)", () => {
    assert.equal(gov().isProtectedWrite(".apex/config.json"), true)
  })

  // The inverse matters just as much: a protection that blocks everything is broken too.
  const ALLOWED = ["src/app.ts", "./src/app.ts", "config/dev.yaml", "src/new/file.ts", "README.md"]
  for (const raw of ALLOWED) {
    test(`allows: ${raw}`, () => {
      assert.equal(gov().isProtectedWrite(raw), false, `${raw} was wrongly blocked`)
    })
  }

  test("a prefix-sharing sibling is not protected", () => {
    assert.equal(gov().isProtectedWrite("configuration/other.yaml"), false)
    assert.equal(gov().isProtectedWrite("src/migrations_helper.ts"), false)
  })

  test("glob patterns in do_not_touch work", () => {
    const g = gov({ doNotTouch: ["**/*.lock", "src/generated/*"] })
    assert.equal(g.isProtectedWrite("package.lock"), true)
    assert.equal(g.isProtectedWrite("deep/nested/yarn.lock"), true)
    assert.equal(g.isProtectedWrite("src/generated/api.ts"), true)
    assert.equal(g.isProtectedWrite("src/app.ts"), false)
  })

  test("a symlink into a protected directory is blocked", async (t) => {
    const link = path.join(dir, "shortcut")
    try {
      await fsp.symlink(path.join(dir, "migrations"), link, "junction")
    } catch {
      t.skip("symlink creation not permitted in this environment")
      return
    }
    assert.equal(gov().isProtectedWrite("shortcut/001_init.sql"), true)
  })
})

describe("GOV-004 — protected read", () => {
  for (const p of [".env", "./.env", "secrets/key.pem", "api-key.md"]) {
    test(`blocks reading ${p}`, () => {
      assert.equal(gov().isProtectedRead(p), true)
    })
  }
  test("ordinary source is readable", () => {
    assert.equal(gov().isProtectedRead("src/app.ts"), false)
  })
  test("a read decision carries an explanatory reason", () => {
    const d = gov().decide({ kind: "read", path: ".env" })
    assert.equal(d.allowed, false)
    assert.equal(d.rule, "protected-read")
    assert.match(d.reason, /do_not_read/)
    assert.match(d.reason, /route around it/, "the model must be told not to work around it")
  })
})

// ── GOV-002 — the blocklist wins in every mode ──────────────────────────────

describe("GOV-002 — blocklist applies in EVERY mode", () => {
  const MODES: AutonomyMode[] = ["MANUAL", "GUARDED", "AUTO", "FULL_AUTO"]
  const BLOCKED: Array<[string, Operation]> = [
    ["protected write", { kind: "write", path: "config/prod.yaml" }],
    ["protected read", { kind: "read", path: ".env" }],
    ["unbounded delete", { kind: "bash", command: "rm -rf $TARGET" }],
    ["force push", { kind: "bash", command: "git push --force origin main" }],
    ["reset hard", { kind: "bash", command: "git reset --hard HEAD~3" }],
    ["clean -fd", { kind: "bash", command: "git clean -fd" }],
    ["blanket stash", { kind: "bash", command: "git stash" }],
    ["drop table", { kind: "bash", command: 'psql -c "DROP TABLE users"' }],
    ["deploy", { kind: "deploy", command: "vercel --prod" }],
    ["payment", { kind: "payment" }],
    ["outbound message", { kind: "message" }],
    ["secret egress", { kind: "network", payload: "token=ghp_AAaa11BBbb22CCcc33DDdd44EEee55FF" }],
  ]

  for (const mode of MODES) {
    for (const [label, op] of BLOCKED) {
      test(`${mode}: blocks ${label}`, () => {
        const d = gov({ autonomy: mode }).decide(op)
        assert.equal(d.allowed, false, `${label} was allowed in ${mode}`)
        assert.equal(d.ask, false, "a blocklist hit is a hard denial, not a question")
        assert.match(d.reason, /APEX BLOCKED/)
      })
    }
  }

  test("--force-with-lease is permitted where --force is not", () => {
    const safe = gov({ autonomy: "AUTO" }).decide({
      kind: "bash",
      command: "git push --force-with-lease origin feature",
    })
    assert.equal(safe.allowed, true)
  })

  test("targeted git stash push is permitted", () => {
    const d = gov({ autonomy: "AUTO" }).decide({ kind: "bash", command: "git stash push -- src/app.ts" })
    assert.equal(d.allowed, true)
  })

  test("a bounded rm inside the project is permitted", () => {
    const d = gov({ autonomy: "AUTO" }).decide({ kind: "bash", command: "rm -rf src/generated" })
    assert.equal(d.allowed, true, "a specific in-project path is fine")
  })

  test("a variable-driven rm is NEVER bounded", () => {
    const d = gov({ autonomy: "AUTO" }).decide({ kind: "bash", command: "rm -rf ${BUILD_DIR}" })
    assert.equal(d.allowed, false)
  })

  test("an rm that reaches a protected path is blocked", () => {
    const d = gov({ autonomy: "FULL_AUTO" }).decide({ kind: "bash", command: "rm -rf migrations" })
    assert.equal(d.allowed, false)
  })
})

// ── GOV-001 — the four modes genuinely differ ───────────────────────────────

describe("GOV-001 — modes produce different decisions", () => {
  const edit: Operation = { kind: "write", path: "src/app.ts" }
  const install: Operation = { kind: "bash", command: "npm install lodash" }
  const del: Operation = { kind: "delete", path: "src/old.ts" }

  test("MANUAL asks for an ordinary edit", () => {
    const d = gov({ autonomy: "MANUAL" }).decide(edit)
    assert.equal(d.allowed, false)
    assert.equal(d.ask, true)
  })

  test("MANUAL still allows reading", () => {
    assert.equal(gov({ autonomy: "MANUAL" }).decide({ kind: "read", path: "src/app.ts" }).allowed, true)
  })

  test("GUARDED allows an ordinary edit but asks about installing", () => {
    const g = gov({ autonomy: "GUARDED" })
    assert.equal(g.decide(edit).allowed, true)
    const ask = g.decide(install)
    assert.equal(ask.allowed, false)
    assert.equal(ask.ask, true)
    assert.match(ask.reason, /dependency/)
  })

  test("GUARDED asks before deleting", () => {
    const d = gov({ autonomy: "GUARDED" }).decide(del)
    assert.equal(d.ask, true)
    assert.match(d.reason, /deleting files/)
  })

  test("AUTO proceeds where GUARDED asked", () => {
    assert.equal(gov({ autonomy: "AUTO" }).decide(install).allowed, true)
    assert.equal(gov({ autonomy: "AUTO" }).decide(del).allowed, true)
  })

  test("FULL_AUTO proceeds too, but still requires a snapshot for writes", () => {
    const d = gov({ autonomy: "FULL_AUTO" }).decide(edit)
    assert.equal(d.allowed, true)
    assert.equal(d.requiresSnapshot, true)
  })

  test("the four modes are not all the same", () => {
    const results = (["MANUAL", "GUARDED", "AUTO", "FULL_AUTO"] as AutonomyMode[]).map(
      (m) => `${gov({ autonomy: m }).decide(edit).allowed}/${gov({ autonomy: m }).decide(install).allowed}`,
    )
    assert.equal(new Set(results).size >= 3, true, `modes collapsed: ${results.join(" ")}`)
  })

  test("every decision records the rule that produced it (GOV-012)", () => {
    for (const m of ["MANUAL", "GUARDED", "AUTO", "FULL_AUTO"] as AutonomyMode[]) {
      assert.ok(gov({ autonomy: m }).decide(edit).rule.length > 0)
    }
  })
})

// ── GOV-006 — bulk expansion ────────────────────────────────────────────────

describe("GOV-006 — bulk operations are expanded before running", () => {
  test("detects bulk-shaped commands", () => {
    for (const c of ["black .", "prettier --write '**/*.ts'", "rm -r build", "eslint --fix ."]) {
      assert.equal(Governor.looksBulk(c), true, `${c} should look bulk`)
    }
    assert.equal(Governor.looksBulk("node script.js"), false)
  })

  test("a formatter over the whole project reaches protected files", async () => {
    const violations = await gov().bulkViolations("black .")
    assert.ok(
      violations.some((v) => v.includes("prod.yaml") || v.includes("migrations")),
      `expected a protected hit, got ${JSON.stringify(violations)}`,
    )
  })

  test("a glob confined to safe files has no violations", async () => {
    const violations = await gov().bulkViolations("prettier --write src/*.ts")
    assert.deepEqual(violations, [])
  })

  test("expansion enumerates real files", async () => {
    const targets = await gov().expandBulk("prettier --write src")
    assert.ok(targets.some((t) => t.endsWith("app.ts")))
  })

  test("ignored directories are not walked", async () => {
    await write("node_modules/pkg/index.js")
    const targets = await gov().expandBulk("black .")
    assert.ok(!targets.some((t) => t.includes("node_modules")))
  })
})

// ── GOV-007, GOV-008, GOV-009 — snapshot and surgical rollback ──────────────

describe("GOV-007/008/009 — snapshot and rollback", () => {
  test("snapshot restores byte-identical content", async () => {
    const file = path.join(dir, "src", "app.ts")
    const original = await fsp.readFile(file, "utf8")

    const ref = await gov().snapshot("REQ-001", ["src/app.ts"])
    await fsp.writeFile(file, "CORRUPTED", "utf8")
    assert.notEqual(await fsp.readFile(file, "utf8"), original)

    const report = await gov().rollback(ref)
    assert.equal(await fsp.readFile(file, "utf8"), original)
    assert.equal(report.restored.length, 1)
  })

  test("a snapshot of an absent file is skipped, not an error", async () => {
    const ref = await gov().snapshot("REQ-001", ["src/does-not-exist.ts"])
    assert.equal(ref.files.length, 0)
  })

  // E2E-8 — the test that protects the user FROM the system.
  test("E2E-8: rollback preserves unrelated user work", async () => {
    const mine = path.join(dir, "src", "app.ts")
    const theirs = path.join(dir, "src", "user-wip.ts")
    await fsp.writeFile(theirs, "USER WORK IN PROGRESS", "utf8")

    const fakeGit: GitClient = {
      isRepo: async () => true,
      statusShort: async () => ["src/user-wip.ts"], // dirty BEFORE apex touched anything
      head: async () => "a3f9c21",
    }

    const g = gov({}, fakeGit)
    const ref = await g.snapshot("REQ-001", ["src/app.ts"])
    assert.deepEqual(ref.preExistingDirty, ["src/user-wip.ts"])

    await fsp.writeFile(mine, "BROKEN CHANGE", "utf8")
    const report = await g.rollback(ref)

    assert.equal(await fsp.readFile(theirs, "utf8"), "USER WORK IN PROGRESS", "the user's work MUST survive")
    assert.ok(report.preserved.includes("src/user-wip.ts"))
    assert.deepEqual(report.unexpected, [], "nothing outside the recorded set moved")
  })

  test("rollback reports genuinely unexpected changes", async () => {
    let dirty = ["src/app.ts"]
    const fakeGit: GitClient = {
      isRepo: async () => true,
      statusShort: async () => dirty,
      head: async () => "abc",
    }
    const g = gov({}, fakeGit)
    const ref = await g.snapshot("REQ-001", ["src/app.ts"])
    dirty = ["src/app.ts", "src/surprise.ts"] // something else changed meanwhile
    const report = await g.rollback(ref)
    assert.deepEqual(report.unexpected, ["src/surprise.ts"])
  })

  test("works with no git present", async () => {
    const ref = await gov({}, null).snapshot("REQ-001", ["src/app.ts"])
    assert.deepEqual(ref.preExistingDirty, [])
    const report = await gov({}, null).rollback(ref)
    assert.equal(report.restored.length, 1)
  })
})

// ── GOV-011, GOV-013 ────────────────────────────────────────────────────────

describe("GOV-011 — no self-modification", () => {
  test("writing .apex/config.json is refused in every mode", () => {
    for (const m of ["MANUAL", "GUARDED", "AUTO", "FULL_AUTO"] as AutonomyMode[]) {
      const d = gov({ autonomy: m }).decide({ kind: "write", path: ".apex/config.json" })
      assert.equal(d.allowed, false, `allowed in ${m}`)
      assert.match(d.reason, /widen its own permissions|do_not_touch/)
    }
  })

  test("other ledger files remain writable", () => {
    assert.equal(gov({ autonomy: "AUTO" }).decide({ kind: "write", path: ".apex/PROGRESS.md" }).allowed, true)
  })
})

describe("GOV-013 — external effects always need a human", () => {
  for (const kind of ["deploy", "payment", "message"] as const) {
    test(`${kind} is denied even in FULL_AUTO`, () => {
      const d = gov({ autonomy: "FULL_AUTO" }).decide({ kind })
      assert.equal(d.allowed, false)
      assert.equal(d.rule, "external-effect")
    })
  }
})

describe("fail-closed behaviour", () => {
  test("a rule evaluation that throws denies rather than allows", () => {
    const g = gov({ autonomy: "FULL_AUTO" })
    // Sanity: this write is permitted while everything works.
    assert.equal(g.decide({ kind: "write", path: "src/app.ts" }).allowed, true)

    // Now make the protection check itself fail. Safety must fail CLOSED.
    g.isProtectedWrite = () => {
      throw new Error("simulated resolution failure")
    }
    const d = g.decide({ kind: "write", path: "src/app.ts" })
    assert.equal(d.allowed, false, "an unevaluable safety rule must deny, not allow")
    assert.equal(d.rule, "protected-write")
  })
})

describe("extractPathArguments", () => {
  test("skips flags and the command itself", () => {
    assert.deepEqual(extractPathArguments("rm -rf build dist"), ["build", "dist"])
  })
  test("handles quotes", () => {
    assert.deepEqual(extractPathArguments('prettier --write "src/a b.ts"'), ["src/a b.ts"])
  })
  test("drops redirects", () => {
    assert.deepEqual(extractPathArguments("pytest > out.txt"), [])
  })
})

// ── WP-050 // 21 §3, 42 §6 — the effects taxonomy and Governor adapter ──────

describe("toOperationKind — the one effect→kind adapter (42 §6)", () => {
  const TABLE: Array<{ effects: CapabilityEffect[]; expected: Operation["kind"] }> = [
    { effects: ["READ"], expected: "read" },
    { effects: ["WRITE"], expected: "write" },
    { effects: ["EXECUTE"], expected: "bash" },
    { effects: ["NETWORK"], expected: "network" },
    { effects: ["INSTALL"], expected: "bash" },
    { effects: ["DELETE"], expected: "delete" },
    { effects: ["EXTERNAL_SIDE_EFFECT"], expected: "deploy" },
    { effects: ["DESTRUCTIVE", "DELETE"], expected: "delete" },
  ]
  test("maps every single effect to its operation kind", () => {
    for (const { effects, expected } of TABLE) {
      assert.equal(toOperationKind(effects), expected, `${effects.join("+")} -> ${expected}`)
    }
  })
  test("a composite maps to the most restrictive kind", () => {
    assert.equal(toOperationKind(["READ", "WRITE"]), "write")
    assert.equal(toOperationKind(["READ", "DELETE"]), "delete")
    assert.equal(toOperationKind(["WRITE", "NETWORK"]), "network")
    // A delete done through a command stays on `bash`: the command blocklist
    // must still see it (unbounded-delete etc. reason on op.command).
    assert.equal(toOperationKind(["EXECUTE", "DELETE"]), "bash")
    assert.equal(toOperationKind(["READ", "DESTRUCTIVE"]), "read")
  })
  test("EXECUTE wins over NETWORK so command safety rules still see it", () => {
    assert.equal(toOperationKind(["NETWORK", "EXECUTE"]), "bash")
  })
  test("DESTRUCTIVE alone still maps to a real kind (delete)", () => {
    assert.equal(toOperationKind(["DESTRUCTIVE"]), "delete")
  })
  test("the full taxonomy is referenced — no parallel synonym vocabulary (CAP-T07)", () => {
    // The eight canonical effects from 21 §3 compile through the adapter and
    // stay inside the exported const union.
    assert.deepEqual(
      ["READ", "WRITE", "EXECUTE", "NETWORK", "INSTALL", "DELETE", "DESTRUCTIVE", "EXTERNAL_SIDE_EFFECT"] as CapabilityEffect[],
      ["READ", "WRITE", "EXECUTE", "NETWORK", "INSTALL", "DELETE", "DESTRUCTIVE", "EXTERNAL_SIDE_EFFECT"],
    )
    for (const e of ["READ", "WRITE", "EXECUTE", "NETWORK", "INSTALL", "DELETE", "DESTRUCTIVE", "EXTERNAL_SIDE_EFFECT"]) {
      assert.ok(toOperationKind([e as CapabilityEffect]), `adapter handles ${e}`)
    }
  })
})

describe("isDestructive — the modifier, not a kind (42 §6)", () => {
  test("DESTRUCTIVE in the effects list flags the operation", () => {
    assert.equal(isDestructive(["DESTRUCTIVE", "DELETE"]), true)
    assert.equal(isDestructive(["READ"]), false)
    assert.equal(isDestructive([]), false)
  })
})

describe("WP-050 destructive modifier on the Governor", () => {
  test("a destructive read still requires a snapshot (raises the bar)", () => {
    const d = gov({ autonomy: "FULL_AUTO" }).decide({ kind: "read", destructive: true })
    assert.equal(d.allowed, false, "destructive forces approval even in FULL_AUTO")
    assert.equal(d.requiresSnapshot, true)
  })
  test("AUT-T06 — FULL_AUTO refuses a destructive operation outright and says why", () => {
    const d = gov({ autonomy: "FULL_AUTO" }).decide({ kind: "delete", destructive: true })
    assert.equal(d.allowed, false)
    assert.match(d.reason, /DESTRUCTIVE.*explicit human approval/)
    assert.equal(d.requiresSnapshot, true)
  })
  test("AUTO also refuses — the modifier is not skipped at higher autonomy", () => {
    const d = gov({ autonomy: "AUTO" }).decide({ kind: "bash", destructive: true, command: "rm -rf build" })
    assert.equal(d.allowed, false)
    assert.equal(d.requiresSnapshot, true)
  })
  test("GUARDED asks for a destructive operation with a snapshot", () => {
    const d = gov({ autonomy: "GUARDED" }).decide({ kind: "write", path: "src/app.ts", destructive: true })
    assert.equal(d.allowed, false)
    assert.equal(d.ask, true)
    assert.equal(d.requiresSnapshot, true)
  })
  test("MANUAL asks even for a destructive read", () => {
    const d = gov({ autonomy: "MANUAL" }).decide({ kind: "read", destructive: true })
    assert.equal(d.allowed, false)
    assert.equal(d.ask, true)
  })
  test("an ordinary non-destructive write keeps its current AUTO behaviour", () => {
    const d = gov({ autonomy: "AUTO" }).decide({ kind: "write", path: "src/app.ts" })
    assert.equal(d.allowed, true)
    assert.equal(d.requiresSnapshot, true)
  })
  test("CAP-T04 — capability exposure still goes through the Governor", () => {
    // The adapter maps the descriptor's effects and asks exactly as a direct call
    // would; a deferred tool is not a cheaper tool (54 §2).
    const d = gov({ autonomy: "FULL_AUTO" }).decide({
      kind: toOperationKind(["DESTRUCTIVE", "DELETE"]),
      destructive: isDestructive(["DESTRUCTIVE", "DELETE"]),
    })
    assert.equal(d.allowed, false, "a destructive capability cannot bypass the Governor")
  })
})

// ── WP-059 — execution context on the operation record (54 §13, CAP-T08) ────

describe("WP-059 — absent context is governed as local (CAP-T08)", () => {
  const CASE = ["undefined", "unknown"] as const
  for (const label of CASE) {
    test(`${label} context behaves exactly like local`, () => {
      const expected = gov({ autonomy: "GUARDED" }).decide({ kind: "bash", command: "git push origin main" })
      const d = gov({ autonomy: "GUARDED" }).decide({
        kind: "bash",
        command: "git push origin main",
        context: label === "undefined" ? undefined : ("unknown" as const),
      })
      assert.equal(d.allowed, expected.allowed)
      assert.equal(d.ask, expected.ask)
      assert.equal(d.requiresSnapshot, expected.requiresSnapshot)
      assert.equal(d.rule, expected.rule)
    })
  }

  test("a risky op in local context still requires a one-time confirmation", () => {
    const d = gov({ autonomy: "GUARDED" }).decide({ kind: "bash", command: "git push origin main", context: "local" })
    assert.equal(d.allowed, false)
    assert.equal(d.ask, true)
  })

  test("an unrecognized declared context is governed as local, never unclassified", () => {
    const d = gov({ autonomy: "GUARDED" }).decide({
      kind: "bash",
      command: "git push origin main",
      context: "bogus" as never,
    })
    assert.equal(d.allowed, false, "hard blocks never relax with context")
    assert.equal(d.ask, true)
  })

  test("the hard blocklist never relaxes with context", () => {
    const d = gov({ autonomy: "FULL_AUTO" }).decide({
      kind: "delete",
      path: "config/prod.yaml",
      context: "container",
    })
    assert.equal(d.allowed, false)
    assert.equal(d.rule, "protected-write")
  })
})

describe("WP-059 — disposable context lowers the GUARDED bar (54 §13)", () => {
  test("container context allows a risky op GUARDED would otherwise ask about", () => {
    const d = gov({ autonomy: "GUARDED" }).decide({
      kind: "bash",
      command: "git push origin main",
      context: "container",
    })
    assert.equal(d.allowed, true)
    assert.match(d.reason, /throwaway container/)
  })

  test("worktree context does the same", () => {
    const d = gov({ autonomy: "GUARDED" }).decide({ kind: "delete", path: "build/", context: "worktree" })
    assert.equal(d.allowed, true)
    assert.match(d.reason, /throwaway worktree/)
  })

  test("remote context does NOT lower the bar — remote is not disposable", () => {
    const d = gov({ autonomy: "GUARDED" }).decide({ kind: "bash", command: "git push origin main", context: "remote" })
    assert.equal(d.allowed, false)
    assert.equal(d.ask, true)
  })
})

describe("WP-059 — DESTRUCTIVE in a disposable context", () => {
  test("the bar relaxes only inside a throwaway container; the snapshot stays required", () => {
    const d = gov({ autonomy: "FULL_AUTO" }).decide({
      kind: "delete",
      path: "var/tmp/",
      destructive: true,
      context: "container",
    })
    assert.equal(d.allowed, true)
    assert.match(d.reason, /throwaway container/)
    assert.equal(d.requiresSnapshot, true, "the snapshot bar never relaxes with context")
  })

  test("DESTRUCTIVE on local/unknown/remote still demands explicit approval everywhere", () => {
    // container/worktree are the only contexts that relax — they are disposable by
    // definition (54 §13); everything else keeps the FULL_AUTO ceiling.
    for (const context of [undefined, "local", "remote"] as const) {
      const d = gov({ autonomy: "FULL_AUTO" }).decide({ kind: "delete", destructive: true, context })
      assert.equal(d.allowed, false, `context ${String(context)} must not relax a DESTRUCTIVE op`)
      assert.equal(d.ask, true)
    }
  })

  test("GUARDED asks for a destructive op on local, allows it in a throwaway worktree", () => {
    const local = gov({ autonomy: "GUARDED" }).decide({ kind: "delete", destructive: true, context: "local" })
    assert.equal(local.allowed, false)
    assert.equal(local.ask, true)
    const wt = gov({ autonomy: "GUARDED" }).decide({ kind: "delete", destructive: true, context: "worktree" })
    assert.equal(wt.allowed, true)
    assert.match(wt.reason, /throwaway worktree/)
  })
})
