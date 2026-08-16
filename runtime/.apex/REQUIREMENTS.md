# Requirements

**Totals:** 11 total · 9 verified · 0 implemented-unverified · 2 in-progress · 0 not-started · 0 blocked · 0 n/a
**Last updated:** 2026-08-16T02:34:46.312Z

> Invariants: no row is ever deleted · no ID is ever reused · every row has exactly one
> status · the totals line is regenerated from the detail blocks below, so it cannot disagree.

| ID | Summary | Status | Evidence |
|---|---|---|---|
| REQ-001 | Core: redaction chokepoint, safe JSON/paths/exec/logging (CORE-001..009) | VERIFIED_COMPLETE | V-001, V-002, V-003, V-004, V-005, V-006 |
| REQ-002 | LEDGER: enforced transitions, mandatory evidence, handoff from state (LED-001..016) | VERIFIED_COMPLETE | V-001, V-002, V-003, V-004, V-005, V-006 |
| REQ-003 | VERIFIER: command detection, evidence cascade, regression attribution (VER-001..012) | VERIFIED_COMPLETE | V-001, V-002, V-003, V-004, V-005, V-006 |
| REQ-004 | GOVERNOR: four modes, hard blocklist, path protection, surgical rollback (GOV-001..013) | VERIFIED_COMPLETE | V-001, V-002, V-003, V-004, V-005, V-006 |
| REQ-005 | MCP server (L1): 16 apex_* tools with teaching rejections (MCP-001..011) | IN_PROGRESS | V-001, V-002, V-003, V-004, V-005, V-006 |
| REQ-006 | CLI + installer: attach/detach/doctor, non-destructive merge (INS-001..013) | VERIFIED_COMPLETE | V-001, V-002, V-003, V-004, V-005, V-006 |
| REQ-007 | CORTEX: system-prompt assembly, budgeting, priority degradation (COR-001..007) | VERIFIED_COMPLETE | V-001, V-002, V-003, V-004, V-005, V-006 |
| REQ-008 | OpenCode plugin (L2): 8 hooks, safe wrapper, companions, loader shim (PLG-001..017) | IN_PROGRESS | V-001, V-002, V-003, V-004, V-005, V-006 |
| REQ-009 | WARDEN + FLEET: packets, supervision, recovery, model substitution law (WAR-001..012, FLT-001..017) | VERIFIED_COMPLETE | V-001, V-002, V-003, V-004, V-005, V-006 |
| REQ-010 | RECALL: project memory, automatic capture, staleness, host mirroring (REC-001..007) | VERIFIED_COMPLETE | V-001, V-002, V-003, V-004, V-005, V-006 |
| REQ-011 | COUNCIL: convening gate, blind review, findings as hypotheses (CNC-001..008) | VERIFIED_COMPLETE | V-001, V-002, V-003, V-004, V-005, V-006 |

---

### REQ-001
- **Source:** build/ROADMAP.md Phase 0
- **Requirement:** Core: redaction chokepoint, safe JSON/paths/exec/logging (CORE-001..009)
- **Component:** 
- **Depends on:** 
- **Acceptance:** CORE-001..009 implemented, typecheck clean, tests green, build succeeds
- **Verify by:** `npm run verify`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-001, V-002, V-003, V-004, V-005, V-006
- **Notes:** 
- **Reason:** 

### REQ-002
- **Source:** build/ROADMAP.md Phase 1
- **Requirement:** LEDGER: enforced transitions, mandatory evidence, handoff from state (LED-001..016)
- **Component:** 
- **Depends on:** 
- **Acceptance:** LED-001..016 implemented, typecheck clean, tests green, build succeeds
- **Verify by:** `npm run verify`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-001, V-002, V-003, V-004, V-005, V-006
- **Notes:** 
- **Reason:** 

### REQ-003
- **Source:** build/ROADMAP.md Phase 2
- **Requirement:** VERIFIER: command detection, evidence cascade, regression attribution (VER-001..012)
- **Component:** 
- **Depends on:** 
- **Acceptance:** VER-001..012 implemented, typecheck clean, tests green, build succeeds
- **Verify by:** `npm run verify`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-001, V-002, V-003, V-004, V-005, V-006
- **Notes:** 
- **Reason:** 

### REQ-004
- **Source:** build/ROADMAP.md Phase 3
- **Requirement:** GOVERNOR: four modes, hard blocklist, path protection, surgical rollback (GOV-001..013)
- **Component:** 
- **Depends on:** 
- **Acceptance:** GOV-001..013 implemented, typecheck clean, tests green, build succeeds
- **Verify by:** `npm run verify`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-001, V-002, V-003, V-004, V-005, V-006
- **Notes:** 
- **Reason:** 

### REQ-005
- **Source:** build/ROADMAP.md Phase 4
- **Requirement:** MCP server (L1): 16 apex_* tools with teaching rejections (MCP-001..011)
- **Component:** 
- **Depends on:** 
- **Acceptance:** MCP-001..011 implemented, typecheck clean, tests green, build succeeds
- **Verify by:** `npm run verify`
- **Status:** IN_PROGRESS
- **Implemented in:** 
- **Evidence:** V-001, V-002, V-003, V-004, V-005, V-006
- **Notes:** 
- **Reason:** 

### REQ-006
- **Source:** build/ROADMAP.md Phase 5
- **Requirement:** CLI + installer: attach/detach/doctor, non-destructive merge (INS-001..013)
- **Component:** 
- **Depends on:** 
- **Acceptance:** INS-001..013 implemented, typecheck clean, tests green, build succeeds
- **Verify by:** `npm run verify`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-001, V-002, V-003, V-004, V-005, V-006
- **Notes:** 
- **Reason:** 

### REQ-007
- **Source:** build/ROADMAP.md Phase 6
- **Requirement:** CORTEX: system-prompt assembly, budgeting, priority degradation (COR-001..007)
- **Component:** 
- **Depends on:** 
- **Acceptance:** COR-001..007 implemented, typecheck clean, tests green, build succeeds
- **Verify by:** `npm run verify`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-001, V-002, V-003, V-004, V-005, V-006
- **Notes:** 
- **Reason:** 

### REQ-008
- **Source:** build/ROADMAP.md Phase 7
- **Requirement:** OpenCode plugin (L2): 8 hooks, safe wrapper, companions, loader shim (PLG-001..017)
- **Component:** 
- **Depends on:** 
- **Acceptance:** PLG-001..017 implemented, typecheck clean, tests green, build succeeds
- **Verify by:** `npm run verify`
- **Status:** IN_PROGRESS
- **Implemented in:** 
- **Evidence:** V-001, V-002, V-003, V-004, V-005, V-006
- **Notes:** 
- **Reason:** 

### REQ-009
- **Source:** build/ROADMAP.md Phase 8
- **Requirement:** WARDEN + FLEET: packets, supervision, recovery, model substitution law (WAR-001..012, FLT-001..017)
- **Component:** 
- **Depends on:** 
- **Acceptance:** WAR-001..012, FLT-001..017 implemented, typecheck clean, tests green, build succeeds
- **Verify by:** `npm run verify`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-001, V-002, V-003, V-004, V-005, V-006
- **Notes:** 
- **Reason:** 

### REQ-010
- **Source:** build/ROADMAP.md Phase 9
- **Requirement:** RECALL: project memory, automatic capture, staleness, host mirroring (REC-001..007)
- **Component:** 
- **Depends on:** 
- **Acceptance:** REC-001..007 implemented, typecheck clean, tests green, build succeeds
- **Verify by:** `npm run verify`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-001, V-002, V-003, V-004, V-005, V-006
- **Notes:** 
- **Reason:** 

### REQ-011
- **Source:** build/ROADMAP.md Phase 10
- **Requirement:** COUNCIL: convening gate, blind review, findings as hypotheses (CNC-001..008)
- **Component:** 
- **Depends on:** 
- **Acceptance:** CNC-001..008 implemented, typecheck clean, tests green, build succeeds
- **Verify by:** `npm run verify`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-001, V-002, V-003, V-004, V-005, V-006
- **Notes:** 
- **Reason:** 
