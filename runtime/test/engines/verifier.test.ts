import { test, describe, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import fsp from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { Verifier, extractFailingTests, appendTestPath } from "../../src/engines/verifier.ts"
import { Ledger } from "../../src/engines/ledger.ts"
import { FakeCommandRunner, RealCommandRunner } from "../../src/core/exec.ts"
import { setLogDir } from "../../src/core/log.ts"
import type { ApexConfig } from "../../src/core/types.ts"

let dir: string
let ledger: Ledger
let config: ApexConfig

async function write(rel: string, content: string): Promise<void> {
  const file = path.join(dir, rel)
  await fsp.mkdir(path.dirname(file), { recursive: true })
  await fsp.writeFile(file, content, "utf8")
}

beforeEach(async () => {
  dir = await fsp.mkdtemp(path.join(os.tmpdir(), "apex-verify-"))
  setLogDir(path.join(dir, "logs"))
  ledger = new Ledger(dir)
  const init = await ledger.init({ projectRoot: dir })
  config = init.config
})
afterEach(async () => {
  setLogDir(null)
  await fsp.rm(dir, { recursive: true, force: true })
})

function makeVerifier(runner: FakeCommandRunner, overrides: Partial<ApexConfig> = {}): Verifier {
  return new Verifier({ ...config, ...overrides }, runner, ledger)
}

// ── VER-001 — command detection across archetypes ───────────────────────────

describe("VER-001 — detects the project's real commands", () => {
  test("node + npm scripts", async () => {
    await write("package.json", JSON.stringify({ scripts: { test: "jest", lint: "eslint .", build: "tsc -p ." } }))
    const found = await makeVerifier(new FakeCommandRunner()).detectCommands(dir)
    assert.equal(found.suite, "npm test")
    assert.equal(found.lint, "npm run lint")
    assert.equal(found.build, "npm run build")
  })

  test("node + pnpm lockfile changes the runner", async () => {
    await write("package.json", JSON.stringify({ scripts: { test: "vitest" } }))
    await write("pnpm-lock.yaml", "lockfileVersion: 6")
    const found = await makeVerifier(new FakeCommandRunner()).detectCommands(dir)
    assert.equal(found.suite, "pnpm test")
  })

  test("typecheck script is found", async () => {
    await write("package.json", JSON.stringify({ scripts: { typecheck: "tsc --noEmit" } }))
    const found = await makeVerifier(new FakeCommandRunner()).detectCommands(dir)
    assert.equal(found.types, "npm run typecheck")
  })

  test("python + pytest + mypy + ruff", async () => {
    await write("pyproject.toml", "[tool.pytest.ini_options]\n\n[tool.mypy]\n\n[tool.ruff]\n")
    await write("src/app.py", "x = 1\n")
    const found = await makeVerifier(new FakeCommandRunner()).detectCommands(dir)
    assert.equal(found.suite, "pytest")
    assert.equal(found.types, "mypy src/")
    assert.equal(found.lint, "ruff check src/")
  })

  test("rust", async () => {
    await write("Cargo.toml", "[package]\nname='x'\n")
    const found = await makeVerifier(new FakeCommandRunner()).detectCommands(dir)
    assert.equal(found.suite, "cargo test")
    assert.equal(found.types, "cargo check")
  })

  test("go", async () => {
    await write("go.mod", "module x\n")
    const found = await makeVerifier(new FakeCommandRunner()).detectCommands(dir)
    assert.equal(found.suite, "go test ./...")
    assert.equal(found.types, "go vet ./...")
  })

  test("Makefile targets", async () => {
    await write("Makefile", "test:\n\tpytest\n\nlint:\n\truff check .\n\nbuild:\n\techo ok\n")
    const found = await makeVerifier(new FakeCommandRunner()).detectCommands(dir)
    assert.equal(found.suite, "make test")
    assert.equal(found.lint, "make lint")
    assert.equal(found.build, "make build")
  })

  test("justfile targets", async () => {
    await write("justfile", "test:\n  pytest\n")
    const found = await makeVerifier(new FakeCommandRunner()).detectCommands(dir)
    assert.equal(found.suite, "just test")
  })

  test("tsconfig with no script still yields a typecheck", async () => {
    await write("tsconfig.json", "{}")
    const found = await makeVerifier(new FakeCommandRunner()).detectCommands(dir)
    assert.equal(found.types, "npx tsc --noEmit")
  })

  test("CI-only project — the hardest case", async () => {
    await write(
      ".github/workflows/ci.yml",
      ["jobs:", "  build:", "    steps:", "      - run: pytest -q", "      - run: mypy src/"].join("\n"),
    )
    const found = await makeVerifier(new FakeCommandRunner()).detectCommands(dir)
    assert.equal(found.suite, "pytest -q")
    assert.equal(found.types, "mypy src/")
  })

  test("empty project — invents NOTHING", async () => {
    const found = await makeVerifier(new FakeCommandRunner()).detectCommands(dir)
    assert.deepEqual(found, {}, "a fabricated command proves nothing about the code")
  })

  test("unparseable package.json does not crash detection", async () => {
    await write("package.json", "{not json")
    const found = await makeVerifier(new FakeCommandRunner()).detectCommands(dir)
    assert.deepEqual(found, {})
  })
})

describe("VER-002 — detected commands are cached", () => {
  test("persists into config and is not re-derived", async () => {
    await write("package.json", JSON.stringify({ scripts: { test: "jest" } }))
    const v = makeVerifier(new FakeCommandRunner())
    await v.ensureCommands()
    assert.equal((await ledger.loadConfig()).verifyCommands.suite, "npm test")
  })

  test("an explicit config wins over detection", async () => {
    await write("package.json", JSON.stringify({ scripts: { test: "jest" } }))
    const v = makeVerifier(new FakeCommandRunner(), { verifyCommands: { suite: "pytest -x" } })
    const cmds = await v.ensureCommands()
    assert.equal(cmds.suite, "pytest -x")
  })
})

// ── VER-003, VER-004 — cascade order and literal capture ────────────────────

describe("VER-003 — cascade order and short-circuit", () => {
  test("runs cheapest first and stops at the first failure", async () => {
    const runner = new FakeCommandRunner({
      "tsc --noEmit": { code: 1, stdout: "src/a.ts(4,1): error TS2304: Cannot find name 'foo'." },
      pytest: { code: 0, stdout: "10 passed" },
    })
    const v = makeVerifier(runner, { verifyCommands: { types: "tsc --noEmit", suite: "pytest" } })
    const records = await v.cascade(["src/a.ts"], ["REQ-001"])

    assert.ok(!runner.calls.includes("pytest"), "the expensive check must not run on broken code")
    const types = records.find((r) => r.type === "types")!
    assert.equal(types.result, "FAIL")
  })

  test("stopAtFirstFailure:false runs the whole ladder", async () => {
    const runner = new FakeCommandRunner({
      "tsc --noEmit": { code: 1, stdout: "type error" },
      pytest: { code: 0, stdout: "10 passed" },
    })
    const v = makeVerifier(runner, { verifyCommands: { types: "tsc --noEmit", suite: "pytest" } })
    await v.cascade(["src/a.ts"], ["REQ-001"], { stopAtFirstFailure: false })
    assert.ok(runner.calls.includes("pytest"))
  })

  test("maxTier caps the ladder", async () => {
    const runner = new FakeCommandRunner({
      "tsc --noEmit": { code: 0, stdout: "ok" },
      pytest: { code: 0, stdout: "ok" },
      "npm run build": { code: 0, stdout: "built" },
    })
    const v = makeVerifier(runner, {
      verifyCommands: { types: "tsc --noEmit", suite: "pytest", build: "npm run build" },
    })
    await v.cascade([], ["REQ-001"], { maxTier: "types" })
    assert.ok(!runner.calls.includes("npm run build"))
  })
})

// ── WP-059 — CAP-T09: every verification record carries execution context ───

describe("WP-059 — verification records carry execution context (CAP-T09)", () => {
  const MARKERS = ["CI", "GITHUB_ACTIONS", "GITLAB_CI", "JENKINS_URL", "BUILDKITE", "CIRCLECI", "TRAVIS",
    "TEAMCITY_VERSION", "BITBUCKET_BUILD_NUMBER", "TF_BUILD",
    "CONTAINER_ID", "KUBERNETES_SERVICE_HOST", "DOCKER_CONTAINER"]
  const saved = new Map<string, string | undefined>()

  beforeEach(() => {
    for (const name of MARKERS) {
      saved.set(name, process.env[name])
      delete process.env[name]
    }
  })
  afterEach(() => {
    for (const name of MARKERS) {
      const value = saved.get(name)
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }
  })

  test("a plain run records its context as local", async () => {
    const runner = new FakeCommandRunner({ pytest: { code: 0, stdout: "10 passed" } })
    const v = makeVerifier(runner, { verifyCommands: { suite: "pytest" } })
    const records = await v.cascade([], ["REQ-001"], { maxTier: "suite" })
    assert.ok(records.length > 0)
    for (const r of records) assert.equal(r.context, "local")
    // CAP-T09 — the context is in the ledger and survives a reload (round-trip).
    for (const r of records) assert.equal((await ledger.listVerifications()).find((v) => v.id === r.id)!.context, "local")
  })

  test("worktree isolation is recorded in every record", async () => {
    const runner = new FakeCommandRunner({ pytest: { code: 0, stdout: "10 passed" } })
    const v = makeVerifier(runner, {
      verifyCommands: { suite: "pytest" },
      delegation: { ...config.delegation, isolation: "worktree" },
    })
    const records = await v.cascade([], ["REQ-001"], { maxTier: "suite" })
    for (const r of records) assert.equal(r.context, "worktree")
  })

  test("a CI marker records remote", async () => {
    process.env.GITHUB_ACTIONS = "true"
    const runner = new FakeCommandRunner({ pytest: { code: 0, stdout: "10 passed" } })
    const v = makeVerifier(runner, { verifyCommands: { suite: "pytest" } })
    const records = await v.cascade([], ["REQ-001"], { maxTier: "suite" })
    for (const r of records) assert.equal(r.context, "remote")
  })

  test("a container marker records container", async () => {
    process.env.CONTAINER_ID = "abc"
    const runner = new FakeCommandRunner({ pytest: { code: 0, stdout: "10 passed" } })
    const v = makeVerifier(runner, { verifyCommands: { suite: "pytest" } })
    const records = await v.cascade([], ["REQ-001"], { maxTier: "suite" })
    for (const r of records) assert.equal(r.context, "container")
  })

  test("NOT_RUN records carry the context too", async () => {
    const v = makeVerifier(new FakeCommandRunner(), { verifyCommands: {} })
    const records = await v.cascade([], ["REQ-001"], { maxTier: "lint" })
    assert.ok(records.length > 0)
    for (const r of records) assert.equal(r.context, "local")
  })
})

describe("VER-004 — literal output is captured", () => {
  test("stdout and stderr are preserved verbatim", async () => {
    const output = "FAILED tests/test_a.py::test_x - AssertionError: 1 != 2\n1 failed, 3 passed"
    const runner = new FakeCommandRunner({ pytest: { code: 1, stdout: output } })
    const v = makeVerifier(runner, { verifyCommands: { suite: "pytest" } })
    const [rec] = await v.cascade([], ["REQ-001"], { maxTier: "suite" })
    const suite = (await ledger.listVerifications()).find((r) => r.type === "suite")!
    assert.ok(suite.actual.includes("AssertionError: 1 != 2"), "the literal failure text is the evidence")
    assert.equal(rec!.result, "NOT_RUN") // parse tier has no command
  })

  test("a secret in command output never reaches the ledger", async () => {
    const runner = new FakeCommandRunner({
      pytest: { code: 1, stdout: "auth failed: ghp_AAaa11BBbb22CCcc33DDdd44EEee55FF" },
    })
    const v = makeVerifier(runner, { verifyCommands: { suite: "pytest" } })
    await v.cascade([], ["REQ-001"], { maxTier: "suite" })
    const onDisk = await fsp.readFile(ledger.file("VERIFICATION.md"), "utf8")
    assert.ok(!onDisk.includes("ghp_AAaa11"))
  })
})

// ── VER-005 ─────────────────────────────────────────────────────────────────

describe("VER-005 — targeted test selection", () => {
  test("finds a python test beside the module", async () => {
    await write("tests/test_auth.py", "def test_x(): pass\n")
    const v = makeVerifier(new FakeCommandRunner(), { verifyCommands: { suite: "pytest" } })
    assert.equal(await v.targetedTest("src/auth.py"), "pytest tests/test_auth.py")
  })

  test("finds a colocated TypeScript test", async () => {
    await write("src/storage.test.ts", "test('x', () => {})\n")
    const v = makeVerifier(new FakeCommandRunner(), { verifyCommands: { suite: "npm test" } })
    assert.equal(await v.targetedTest("src/storage.ts"), "npm test -- src/storage.test.ts")
  })

  test("returns null when no targeted test exists", async () => {
    const v = makeVerifier(new FakeCommandRunner(), { verifyCommands: { suite: "pytest" } })
    assert.equal(await v.targetedTest("src/auth.py"), null)
  })

  test("the cascade uses the targeted test when one exists", async () => {
    await write("tests/test_auth.py", "def test_x(): pass\n")
    const runner = new FakeCommandRunner({
      "pytest tests/test_auth.py": { code: 0, stdout: "1 passed" },
      pytest: { code: 0, stdout: "40 passed" },
    })
    const v = makeVerifier(runner, { verifyCommands: { suite: "pytest", unit: "pytest" } })
    await v.cascade(["src/auth.py"], ["REQ-001"], { maxTier: "unit" })
    assert.ok(runner.calls.includes("pytest tests/test_auth.py"))
  })
})

// ── VER-006, VER-007 — honest non-results ───────────────────────────────────

describe("VER-007 — a missing tool is NOT_RUN, never PASS", () => {
  test("absent binary", async () => {
    const runner = new FakeCommandRunner() // everything is not-found
    const v = makeVerifier(runner, { verifyCommands: { types: "mypy src/" } })
    const records = await v.cascade([], ["REQ-001"], { maxTier: "types" })
    const types = records.find((r) => r.type === "types")!
    assert.equal(types.result, "NOT_RUN")
    assert.notEqual(types.result, "PASS")
    assert.match(types.reason, /not available in this environment/)
    assert.match(types.reason, /mypy/)
  })

  test("an unconfigured tier is NOT_RUN with a reason", async () => {
    const v = makeVerifier(new FakeCommandRunner(), { verifyCommands: {} })
    const records = await v.cascade([], ["REQ-001"], { maxTier: "lint" })
    assert.ok(records.length > 0)
    for (const r of records) {
      assert.equal(r.result, "NOT_RUN")
      assert.ok(r.reason.length > 0, "NOT_RUN always carries a reason")
    }
  })

  test("NOT_RUN does not stop the cascade", async () => {
    const runner = new FakeCommandRunner({ pytest: { code: 0, stdout: "5 passed" } })
    const v = makeVerifier(runner, { verifyCommands: { types: "mypy src/", suite: "pytest" } })
    const records = await v.cascade([], ["REQ-001"], { maxTier: "suite" })
    assert.equal(records.find((r) => r.type === "types")!.result, "NOT_RUN")
    assert.equal(records.find((r) => r.type === "suite")!.result, "PASS")
  })
})

describe("VER-006 — timeouts fail loudly", () => {
  test("a timed-out command is FAIL with a reason, not a hang", async () => {
    const runner = new FakeCommandRunner({ pytest: { code: null, timedOut: true, stdout: "collecting..." } })
    const v = makeVerifier(runner, { verifyCommands: { suite: "pytest" } })
    const records = await v.cascade([], ["REQ-001"], { maxTier: "suite" })
    const suite = records.find((r) => r.type === "suite")!
    assert.equal(suite.result, "FAIL")
    assert.match(suite.reason, /Timed out/)
  })

  test("the real runner enforces its timeout", async () => {
    const runner = new RealCommandRunner()
    const sleep = process.platform === "win32" ? "ping -n 10 127.0.0.1 > nul" : "sleep 10"
    const result = await runner.run(sleep, { timeoutMs: 400 })
    assert.equal(result.timedOut, true)
    assert.ok(result.durationMs < 5000, "the process was actually killed")
  })

  test("the real runner reports a missing binary", async () => {
    const result = await new RealCommandRunner().run("definitely-not-a-real-binary-xyz --version")
    assert.equal(result.notFound, true)
    assert.notEqual(result.code, 0)
  })

  test("the real runner captures literal output", async () => {
    const result = await new RealCommandRunner().run("node -e \"console.log('apex-ok')\"")
    assert.equal(result.code, 0)
    assert.match(result.stdout, /apex-ok/)
  })
})

// ── VER-008, VER-009 — attribution ──────────────────────────────────────────

describe("VER-008/009 — baseline and regression attribution", () => {
  test("a pre-existing failure is not blamed on the change", async () => {
    const runner = new FakeCommandRunner({
      pytest: { code: 1, stdout: "FAILED tests/test_legacy.py::test_old\n1 failed, 20 passed" },
    })
    const v = makeVerifier(runner, { verifyCommands: { suite: "pytest" } })
    await v.captureBaseline()

    const records = await v.cascade([], ["REQ-001"], { maxTier: "suite" })
    const suite = records.find((r) => r.type === "suite")!
    assert.match(suite.reason, /pre-date this session/)
    assert.match(suite.reason, /test_legacy/)
  })

  test("a NEW failure is identified by name as a regression", async () => {
    const runner = new FakeCommandRunner({
      pytest: { code: 1, stdout: "FAILED tests/test_legacy.py::test_old\n1 failed" },
    })
    const v = makeVerifier(runner, { verifyCommands: { suite: "pytest" } })
    await v.captureBaseline()

    runner.set("pytest", {
      code: 1,
      stdout: "FAILED tests/test_legacy.py::test_old\nFAILED tests/test_auth.py::test_new\n2 failed",
    })
    const records = await v.cascade([], ["REQ-001"], { maxTier: "suite" })
    const suite = records.find((r) => r.type === "suite")!
    assert.match(suite.reason, /New failures introduced/)
    assert.match(suite.reason, /test_auth\.py::test_new/)
    assert.ok(!suite.reason.includes("test_legacy"), "the pre-existing failure is not blamed on this change")
  })

  test("captureBaseline returns null when the project has no suite", async () => {
    const v = makeVerifier(new FakeCommandRunner(), { verifyCommands: {} })
    assert.equal(await v.captureBaseline(), null)
  })
})

describe("extractFailingTests", () => {
  const cases: Array<[string, string, string]> = [
    ["pytest", "FAILED tests/test_a.py::test_x - AssertionError", "tests/test_a.py::test_x"],
    ["go", "--- FAIL: TestThing (0.00s)", "TestThing"],
    ["tap", "not ok 3 - my failing case", "my failing case"],
    ["jest", "  ✕ renders the header (12 ms)", "renders the header"],
  ]
  for (const [runner, line, expected] of cases) {
    test(`parses ${runner}`, () => {
      assert.ok(extractFailingTests(line).includes(expected), `got ${JSON.stringify(extractFailingTests(line))}`)
    })
  }

  test("returns nothing for clean output", () => {
    assert.deepEqual(extractFailingTests("118 passed, 2 skipped in 4.2s"), [])
  })

  test("does not mistake a runner summary heading for a test name", () => {
    const nodeTestOutput = [
      "✖ failing tests:",
      "",
      "test at tests/auth.test.js:4:1",
      "✖ rejects a bad token (1.2ms)",
      "ℹ fail 1",
    ].join("\n")
    const failing = extractFailingTests(nodeTestOutput)
    assert.deepEqual(failing, ["rejects a bad token"])
  })
})

describe("appendTestPath", () => {
  test("inserts -- for package-manager scripts", () => {
    assert.equal(appendTestPath("npm test", "tests/a.test.js"), "npm test -- tests/a.test.js")
    assert.equal(appendTestPath("pnpm test", "tests/a.test.js"), "pnpm test -- tests/a.test.js")
  })

  test("leaves a direct runner alone", () => {
    assert.equal(appendTestPath("pytest", "tests/test_a.py"), "pytest tests/test_a.py")
    assert.equal(appendTestPath("cargo test", "x"), "cargo test x")
  })

  test("does not double the separator", () => {
    assert.equal(appendTestPath("npm test -- --watch=false", "a"), "npm test -- --watch=false a")
  })
})

// ── VER-010, VER-012 ────────────────────────────────────────────────────────

describe("VER-010 — every run is recorded", () => {
  test("records land in the ledger with their evidence", async () => {
    const runner = new FakeCommandRunner({ pytest: { code: 0, stdout: "12 passed" } })
    const v = makeVerifier(runner, { verifyCommands: { suite: "pytest" } })
    await v.cascade([], ["REQ-001"], { maxTier: "suite" })
    const recorded = await ledger.listVerifications()
    assert.ok(recorded.length > 0)
    const suite = recorded.find((r) => r.type === "suite")!
    assert.equal(suite.result, "PASS")
    assert.ok(suite.actual.includes("12 passed"))
  })
})

describe("helpers", () => {
  test("allPassed ignores NOT_RUN but requires at least one real run", async () => {
    const runner = new FakeCommandRunner({ pytest: { code: 0, stdout: "ok" } })
    const v = makeVerifier(runner, { verifyCommands: { suite: "pytest" } })
    const records = await v.cascade([], ["REQ-001"], { maxTier: "suite" })
    assert.equal(Verifier.allPassed(records), true)
    assert.equal(Verifier.allPassed(records.filter((r) => r.result === "NOT_RUN")), false)
  })

  test("tierReached reports the honest ceiling", async () => {
    const runner = new FakeCommandRunner({ pytest: { code: 0, stdout: "ok" } })
    const v = makeVerifier(runner, { verifyCommands: { suite: "pytest" } })
    const records = await v.cascade([], ["REQ-001"], { maxTier: "suite" })
    assert.equal(Verifier.tierReached(records), "suite")
    assert.equal(Verifier.tierReached([]), null)
  })
})

// ── WP-050b — host-provided semantic diagnostics (54 §14, AUT-T08) ──────────

describe("WP-050b — diagnostics evidence slot", () => {
  test("a clean host diagnostics message records PASS, correctly positioned", async () => {
    const runner = new FakeCommandRunner({})
    const v = makeVerifier(runner, {
      verifyCommands: { types: "npx tsc --noEmit" },
      capabilities: { hostDiagnostics: true, diagnosticsMessage: "no semantic errors", schemaBudgetTokens: 1000 },
    })
    const records = await v.cascade(["src/a.ts"], ["REQ-001"], { maxTier: "types" })
    const diag = records.find((r) => r.type === "diagnostics")!
    assert.ok(diag, "diagnostics record exists between parse and types")
    assert.equal(diag.result, "PASS")
    assert.match(diag.reason, /strong for THIS edit/)
    const typesIndex = records.findIndex((r) => r.type === "types")
    const diagIndex = records.indexOf(diag)
    assert.ok(typesIndex > diagIndex, "diagnostics slots before types in the cascade")
  })

  test("empty host message is NOT_RUN, never a fake PASS", async () => {
    const runner = new FakeCommandRunner({})
    const v = makeVerifier(runner, {
      verifyCommands: { types: "npx tsc --noEmit" },
      capabilities: { hostDiagnostics: true, diagnosticsMessage: "", schemaBudgetTokens: 1000 },
    })
    const records = await v.cascade([], ["REQ-002"], { maxTier: "types" })
    const diag = records.find((r) => r.type === "diagnostics")!
    assert.equal(diag.result, "NOT_RUN")
    assert.match(diag.reason, /never reported as failure/)
  })

  test("hostDiagnostics:false suppresses the diagnostics slot entirely", async () => {
    const runner = new FakeCommandRunner({})
    const v = makeVerifier(runner, {
      verifyCommands: { types: "npx tsc --noEmit" },
      capabilities: { hostDiagnostics: false, diagnosticsMessage: "no semantic errors", schemaBudgetTokens: 1000 },
    })
    const records = await v.cascade([], ["REQ-003"], { maxTier: "types" })
    assert.equal(records.some((r) => r.type === "diagnostics"), false)
  })

  test("diagnostics never substitute for a required test tier (AUT-T08)", async () => {
    const runner = new FakeCommandRunner({})
    const v = makeVerifier(runner, {
      verifyCommands: { suite: "pytest" },
      capabilities: { hostDiagnostics: true, diagnosticsMessage: "no semantic errors", schemaBudgetTokens: 1000 },
    })
    const records = await v.cascade([], ["REQ-004"], { maxTier: "suite" })
    const suite = records.find((r) => r.type === "suite")
    assert.ok(suite, "the suite tier still runs — diagnostics are evidence, not a substitute")
    assert.equal(suite!.result, "NOT_RUN") // no pytest here; honest NOT_RUN
  })
})
