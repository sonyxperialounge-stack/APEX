# BASELINE — frozen 2026-09-10, never edited after Phase 0 closes

Captured by the implementing agent on the machine in front of it (`02 §2`), before any upgrade
change. All values below are real observations, not inferences.

## 1. Repository fingerprint

| Field | Observed value |
|---|---|
| Commit SHA | `7c217ec0d5026be714dbe717fdf7333e06345da4` |
| Branch (baseline) | `master` |
| Upgrade branch created | `upgrade/army-v4` (off the SHA above; all upgrade work lands there) |
| `git status --porcelain` | `?? apex-army-v3.md` (one untracked file, pre-existing, not project source; left untouched) |
| Dirty at start | no — no tracked file is modified; the single porcelain entry is untracked |
| Package name / version | `apex-agent` @ `1.0.0` |
| Declared engine range | `node >=22.6.0` |
| Production dependencies | `{}` (zero, enforced by `test/sourcescan.test.ts` CORE-003) |
| Dev dependencies | `typescript ^5.9.0`, `@types/node ^24.0.0` |
| Test runner | `node --test --experimental-strip-types "test/**/*.test.ts"` (sources run directly, no build) |
| Source size | 21 `.ts` files under `runtime/src` (~7.8k LOC) |
| Test size | 17 test files (671 tests, 147 suites) |
| MCP tools | 22 `apex_*` tools in `src/mcp/tools.ts` (counted: 22 `name: "apex_*"` literals) |
| `START-HERE.md` size | 13,072 bytes |
| `START-HERE.md` sha256 | `b5a07b46afaf7926edfd3d63114acab1de011db0ef67c0bd2723a27536c5aee5` |

## 2. Machine

| Field | Observed value |
|---|---|
| Node | `v24.16.0` |
| npm | `11.13.0` |
| OS | `win32` — Windows 11 (10.0.26200) |
| Architecture | `x64` |
| Git identity | Lalit Sharma / sonyxperialounge@gmail.com |
| Global `~/.apex` | absent (fresh install case is the local reality) |

## 3. Commands

```text
typecheck            npm run typecheck    (tsc --noEmit)
build                npm run build        (tsc -p tsconfig.build.json)
test                 npm test             (node --test --experimental-strip-types)
packaged artifact    npm pack             (prepack: sync:payload -> clean -> build)
full pipeline        npm run verify       (sync:payload -> typecheck -> clean -> build -> test)
```

## 4. Untouched baseline suite result (WP-002)

Command: `npm run verify` in `D:/APEX/Army-V3/runtime`, 2026-09-10.

```text
ℹ tests 671
ℹ suites 147
ℹ pass 671
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 25685.8925
```

Exit code: **0**. Every step green: `sync:payload` clean, `typecheck` clean, `clean` ok,
`build` ok, `test` 671/671. No failure to classify. Raw tail captured in
`EVIDENCE/EVD-001.md`.

## 5. Support policy (WP-003)

- Declared floor `node >=22.6.0` matches the test toolchain's own requirement
  (`--experimental-strip-types` exists from 22.6). Tests run TypeScript sources directly, so
  the **packaged floor and the contributor/test floor are the same**: `>=22.6.0`. `02 §4`'s
  split does not apply — no separate floors need publishing.
- The local machine has only Node `v24.16.0`. **The 22.6.x floor was NOT run locally:**
  `NOT_RUN` — no 22.x interpreter is installed on this machine. It is exercised by CI
  (`.github/workflows/verify.yml` already tests node 22 and 24 on windows/ubuntu/macos
  with a packed-tarball install job, which matches `43 §6`'s matrix). Any floor-specific
  fix therefore lands through CI evidence in WP-081, per `02 §6`.
- Support matrix in `43 §6` is **confirmed as-is**; no amendment needed.

## 6. Failure classification (WP-004)

Baseline suite: 0 failures. **Zero unclassified failures.** No Ledger requirements are
needed for pre-existing failures — there are none. The upgrade's requirement rows are seeded
separately (see `.apex/REQUIREMENTS.md`, added by this phase per `50`).

## 7. Existing L0/L1/L2 behaviour (observed)

- **L0** — `START-HERE.md` + `core/01..13` doctrine + `adapters/*` are plain Markdown; a
  file-reading model needs nothing else. `EXAMPLES.md` documents usage.
- **L1** — `runtime/src/mcp/server.ts` exposes 22 `apex_*` tools (init, requirements,
  verify, gate, snapshot, rollback, memory read/write, council, delegate, models, etc.).
- **L2** — `runtime/src/plugin/index.ts` is the OpenCode plugin (8 hooks), with
  `payload/opencode/` companions and a loader shim built into `dist/plugin` at build time.
- Payload pipeline: root `core|adapters|templates` + 4 root files -> `runtime/payload/**`,
  link-rewritten for shipping (`scripts/sync-payload.mjs`), guarded by
  `test/cli/payload.test.ts` + `test/cli/packaging.test.ts`.

## 8. Drift check against `42 §1`

Every fact `42` recorded on 10 September 2026 still holds on this tree today: same commit
SHAs observed, zero production dependencies, 22 MCP tools, no `ARMY_HOME`/`sqlite`/`skills`
occurrences in sources, erasable-TS invariants enforced by `test/sourcescan.test.ts`.
**No unknown blocking baseline failure. Phase 0 exit gate is satisfied.**
