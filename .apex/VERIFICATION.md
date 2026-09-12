# Verification Log

| ID | REQ | Type | Command | Expected | Actual | Result |
|---|---|---|---|---|---|---|
| V-001 | REQ-084 | suite | `npm run verify` | exit code 0 | 671 pass, 0 fail, 0 cancelled, exit 0 (EVD-001, .apex/upgrade/EVIDENCE/) | PASS |
| V-002 | REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-011, REQ-012, REQ-013, REQ-014, REQ-015, REQ-016, REQ-017, REQ-018, REQ-019, REQ-020, REQ-021, REQ-022, REQ-023, REQ-024, REQ-025, REQ-026, REQ-027, REQ-028, REQ-029, REQ-030, REQ-031, REQ-032, REQ-033, REQ-034, REQ-035, REQ-036, REQ-037, REQ-038, REQ-039, REQ-040, REQ-041, REQ-042, REQ-043, REQ-044, REQ-045, REQ-046, REQ-047, REQ-048, REQ-049, REQ-050, REQ-051, REQ-052, REQ-053, REQ-054, REQ-055, REQ-056, REQ-057, REQ-058, REQ-059, REQ-060, REQ-061, REQ-062, REQ-063, REQ-064, REQ-065, REQ-066, REQ-067, REQ-068, REQ-069, REQ-070, REQ-071, REQ-072, REQ-073, REQ-074, REQ-075, REQ-076, REQ-077, REQ-078, REQ-079, REQ-080, REQ-081, REQ-082, REQ-083, REQ-085, REQ-086, REQ-087, REQ-088, REQ-092, REQ-093, REQ-094, REQ-095, REQ-096, REQ-097, REQ-098, REQ-099, REQ-100, REQ-101, REQ-102, REQ-103, REQ-104, REQ-105, REQ-106, REQ-107, REQ-108, REQ-109, REQ-110, REQ-112, REQ-113, REQ-114, REQ-115 | suite | `npm run verify (runtime/)` | exit code 0 — every register-referenced test id green in the suite | ℹ pass 1437 \| ℹ fail 0 \| ℹ cancelled 0 \| ℹ skipped 0 \| ℹ todo 0 \| ℹ duration_ms 52461.4684 | PASS |
| V-003 | REQ-111 | suite | `npm run evals (runtime/)` | all behavioural scenarios pass, results recorded honestly | ✔ resume-across-models     PASS  201ms \| ✔ skill-promotion          PASS  208ms \|  \| evals: 7/7 pass, 0 fail — recorded to evals/results/last-run.json | PASS |
| V-004 | REQ-116 | manual | `manual live-host session per docs/L2-MANUAL-CHECKS.md` | L2M-T01..T04 executed and recorded on a live host | not executed — needs a live L2 host session (operator release step) | NOT_RUN |
| V-005 | REQ-089 | manual | `npm run verify (Windows 10.0.26200 x Node 24.16.0) + exclusion review of 43 §6 grid` | Windows x Node 24 leg green; macOS/Linux/POSIX legs classified as documented exclusions | verify exit 0 — 1437 pass / 0 fail on Windows x Node 24.16.0; macOS/Linux and POSIX concurrency legs recorded as classified exclusions (no remote CI in this bui | PASS |
| V-006 | REQ-090 | manual | `npm pack -> npm install apex-agent-2.0.0.tgz in a clean temp project with a clean APEX_HOME` | install, --version, doctor, MCP stdio handshake, init/status/memory/gate, doctor --repair all succeed following the shipped docs only | apex-agent 2.0.0 installed from the pack; --version printed 2.0.0; doctor exit 0 (worst UNAVAILABLE, packaged mode OK); MCP initialize returned serverInfo apex/ | PASS |
| V-007 | REQ-091 | manual | `review of docs/KNOWN-LIMITATIONS.md against the register's open and NOT_APPLICABLE rows` | every non-delivered or deferred requirement is published with its reason | docs/KNOWN-LIMITATIONS.md (2026-09-12) publishes REQ-L2-001 (live-host session deferred), REQ-ARC-009 (no SQLite/FTS), REQ-SKL-013 (no external skill dirs), the | PASS |
| V-008 | REQ-089 | suite | `npm run verify && npm run evals (final release tree)` | exit 0 on both | verify exit 0 — 1438 pass / 0 fail; evals exit 0 — 7/7 pass, 0 fail (2026-09-12) | PASS |

> A log with no FAIL and no NOT_RUN rows over a long project is not excellence — it is
> evidence that verification was not really happening.

## Evidence

### V-001
- **Requirements:** REQ-084
- **Type:** suite
- **Command:** `npm run verify`
- **Expected:** exit code 0
- **Result:** PASS
- **Exit code:** 0
- **Duration:** 25686
- **Context:** local
- **Timestamp:** 2026-09-10T05:43:21.195Z
- **Reason:** 

```text
671 pass, 0 fail, 0 cancelled, exit 0 (EVD-001, .apex/upgrade/EVIDENCE/)
```

### V-002
- **Requirements:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-011, REQ-012, REQ-013, REQ-014, REQ-015, REQ-016, REQ-017, REQ-018, REQ-019, REQ-020, REQ-021, REQ-022, REQ-023, REQ-024, REQ-025, REQ-026, REQ-027, REQ-028, REQ-029, REQ-030, REQ-031, REQ-032, REQ-033, REQ-034, REQ-035, REQ-036, REQ-037, REQ-038, REQ-039, REQ-040, REQ-041, REQ-042, REQ-043, REQ-044, REQ-045, REQ-046, REQ-047, REQ-048, REQ-049, REQ-050, REQ-051, REQ-052, REQ-053, REQ-054, REQ-055, REQ-056, REQ-057, REQ-058, REQ-059, REQ-060, REQ-061, REQ-062, REQ-063, REQ-064, REQ-065, REQ-066, REQ-067, REQ-068, REQ-069, REQ-070, REQ-071, REQ-072, REQ-073, REQ-074, REQ-075, REQ-076, REQ-077, REQ-078, REQ-079, REQ-080, REQ-081, REQ-082, REQ-083, REQ-085, REQ-086, REQ-087, REQ-088, REQ-092, REQ-093, REQ-094, REQ-095, REQ-096, REQ-097, REQ-098, REQ-099, REQ-100, REQ-101, REQ-102, REQ-103, REQ-104, REQ-105, REQ-106, REQ-107, REQ-108, REQ-109, REQ-110, REQ-112, REQ-113, REQ-114, REQ-115
- **Type:** suite
- **Command:** `npm run verify (runtime/)`
- **Expected:** exit code 0 — every register-referenced test id green in the suite
- **Result:** PASS
- **Exit code:** 0
- **Duration:** 0
- **Context:** local
- **Timestamp:** 2026-09-11T23:02:23.157Z
- **Reason:** 

```text
ℹ pass 1437 | ℹ fail 0 | ℹ cancelled 0 | ℹ skipped 0 | ℹ todo 0 | ℹ duration_ms 52461.4684
```

### V-003
- **Requirements:** REQ-111
- **Type:** suite
- **Command:** `npm run evals (runtime/)`
- **Expected:** all behavioural scenarios pass, results recorded honestly
- **Result:** PASS
- **Exit code:** 0
- **Duration:** 0
- **Context:** local
- **Timestamp:** 2026-09-11T23:02:23.178Z
- **Reason:** 

```text
✔ resume-across-models     PASS  201ms | ✔ skill-promotion          PASS  208ms |  | evals: 7/7 pass, 0 fail — recorded to evals/results/last-run.json
```

### V-004
- **Requirements:** REQ-116
- **Type:** manual
- **Command:** `manual live-host session per docs/L2-MANUAL-CHECKS.md`
- **Expected:** L2M-T01..T04 executed and recorded on a live host
- **Result:** NOT_RUN
- **Exit code:** null
- **Duration:** 0
- **Context:** local
- **Timestamp:** 2026-09-11T23:02:23.189Z
- **Reason:** The L2 live checklist and its dated release-scope statement shipped in WP-086 (docs/L2-MANUAL-CHECKS.md, L2M-T01..T04); execution requires a real host session and is the operator's release step. Published in docs/KNOWN-LIMITATIONS.md (WP-089). Declared non-blocking (50 §10).

```text
not executed — needs a live L2 host session (operator release step)
```

### V-005
- **Requirements:** REQ-089
- **Type:** manual
- **Command:** `npm run verify (Windows 10.0.26200 x Node 24.16.0) + exclusion review of 43 §6 grid`
- **Expected:** Windows x Node 24 leg green; macOS/Linux/POSIX legs classified as documented exclusions
- **Result:** PASS
- **Exit code:** 0
- **Duration:** 0
- **Context:** docs/RELEASE-VERIFICATION.md
- **Timestamp:** 2026-09-12T01:50:54.042Z
- **Reason:** 

```text
verify exit 0 — 1437 pass / 0 fail on Windows x Node 24.16.0; macOS/Linux and POSIX concurrency legs recorded as classified exclusions (no remote CI in this build environment) in docs/RELEASE-VERIFICATION.md
```

### V-006
- **Requirements:** REQ-090
- **Type:** manual
- **Command:** `npm pack -> npm install apex-agent-2.0.0.tgz in a clean temp project with a clean APEX_HOME`
- **Expected:** install, --version, doctor, MCP stdio handshake, init/status/memory/gate, doctor --repair all succeed following the shipped docs only
- **Result:** PASS
- **Exit code:** 0
- **Duration:** 0
- **Context:** docs/RELEASE-VERIFICATION.md
- **Timestamp:** 2026-09-12T01:50:54.062Z
- **Reason:** 

```text
apex-agent 2.0.0 installed from the pack; --version printed 2.0.0; doctor exit 0 (worst UNAVAILABLE, packaged mode OK); MCP initialize returned serverInfo apex/2.0.0 and tools/list listed the toolset; init, status, memory add/list and the gate's honest empty-ledger refusal all behaved as documented; doctor --repair reconstructed the home and cleared its warning. Dated record: docs/RELEASE-VERIFICATION.md
```

### V-007
- **Requirements:** REQ-091
- **Type:** manual
- **Command:** `review of docs/KNOWN-LIMITATIONS.md against the register's open and NOT_APPLICABLE rows`
- **Expected:** every non-delivered or deferred requirement is published with its reason
- **Result:** PASS
- **Exit code:** 0
- **Duration:** 0
- **Context:** docs/RELEASE-VERIFICATION.md
- **Timestamp:** 2026-09-12T01:50:54.076Z
- **Reason:** 

```text
docs/KNOWN-LIMITATIONS.md (2026-09-12) publishes REQ-L2-001 (live-host session deferred), REQ-ARC-009 (no SQLite/FTS), REQ-SKL-013 (no external skill dirs), the CI/POSIX exclusions, eval scope, the platform floor, the legal identity note and the pre-init advisories
```

### V-008
- **Requirements:** REQ-089
- **Type:** suite
- **Command:** `npm run verify && npm run evals (final release tree)`
- **Expected:** exit 0 on both
- **Result:** PASS
- **Exit code:** 0
- **Duration:** 0
- **Context:** docs/RELEASE-VERIFICATION.md
- **Timestamp:** 2026-09-12T02:05:05.852Z
- **Reason:** 

```text
verify exit 0 — 1438 pass / 0 fail; evals exit 0 — 7/7 pass, 0 fail (2026-09-12)
```
