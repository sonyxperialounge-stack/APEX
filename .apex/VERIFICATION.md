# Verification Log

| ID | REQ | Type | Command | Expected | Actual | Result |
|---|---|---|---|---|---|---|
| V-001 | REQ-084 | suite | `npm run verify` | exit code 0 | 671 pass, 0 fail, 0 cancelled, exit 0 (EVD-001, .apex/upgrade/EVIDENCE/) | PASS |
| V-002 | REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-011, REQ-012, REQ-013, REQ-014, REQ-015, REQ-016, REQ-017, REQ-018, REQ-019, REQ-020, REQ-021, REQ-022, REQ-023, REQ-024, REQ-025, REQ-026, REQ-027, REQ-028, REQ-029, REQ-030, REQ-031, REQ-032, REQ-033, REQ-034, REQ-035, REQ-036, REQ-037, REQ-038, REQ-039, REQ-040, REQ-041, REQ-042, REQ-043, REQ-044, REQ-045, REQ-046, REQ-047, REQ-048, REQ-049, REQ-050, REQ-051, REQ-052, REQ-053, REQ-054, REQ-055, REQ-056, REQ-057, REQ-058, REQ-059, REQ-060, REQ-061, REQ-062, REQ-063, REQ-064, REQ-065, REQ-066, REQ-067, REQ-068, REQ-069, REQ-070, REQ-071, REQ-072, REQ-073, REQ-074, REQ-075, REQ-076, REQ-077, REQ-078, REQ-079, REQ-080, REQ-081, REQ-082, REQ-083, REQ-085, REQ-086, REQ-087, REQ-088, REQ-092, REQ-093, REQ-094, REQ-095, REQ-096, REQ-097, REQ-098, REQ-099, REQ-100, REQ-101, REQ-102, REQ-103, REQ-104, REQ-105, REQ-106, REQ-107, REQ-108, REQ-109, REQ-110, REQ-112, REQ-113, REQ-114, REQ-115 | suite | `npm run verify (runtime/)` | exit code 0 — every register-referenced test id green in the suite | ℹ pass 1437 \| ℹ fail 0 \| ℹ cancelled 0 \| ℹ skipped 0 \| ℹ todo 0 \| ℹ duration_ms 52461.4684 | PASS |
| V-003 | REQ-111 | suite | `npm run evals (runtime/)` | all behavioural scenarios pass, results recorded honestly | ✔ resume-across-models     PASS  201ms \| ✔ skill-promotion          PASS  208ms \|  \| evals: 7/7 pass, 0 fail — recorded to evals/results/last-run.json | PASS |
| V-004 | REQ-116 | manual | `manual live-host session per docs/L2-MANUAL-CHECKS.md` | L2M-T01..T04 executed and recorded on a live host | not executed — needs a live L2 host session (operator release step) | NOT_RUN |

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
