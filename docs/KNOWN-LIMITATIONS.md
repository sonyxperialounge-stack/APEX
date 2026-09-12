# Known Limitations — APEX/ARMY (apex-agent 2.0.0, the V4 release)

Date: 2026-09-12. This document is part of the release (50 §9, REQ-PROD-008:
*known limitations published, not hidden*). Everything below is a conscious,
declared boundary of what this package does and does not do today. None of
these are hidden defects; each is either an optional feature deliberately not
built, or an environment fact this build cannot verify from here.

## 1. The L2 live-host session has not been manually exercised yet (REQ-L2-001)

Register row REQ-L2-001 (43 §3) asks for a dated manual record of one real
hosted session (a host such as OpenCode loading the APEX plugin, the runtime
enforcing the doctrine, and a human reviewing the result). The mechanical
verification for that row is recorded as NOT_RUN with that stated reason, and
the row stands at IMPLEMENTED_NOT_VERIFIED in `.apex/REQUIREMENTS.md`.

What this means in practice:

- Everything short of the live session is machine-verified: the plugin
  bootstrap, hook wiring, cortex assembly, memory, ledger and governor each
  have their own passing suite (see docs/TRACEABILITY.md).
- The MCP stdio server was handshaken by hand against the packed release
  (initialize + tools/list — see docs/RELEASE-VERIFICATION.md), but a full
  human-supervised hosted session has not happened yet.
- First real session on your machine completes this row. The checklist to
  follow is docs/L2-MANUAL-CHECKS.md.

## 2. No SQLite / full-text-search engine (REQ-ARC-009, 16 §3 / 42 §1)

The architecture record allows a SQLite/FTS store for archive and capability
search at scale. This release is deliberately dependency-free (zero runtime
dependencies — 42 §1), so archive search and capability search use sorted
files and substring/grep-class scanning instead.

- Consequence: on very large stores (tens of thousands of records) search is
  linear and slower than a database would be. Correctness is unaffected; the
  search suites (ARC-*, CAP-*) pass on the shipped implementation.
- Upgrading to SQLite later would add a native dependency and is a deliberate
  future decision, not an omission.

## 3. No external skill directories (REQ-SKL-013, 18 §9)

18 §9 declares external skill directory support *optional and explicit*. This
release ships global and project skill sources only (`~/.apex/skills` and the
project's `.apex/skills`), so a skill stored in an arbitrary third directory
is not discovered.

- Consequence: keep skills in the two supported locations. Promotion, trust
  and retirement flows (SKL-T01..T12) are verified for those locations.

## 4. CI matrix: Windows × Node 24 green; macOS/Linux legs are a classified exclusion (REQ-PROD-006, 43 §6)

The GitHub Actions workflow ships in the package (WP-081) and declares a
Windows/macOS/Linux matrix. This build environment has no remote CI, so:

- Verified here, on every `npm run verify`: Windows 10.0.26200 × Node 24.16.0 —
  the full suite (1437 tests) and all 7 evals run green from a clean state.
- Classified exclusion: the macOS and Linux legs, and the POSIX-only
  concurrency paths (file-locking semantics on POSIX filesystems), have **not**
  been executed in this environment. The lock code carries cross-process
  lock tests that pass on Windows; POSIX behaviour is expected to match but is
  not evidenced here. The first CI run on GitHub will close this gap; until
  then treat macOS/Linux as unverified-but-supported.

## 5. Evals are deterministic engine simulations, not live model calls

The 7 evals (`npm run evals`) drive the real engines with scripted
multi-turn inputs and assert on the engines' decisions. No external LLM is
called at eval time (the package has zero network dependencies). They prove
the doctrine machinery responds correctly; they do not measure any particular
host model's behaviour.

## 6. Verified platform floor

The declared floor is Node >= 22.6 (DOC-RUN-NODE). The release was verified
on Node 24.16.0 / Windows only. Other Node versions and operating systems are
supported by the same code paths but were not executed in this environment.

## 7. Legal identity is "APEX — ARMY V3" (deliberate)

The LICENSE defines "The Software" as **APEX — ARMY V3**, and that exact
identity is preserved in file headers and license text. The *version* identity
is separate and current: `apex-agent@2.0.0` (package.json), the CLI banner
(`APEX 2.0.0`), the MCP `serverInfo.version`, and the CHANGELOG entry
"2.0.0 — the V4 release". Do not rename the legal identity; it is the
license's own defined term.

## 8. Doctor's pre-init advisories are expected, not faults

On a clean machine, before you attach a host or init a project, doctor
reports WARN/UNAVAILABLE lines (no host binding, no ledger, empty stores).
These are the documented first-run states — each carries its own `fix:` hint,
and the repair loop (`apex-agent doctor --repair`) is verified from the packed
install (docs/RELEASE-VERIFICATION.md).
