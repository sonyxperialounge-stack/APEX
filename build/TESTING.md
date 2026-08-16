# TESTING

> APEX is a system whose entire purpose is verification. If its own tests are weak, nothing it
> claims about anything else is credible.
>
> The builder must apply `../core/03-EVIDENCE.md` to this build.

---

## STRATEGY

| Layer | What | Speed | Runs |
|---|---|---|---|
| **Unit** | Engines in isolation, injected I/O | <1 s | every change |
| **Contract** | MCP protocol, plugin hook shapes, config schemas | <5 s | every change |
| **Integration** | Engines + real filesystem + real subprocesses | <30 s | every commit |
| **Host** | Against a mock OpenCode HTTP+SSE server | <60 s | every commit |
| **Live** | Against a real installed OpenCode/Claude Code | manual | before release |
| **Regression** | Named tests for bugs that have actually happened | <5 s | every change |

Target: **90%+ on engines**, 100% on GOVERNOR's path-protection and blocklist. Those two are
security surfaces — a gap there is not a coverage statistic, it is an exploit.

---

## THE TESTS THAT MATTER MOST

Coverage percentage is a weak signal. These specific tests are what make the system
trustworthy.

### 1. Path-protection evasion — GOV-003

Every one of these must be blocked. Write them as a table:

```ts
const EVASIONS = [
  "config/prod.yaml",                       // direct
  "./config/prod.yaml",                     // relative prefix
  "config/../config/prod.yaml",             // traversal that resolves back in
  "../myapp/config/prod.yaml",              // out and back
  "CONFIG/PROD.YAML",                       // case (win32)
  "config\\prod.yaml",                      // separator
  "config/prod.yaml/",                      // trailing slash
  "/abs/path/to/config/prod.yaml",          // absolute
  "\\\\?\\C:\\...\\config\\prod.yaml",      // UNC / long path
  "link-to-config/prod.yaml",               // symlink into a protected dir
  "config/*.yaml",                          // glob expanding onto it
  "config/",                                // the directory itself
  "migrations/001_x.sql",                   // inside a protected directory
]
for (const p of EVASIONS)
  test(`blocks: ${p}`, () => expect(gov.isProtectedWrite(p)).toBe(true))
```

Then the inverse: legitimate paths must **not** be blocked. A protection that blocks
everything is as broken as one that blocks nothing, and it fails less visibly.

### 2. Illegal transitions — LED-004

```ts
const ILLEGAL: [ReqStatus, ReqStatus][] = [
  ["NOT_STARTED", "VERIFIED_COMPLETE"],
  ["NOT_STARTED", "IMPLEMENTED_NOT_VERIFIED"],
  ["IN_PROGRESS", "VERIFIED_COMPLETE"],
  ["BLOCKED", "VERIFIED_COMPLETE"],
  ["NOT_APPLICABLE", "VERIFIED_COMPLETE"],
]
for (const [from, to] of ILLEGAL)
  test(`rejects ${from} → ${to}`, async () => {
    await expect(ledger.setStatus(id, to)).rejects.toThrow(/Illegal transition/)
  })

test("VERIFIED_COMPLETE requires passing evidence", async () => {
  await ledger.setStatus(id, "IN_PROGRESS")
  await ledger.setStatus(id, "IMPLEMENTED_NOT_VERIFIED")
  await expect(ledger.setStatus(id, "VERIFIED_COMPLETE"))
    .rejects.toThrow(/no passing verification record/)
})
```

### 3. INS-004 — the Windows-path regression

The bug that silently disabled the whole previous system. Full test in `INSTALLER.md`. It runs
on every change, forever.

### 4. Fault injection — PLG-002, X-001

A plugin that throws takes down the user's session. Prove it cannot.

```ts
for (const hook of ALL_HOOKS)
  test(`session survives a throw in ${hook}`, async () => {
    const host = mockOpenCode({ injectThrowIn: hook })
    await host.runTurn("edit a file")
    expect(host.sessionAlive).toBe(true)
    expect(host.logs).toContainEqual(expect.stringMatching(/apex hook failed/))
  })

for (const missing of ["experimental.chat.system.transform", "permission.ask", "tool.execute.after"])
  test(`degrades when ${missing} is unsupported`, async () => {
    const host = mockOpenCode({ unsupportedHooks: [missing] })
    await expect(host.runTurn("edit a file")).resolves.toBeDefined()
  })
```

### 5. No-fake-pass — VER-007

```ts
test("a missing tool is NOT_RUN, never PASS", async () => {
  const v = new Verifier({ verifyCommands: { types: "mypy src/" } }, execWithout("mypy"), ledger)
  const [rec] = await v.cascade(["src/a.py"], ["REQ-001"], { maxTier: "types" })
  expect(rec.result).toBe("NOT_RUN")
  expect(rec.reason).toMatch(/not installed/)
  expect(rec.result).not.toBe("PASS")
})
```

### 6. Source-scan tests

Some requirements are properties of the source, not of behaviour. Assert them mechanically.

```ts
test("GOV-010: no destructive git commands anywhere in source", () => {
  const src = readAllSource("src/")
  for (const banned of ["reset --hard", "clean -fd", "checkout .", "push --force "])
    expect(src).not.toContain(banned)
})

test("CORE-009 / INS-011: no credential access", () => {
  const src = readAllSource("src/")
  for (const banned of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "apiKey", "api_key", "auth/"])
    expect(src).not.toMatch(new RegExp(banned, "i"))
})

test("CNC-006: no path from a vote to a requirement status", () => {
  expect(readAllSource("src/engines/council.ts")).not.toMatch(/setStatus|VERIFIED_COMPLETE/)
})

test("VER-012: the verifier cannot write to test files", () => {
  expect(readAllSource("src/engines/verifier.ts")).not.toMatch(/writeFile|unlink|rename/)
})

test("CORE-005: all writes go through the redaction chokepoint", () => {
  const offenders = filesMatching("src/", /fs\.writeFile|writeFileSync/)
    .filter(f => !["core/json.ts", "core/log.ts"].some(a => f.endsWith(a)))
  expect(offenders).toEqual([])
})

test("CNC-001: no hardcoded model identifiers", () => {
  expect(readAllSource("src/")).not.toMatch(/gpt-|claude-|gemini-|llama-|mistral/i)
})

test("FLT-004: no code path substitutes a user-named model", () => {
  const warden = readAllSource("src/engines/warden.ts")
  for (const banned of ["pickBest", "fallbackModel", "anyAvailable", "nearestModel", "orDefault("])
    expect(warden).not.toContain(banned)
  // The only permitted lookup is the user's own pre-authorised fallback map
  expect(warden).toMatch(/delegation\.models\.fallback/)
})
```

These are cheap, fast, and they catch the exact class of drift that code review misses.

### 7. Redaction — CORE-004

```ts
const SECRETS = [
  "sk-ant-api03-xxxxxxxxxxxxxxxxxxxx",
  "ghp_xxxxxxxxxxxxxxxxxxxxxxxx",
  "AKIAIOSFODNN7EXAMPLE",
  "postgres://user:hunter2@db:5432/app",
  "Bearer eyJhbGciOiJIUzI1NiJ9.xxx.yyy",
  "-----BEGIN RSA PRIVATE KEY-----",
  "password = 'hunter2'",
  'AWS_SECRET_ACCESS_KEY="wJalrXUt..."',
]
for (const s of SECRETS) {
  test(`redacts: ${s.slice(0, 14)}…`, () => {
    const out = redact(`error near ${s} in config`)
    expect(out).not.toContain(s)
    expect(out).toContain("[REDACTED]")
  })
}

test("redaction survives a full round trip to disk", async () => {
  await ledger.addVerification({ actual: "FAILED: token=sk-ant-api03-leak", /* … */ } as any)
  const onDisk = await fs.readFile(".apex/VERIFICATION.md", "utf8")
  expect(onDisk).not.toContain("sk-ant-api03-leak")
})
```

---

## THE MOCK HOST

`test/fixtures/mock-opencode.ts` — an in-process HTTP + SSE server implementing the endpoints
in `ARCHITECTURE.md`, with fault injection.

```ts
export function mockOpenCode(opts: {
  providers?: ProviderCatalog
  injectThrowIn?: string
  unsupportedHooks?: string[]
  sessionFailsAfter?: number        // simulate a crash
  slowResponse?: number             // simulate a timeout
  emptyConnected?: boolean          // the Army-V2 regression
}): MockHost
```

It must be able to simulate: a subagent crashing mid-work · a subagent going idle with unmet
criteria · a subagent editing outside its scope · a provider returning an unexpected shape ·
`connected: []` (explicitly zero models — an Army-V2 bug) · an endpoint returning 404 on an
older build.

---

## FIXTURE PROJECTS — VER-001

Real minimal projects, one per archetype, used to prove command detection:

```
test/fixtures/projects/
  node-jest/        package.json with scripts.test
  node-vitest/      vitest + tsc
  python-pytest/    pyproject.toml, tests/
  python-mypy/      mypy + ruff configured
  rust-cargo/       Cargo.toml
  go-mod/           go.mod
  make-based/       Makefile with test/lint/build
  just-based/       justfile
  ci-only/          commands ONLY in .github/workflows — the hardest case
  empty/            no commands at all → all NOT_RUN, no invention
```

`empty/` is the important one: the correct behaviour is to record `NOT_RUN` for everything and
say so, not to invent a plausible command.

---

## END-TO-END SCENARIOS

Each is a full APEX cycle against the mock host, asserting the *behaviour a user would notice*.

```
E2E-1  Happy path
       init → 3 requirements → implement → verify → gate passes → completion report
       Assert: all three VERIFIED_COMPLETE, each with a real verification record

E2E-2  Verification failure
       Implement with a deliberate type error
       Assert: tool.execute.after injects the failure in the same turn;
               status does NOT advance; the model receives the literal error

E2E-3  Protected path
       Attempt a write to do_not_touch, then attempt to route around it with bash
       Assert: both blocked; the file is unmodified; both blocks are logged

E2E-4  Subagent crash and recovery
       Spawn, kill mid-work, recover
       Assert: partial work preserved; replacement packet lists what already exists;
               attempt counter incremented; nothing redone

E2E-5  Anti-loop
       Same failing fix three times
       Assert: third identical attempt is refused; strategy escalation is required;
               the requirement remains visible, not dropped

E2E-6  Context handoff
       Work to the threshold, hand off, resume in a fresh instance
       Assert: no verified work is redone; blockers survive; resume point is accurate

E2E-7  Gate failure
       Leave one requirement unverified and call the gate
       Assert: gate FAILS, names that requirement, and no completion report is written

E2E-9  Directed fleet with an unavailable model
       User orders 50 workers with model A + verifier model B; B is not connected
       Assert: execution STOPS before dispatch; the user is told exactly which model
               is missing and what is available; NO substitution occurs; after the
               user picks C, all 50 packets dispatch and the tally reconciles

E2E-10 Worker class exhaustion mid-run
       All model-A workers start failing during wave 2
       Assert: redistribution stays within class until exhausted; then it asks the
               user; independent packets in other classes still complete; state is
               persisted before the question; no unchosen model is ever called

E2E-11 Autonomous delegation decision
       Task with 3 disjoint modules → delegates, announces first
       Task with 2 coupled files   → does NOT delegate, says why
       Assert: both behaviours, and the announcement precedes any spawn

E2E-8  Rollback preserves user work
       Dirty the tree with unrelated user edits, make a failing change, roll back
       Assert: APEX's change is reverted; the user's unrelated edits are untouched
```

E2E-8 is the one that protects the user from the system. It must never regress.

---

## LIVE VERIFICATION — before release

Automated tests cannot prove the plugin loads in a real OpenCode. Army-V2's validation report
said "24/24 pass" while the shipped config was invalid JSON that no real host could load.
**Mock-green is not shipped-green.**

Manual checklist, on a real machine:

- [ ] `npx apex-agent attach` on **Windows** — clean install, no prior config
- [ ] `npx apex-agent attach` on Windows — with a rich pre-existing `opencode.json`
- [ ] Same two on macOS or Linux
- [ ] Start OpenCode: plugin loads, no errors in `--print-logs`
- [ ] `/apex <a real task>` end to end on a real repository
- [ ] A write to a protected path is genuinely blocked in the TUI
- [ ] A real type error surfaces in the same turn
- [ ] Kill a subagent for real; confirm recovery
- [ ] `apex-agent doctor` reports level 2
- [ ] `apex-agent detach`; confirm `opencode.json` is byte-identical to the pre-install backup
- [ ] Repeat the L1 path on Claude Code and on Cursor

**Do not publish a release until every box is ticked on real hardware.** Record the results, and
if the environment prevented a check, say which one and why — do not silently mark it done.

---

## CI

```yaml
strategy:
  matrix:
    os: [windows-latest, ubuntu-latest, macos-latest]
    node: [20, 22]
steps:
  - npm ci
  - npx tsc --noEmit
  - npm run lint
  - npm test -- --coverage
  - npm run test:integration
  - npm run test:e2e
```

Windows is first in the matrix deliberately. It is the primary target and the platform where
the previous system's fatal bug lived.

---

Next: `ROADMAP.md`
