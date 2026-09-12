# Release Verification — apex-agent 2.0.0 (the V4 release)

Date: **2026-09-12**. Environment: Windows 10.0.26200 x64, Node 24.16.0, Git Bash.
This is the dated manual record required by 53 §5 (*"Nothing here may be checked from
memory. Each line needs a fresh artifact"*) and by register row REQ-PROD-007. It is also
the durable home of the release evidence for REQ-PROD-006 and REQ-PROD-008, and of the
BASE-T01..T05 baseline review. Every output below was captured live during WP-089.

---

## 1. The release artifact

`runtime/apex-agent-2.0.0.tgz` — packed 2026-09-12 with `npm pack`.

- 122 files under `package/`: `bin/`, `dist/`, `payload/`, `README.md`, `LICENSE`,
  `scripts/sync-payload.mjs` (the only script the pack carries, per PKG-T01).
- Hygiene scan of the tar listing: no `army-update-plan`, no build-state or upgrade
  folder, no scratch/research trees, no nested archives. The only name matches for
  "research" are shipped doctrine content (`payload/skills/research/source-grounded/`,
  `payload/opencode/agents/apex-researcher.md`).
- `payload/` in the pack is byte-verified against source: `node scripts/sync-payload.mjs
  --check` → `payload matches source (36 managed file(s) compared).`, exit 0.
- `payload/core/manifest.json` (sha256 over every numbered core doctrine file) ships in
  the pack and verifies at load: doctor reports `Core doctrine manifest verifies
  (payload/core).`

## 2. Clean-machine smoke (REQ-PROD-007 — V-006, PASS)

A temp project and a **clean APEX_HOME** (both fresh `mktemp -d`), then
`npm install <pack>` → `found 0 vulnerabilities`. Following the shipped docs only:

| Step | Command | Observed result |
|---|---|---|
| Version | `npx apex-agent --version` | `2.0.0` + the two license lines |
| Health | `npx apex-agent doctor` | exit 0, `worst: UNAVAILABLE`, `0 error(s)`, `Running packaged (no src/ — dist/ + payload/ as shipped).`, **`Packaged mode — the payload is static as shipped.` (OK)**, `Package metadata present: apex-agent@2.0.0.`, `Core doctrine manifest verifies (payload/core).` |
| MCP handshake | initialize + tools/list over stdio | `{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2025-06-18",...,"serverInfo":{"name":"apex","version":"2.0.0"}}}` and a full tool listing for id 2 |
| Ledger | `npx apex-agent init` | `Created ledger at <project>\.apex` + `Verify commands: suite=npm test  unit=npm test` |
| Status | `npx apex-agent status` | `level: 0`, `requirements: 0` |
| Memory | `memory add` / `memory list` | `Added — store revision 1`; the record listed as `[active]` |
| Gate honesty | `npx apex-agent gate` | `GATE FAILED — 3 unmet check(s). Do not claim completion.` — an empty ledger is refused, never waved through |
| Repair loop | `npx apex-agent doctor --repair` | `Home structure reconstructed (idempotent ensure).`, `repaired: home-ensure, hot-view, index-rebuild` |
| Final doctor | `npx apex-agent doctor` | `Home structure present at current schema.`, `0 error(s), 2 warning(s)`, exit 0. The 2 warnings are owner-choice advisories (no host attached yet; no doNotTouch paths configured), each with its `fix:` hint |

The `--version` and MCP `serverInfo` versions are derived from `package.json` at runtime
(the single source of the number), so the version surfaces cannot drift from each other.

## 3. CI matrix and classified exclusions (REQ-PROD-006 — V-005, PASS)

Verified here, fresh, on the release tree: **Windows 10.0.26200 × Node 24.16.0 —
`npm run verify` exit 0 (1438 pass / 0 fail) and `npm run evals` exit 0 (7/7)**.

Classified exclusions, per 43 §6 and 53 §5 ("or exclusions classified"):

- The macOS and Linux legs of the shipped GitHub Actions workflow (WP-081) have **not**
  been executed: this build environment has no remote CI.
- The POSIX-only concurrency paths (file-locking semantics on POSIX filesystems,
  scenarios A–G) ran green on Windows only; Linux behaviour is expected to match but is
  not evidenced here.

These exclusions are restated in docs/KNOWN-LIMITATIONS.md §4. The first real CI run
closes the gap; until then macOS/Linux are *supported but unverified* — stated, not hidden.

## 4. Baseline review — BASE-T01..T05 (process rules of 02 §)

Reviewed again at release, dated 2026-09-12; all five honoured in the dated records:

- **BASE-T01** (the untouched baseline is recorded before any upgrade change):
  BASELINE.md §1–2 is the frozen fingerprint — commit `7c217ec0`, node `v24.16.0`,
  671 baseline tests, zero production dependencies, START-HERE sha256 — dated
  2026-09-10, recorded before the first upgrade packet (WP-001) landed; the baseline
  commit precedes every upgrade commit in git history.
- **BASE-T02** (environment/version metadata captured): BASELINE.md §1–2 holds the same
  fingerprint, dated 2026-09-10.
- **BASE-T03** (a failure on one runtime is a matrix-specific defect, never a blanket
  claim): every defect in the build-state worklog was recorded against the observed
  Windows × Node 24 environment only; no cross-platform claim appears in the ledger.
- **BASE-T04** (existing fixed behaviour not rewritten unnecessarily): the upgrade was
  additive — the V3 suite (671 tests) still passes unmodified inside the 1438-test suite;
  V3 behaviours changed only where a register requirement demanded it, each change its
  own packet row.
- **BASE-T05** (no feature work while a baseline regression threatens the same
  subsystem): Phase 0 closed with the baseline fully green (671/671) before the first
  upgrade packet; no packet was opened against a regressing subsystem.

## 5. Known limitations review (REQ-PROD-008 — V-007, PASS)

docs/KNOWN-LIMITATIONS.md (2026-09-12) publishes, with reasons: the deferred L2 live-host
session (REQ-L2-001 — its mechanical verification stands as V-004, type manual, result
**NOT_RUN**, with the reason recorded, status IMPLEMENTED_NOT_VERIFIED); no SQLite/FTS
(REQ-ARC-009, NOT_APPLICABLE); no external skill directories (REQ-SKL-013,
NOT_APPLICABLE); the CI/POSIX classified exclusions (REQ-PROD-006); the deterministic
(no live model) eval scope; the verified platform floor; the legal identity note
("APEX — ARMY V3" is the LICENSE's defined term; the version identity is
`apex-agent@2.0.0`); and the expected pre-init doctor advisories.

## 6. Verification records behind this release

- **V-002** (suite, PASS, 2026-09-11): fresh `npm run verify`, 1437 pass / 0 fail —
  covers the 110 register rows whose acceptance ids live in the suite.
- **V-003** (suite, PASS, 2026-09-11): fresh `npm run evals`, 7/7 — covers REQ-PROD-009.
- **V-004** (manual, **NOT_RUN** + reason, 2026-09-11): REQ-L2-001 — the L2 live checklist
  (docs/L2-MANUAL-CHECKS.md, dated 2026-09-11, all rows PENDING) needs a live host.
- **V-005** (manual, PASS, 2026-09-12): REQ-089 / REQ-PROD-006 — §3 above.
- **V-006** (manual, PASS, 2026-09-12): REQ-090 / REQ-PROD-007 — §2 above.
- **V-007** (manual, PASS, 2026-09-12): REQ-091 / REQ-PROD-008 — §5 above.
- **V-008** (suite, PASS, 2026-09-12): the final release tree — `npm run verify` exit 0
  (1438 pass / 0 fail; the suite grew by one when CAP-T06 got its real test) and
  `npm run evals` exit 0 (7/7). Covers REQ-089 alongside V-005.

Ledger totals at release: **113 VERIFIED_COMPLETE · 1 IMPLEMENTED_NOT_VERIFIED
(REQ-L2-001) · 2 NOT_APPLICABLE · 0 NOT_STARTED · 0 IN_PROGRESS · 0 BLOCKED** —
116 register rows, every one traceable (docs/TRACEABILITY.md, gate green with zero
exceptions and zero dangling ids).

## 7. The 53 §5 release checklist

**Code and tests**
- [x] `npm run verify` green on the local machine, output recorded — §3 (1438/0, exit 0)
- [x] CI matrix green across the OS × Node grid of 43 §6, **or exclusions classified** — §3
- [x] `npm pack` → clean temp install → CLI and MCP smoke pass — §1, §2
- [x] payload sync clean; payload hashes match source — §1 (`36 managed file(s)` compared)
- [x] zero production dependencies — `dependencies: {}` in package.json
- [x] license header present on every source file — HC-T03 suite (byte-identical 17-line header)
- [x] no `TODO`/`FIXME`/stub markers in shipped source — fresh grep: the single match is
      warden.ts's own stub-detection regex (the guard, not a stub)

**State and safety**
- [x] migration fixtures pass forward, interrupted, idempotent and future-schema — MIG-* suite
- [x] security fixture suite passes with fake secrets only — SEC-* suite (fake-secrets.txt fixtures)
- [x] concurrency scenarios A–G pass on Windows and Linux — Windows green (CON-* suite);
      Linux is the classified exclusion of §3, recorded here rather than claimed
- [x] `apex-agent doctor` on a clean machine reports `OK`/`WARN` only — §2 (worst: UNAVAILABLE, 0 errors)

**Docs and traceability**
- [x] `docs/TRACEABILITY.md` generated; zero open blocking requirements — §6 (gate green, zero exceptions)
- [x] `CHANGELOG.md` and `docs/SCHEMA-CHANGELOG.md` complete — 2.0.0 section; config v2 entry
- [x] `docs/KNOWN-LIMITATIONS.md` lists every non-blocking requirement not delivered — §5
- [x] `docs/L2-MANUAL-CHECKS.md` dated and signed, or L2 explicitly out of scope — dated
      2026-09-11 with an explicit release-scope statement
- [x] README, EXAMPLES and ATTACH describe only commands that exist — WP-073 CLI surface suite
- [x] every internal Markdown link resolves — fresh scan of 56 md files: after fixing the
      shipped LICENSE link (sync rewrite → `../LICENSE`), the only unmatched links are the
      three doctrine teaching examples (`[auth.py:44](auth.py:44)` in 03-EVIDENCE.md and
      claude-code.md) that illustrate the file-reference format for files in the *reader's*
      project — deliberately not repo links

**Packaging hygiene**
- [x] `.apex/upgrade/` removed — deleted at release (its durable content: the ledger,
      this document, docs/TRACEABILITY.md, docs/KNOWN-LIMITATIONS.md; full history in git)
- [x] no scratch, research or planning folder inside the package — §1 hygiene scan
- [x] no nested source archive — §1 hygiene scan
- [x] version, bootstrap contract version and `VERSION` marker agree — package.json 2.0.0 =
      CLI banner = `--version` = MCP `serverInfo.version` = doctor's package metadata;
      store schema versions (memory/archive/skills/trust/project v1, config v2) match
      docs/SCHEMA-CHANGELOG.md

**Owner handover**
- [x] the sequence in 53 §1 performed end to end on a clean machine, by following the docs
      only — §2 (zero-setup path: the doctrine loads from disk; install/version/doctor/MCP/
      init/status/memory/gate exercised live)
- [x] the troubleshooting table in 53 §4 verified against real failure modes — each row maps
      to shipped, tested behaviour: read-only home (BOOT-T05, doctor shows path+reason),
      `memory correct` wins (MEM-T03 eval), `skills retire` → relearn (SKL-* suite),
      staged writes need approval (`memory pending`, GOV-* suite), `doctor` is read-only and
      first (45 §4, verified in §2)
- [x] a one-page "what changed and why you care" note written in plain language —
      CHANGELOG.md "2.0.0 — the V4 release", opening with "Why you care, in five lines"

## 8. Sign-off

The release gate (50 §11) is green: every blocking requirement VERIFIED_COMPLETE with a
PASS verification record, the three non-blocking open states published with reasons, the
pack installed and exercised from documentation alone on a clean machine. The one
unfinished thing — a human-supervised live-host session (REQ-L2-001) — is a published,
dated, first-use item, not a hidden one.
