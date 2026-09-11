# Requirements

**Totals:** 116 total · 110 verified · 1 implemented-unverified · 1 in-progress · 2 not-started · 0 blocked · 2 n/a
**Last updated:** 2026-09-11T23:02:25.897Z

> Invariants: no row is ever deleted · no ID is ever reused · every row has exactly one
> status · the totals line is regenerated from the detail blocks below, so it cannot disagree.

| ID | Summary | Status | Evidence |
|---|---|---|---|
| REQ-001 | REQ-BOOT-001: one instruction (read START-HERE.md) reaches a ready state for any capable file-reading model | VERIFIED_COMPLETE | V-002 |
| REQ-002 | REQ-BOOT-002: absent/read-only/volatile global home is named and degraded safely | VERIFIED_COMPLETE | V-002 |
| REQ-003 | REQ-BOOT-003: existing .apex state resumed, never overwritten | VERIFIED_COMPLETE | V-002 |
| REQ-004 | REQ-BOOT-004: tampered core manifest refuses mechanical trust, permits L0 | VERIFIED_COMPLETE | V-002 |
| REQ-005 | REQ-BOOT-005: two simultaneous first runs produce one valid structure | VERIFIED_COMPLETE | V-002 |
| REQ-006 | REQ-BOOT-006: future schema is read-only, never downgraded | VERIFIED_COMPLETE | V-002 |
| REQ-007 | REQ-BOOT-007: hundreds of skills/tools stay inside boot context budget | VERIFIED_COMPLETE | V-002 |
| REQ-008 | REQ-BOOT-008: a new model restores durable identity and open work | VERIFIED_COMPLETE | V-002 |
| REQ-009 | REQ-BOOT-009: START-HERE within estimated-token ceiling | VERIFIED_COMPLETE | V-002 |
| REQ-010 | REQ-HOME-001: filesystem root/empty/system-wide home refused | VERIFIED_COMPLETE | V-002 |
| REQ-011 | REQ-HOME-002: project facts never appear in an unrelated project | VERIFIED_COMPLETE | V-002 |
| REQ-012 | REQ-HOME-003: project can disable global memory categories | VERIFIED_COMPLETE | V-002 |
| REQ-013 | REQ-HOME-004: direct writes to global home outside chokepoints blocked at L1/L2 | VERIFIED_COMPLETE | V-002 |
| REQ-014 | REQ-HOME-005: instruction-shaped memory never rendered as authority | VERIFIED_COMPLETE | V-002 |
| REQ-015 | REQ-HOME-006: extension/external-skill hash drift invalidates trust | VERIFIED_COMPLETE | V-002 |
| REQ-016 | REQ-HOME-007: portable mode never enabled silently | VERIFIED_COMPLETE | V-002 |
| REQ-017 | REQ-HOME-008: provider credentials never in identity or global store | VERIFIED_COMPLETE | V-002 |
| REQ-018 | REQ-HOME-009: global root ~/.apex/; ~/.army/ reported, never auto-migrated | VERIFIED_COMPLETE | V-002 |
| REQ-019 | REQ-MEM-001: explicit durable preference survives model change | VERIFIED_COMPLETE | V-002 |
| REQ-020 | REQ-MEM-002: concurrent writers cannot silently lose an accepted record | VERIFIED_COMPLETE | V-002 |
| REQ-021 | REQ-MEM-003: likely secrets rejected/redacted before durable persistence | VERIFIED_COMPLETE | V-002 |
| REQ-022 | REQ-MEM-004: session-start snapshot frozen; live correction via overlay | VERIFIED_COMPLETE | V-002 |
| REQ-023 | REQ-MEM-005: expired item never injected | VERIFIED_COMPLETE | V-002 |
| REQ-024 | REQ-MEM-006: hot views deletable and rebuildable, no data loss | VERIFIED_COMPLETE | V-002 |
| REQ-025 | REQ-MEM-007: explicit correction supersedes with auditable chain | VERIFIED_COMPLETE | V-002 |
| REQ-026 | REQ-MEM-008: unresolved conflicts recorded, never both-injected | VERIFIED_COMPLETE | V-002 |
| REQ-027 | REQ-MEM-009: Devanagari and Hinglish round-trip and are searchable | VERIFIED_COMPLETE | V-002 |
| REQ-028 | REQ-MEM-010: read-only session performs zero durable global writes | VERIFIED_COMPLETE | V-002 |
| REQ-029 | REQ-MEM-011: project memory keeps six sections, human-readable | VERIFIED_COMPLETE | V-002 |
| REQ-030 | REQ-MEM-012: personal facts never mirrored into shared instruction files | VERIFIED_COMPLETE | V-002 |
| REQ-031 | REQ-MEM-013: memory list/inspect/correct/retract/approve/export/disable without editing internals | VERIFIED_COMPLETE | V-002 |
| REQ-032 | REQ-ARC-001: file-capable L0 resumes from compact capsule, no database | VERIFIED_COMPLETE | V-002 |
| REQ-033 | REQ-ARC-002: prior session found by real recorded content with provenance | VERIFIED_COMPLETE | V-002 |
| REQ-034 | REQ-ARC-003: destroying derived index loses no canonical history | VERIFIED_COMPLETE | V-002 |
| REQ-035 | REQ-ARC-004: chat-only L0 honestly reports durable archive unavailable | VERIFIED_COMPLETE | V-002 |
| REQ-036 | REQ-ARC-005: secret-bearing output redacted via one chokepoint | VERIFIED_COMPLETE | V-002 |
| REQ-037 | REQ-ARC-006: prune never removes verification evidence; dry-run supported | VERIFIED_COMPLETE | V-002 |
| REQ-038 | REQ-ARC-007: project-scoped query cannot retrieve another project private events | VERIFIED_COMPLETE | V-002 |
| REQ-039 | REQ-ARC-008: detaching a host binding never deletes personal/project state | VERIFIED_COMPLETE | V-002 |
| REQ-040 | REQ-SKL-001: verified repeated workflow becomes candidate; writing file never activates | VERIFIED_COMPLETE | V-002 |
| REQ-041 | REQ-SKL-002: activation requires platform, capabilities, trust, validation | VERIFIED_COMPLETE | V-002 |
| REQ-042 | REQ-SKL-003: changing executable content invalidates prior trust/validation | VERIFIED_COMPLETE | V-002 |
| REQ-043 | REQ-SKL-004: user fast-promotion only via recorded override, never presented as verified | VERIFIED_COMPLETE | V-002 |
| REQ-044 | REQ-SKL-005: large catalogue loads metadata only; bodies/references on demand | VERIFIED_COMPLETE | V-002 |
| REQ-045 | REQ-SKL-006: discovered script never executes automatically | VERIFIED_COMPLETE | V-002 |
| REQ-046 | REQ-SKL-007: curator never silently deletes a user skill | VERIFIED_COMPLETE | V-002 |
| REQ-047 | REQ-SKL-008: using a skill does not rewrite SKILL.md | VERIFIED_COMPLETE | V-002 |
| REQ-048 | REQ-SKL-009: project-supplied skills off by default, never self-trusting | VERIFIED_COMPLETE | V-002 |
| REQ-049 | REQ-SKL-010: subagent cannot directly write global skill/memory record | VERIFIED_COMPLETE | V-002 |
| REQ-050 | REQ-SKL-011: unverified failed task creates no active skill and no global fact | VERIFIED_COMPLETE | V-002 |
| REQ-051 | REQ-SKL-012: curation and learning require no daemon | VERIFIED_COMPLETE | V-002 |
| REQ-052 | REQ-CAP-001: equivalent host tools normalize to one canonical id | VERIFIED_COMPLETE | V-002 |
| REQ-053 | REQ-CAP-002: large catalogues do not require all schemas at startup | VERIFIED_COMPLETE | V-002 |
| REQ-054 | REQ-CAP-003: missing capability reported UNAVAILABLE; no pretend call | VERIFIED_COMPLETE | V-002 |
| REQ-055 | REQ-CAP-004: unknown external tool never optimistically read-only | VERIFIED_COMPLETE | V-002 |
| REQ-056 | REQ-CAP-005: capability exposure never bypasses Governor | VERIFIED_COMPLETE | V-002 |
| REQ-057 | REQ-CAP-006: exactly one effects taxonomy across all subsystems | VERIFIED_COMPLETE | V-002 |
| REQ-058 | REQ-CAP-007: discovery performs no destructive probe | VERIFIED_COMPLETE | V-002 |
| REQ-059 | REQ-CAP-008: disconnect/hash drift invalidates cached schemas without daemon | VERIFIED_COMPLETE | V-002 |
| REQ-060 | REQ-AUT-001: code/research/artifact/data/system tasks use domain-appropriate evidence | VERIFIED_COMPLETE | V-002 |
| REQ-061 | REQ-AUT-002: autonomy never bypasses Governor approval for destructive/external effects | VERIFIED_COMPLETE | V-002 |
| REQ-062 | REQ-AUT-003: open goal persists and resumes with no heartbeat/gateway/service | VERIFIED_COMPLETE | V-002 |
| REQ-063 | REQ-AUT-004: learned memory/skills never override a current requirement | VERIFIED_COMPLETE | V-002 |
| REQ-064 | REQ-AUT-005: requested artifact physically validated before completion | VERIFIED_COMPLETE | V-002 |
| REQ-065 | REQ-AUT-006: no second goal database | VERIFIED_COMPLETE | V-002 |
| REQ-066 | REQ-AUT-007: changed project fingerprint forces resume revalidation | VERIFIED_COMPLETE | V-002 |
| REQ-067 | REQ-AUT-008: child cannot close parent task or grant itself scope | VERIFIED_COMPLETE | V-002 |
| REQ-068 | REQ-AUT-009: Council agreement never treated as verification | VERIFIED_COMPLETE | V-002 |
| REQ-069 | REQ-AUT-010: unchanged failing attempt cannot loop | VERIFIED_COMPLETE | V-002 |
| REQ-070 | REQ-AUT-011: failing test never fixed by deleting it | VERIFIED_COMPLETE | V-002 |
| REQ-071 | REQ-AUT-012: unknown failure stays explicitly unknown | VERIFIED_COMPLETE | V-002 |
| REQ-072 | REQ-DAT-001: every durable entity declares a schema version | VERIFIED_COMPLETE | V-002 |
| REQ-073 | REQ-DAT-002: ids stable across migration, never recycled | VERIFIED_COMPLETE | V-002 |
| REQ-074 | REQ-DAT-003: no two documents/stores claim writable authority over same state | VERIFIED_COMPLETE | V-002 |
| REQ-075 | REQ-DAT-004: broken cross-store reference surfaced by Doctor | VERIFIED_COMPLETE | V-002 |
| REQ-076 | REQ-MIG-001: interrupted migration recovers without canonical corruption | VERIFIED_COMPLETE | V-002 |
| REQ-077 | REQ-MIG-002: legacy versionless state adopted non-destructively after snapshot | VERIFIED_COMPLETE | V-002 |
| REQ-078 | REQ-MIG-003: declared compatibility window executable in CI | VERIFIED_COMPLETE | V-002 |
| REQ-079 | REQ-SEC-001: persistent learned text cannot change policy precedence | VERIFIED_COMPLETE | V-002 |
| REQ-080 | REQ-SEC-002: path traversal from project cannot reach global home | VERIFIED_COMPLETE | V-002 |
| REQ-081 | REQ-SEC-003: Windows permission reporting never claims POSIX guarantees | VERIFIED_COMPLETE | V-002 |
| REQ-082 | REQ-SEC-004: no mandatory telemetry/network call at bootstrap | VERIFIED_COMPLETE | V-002 |
| REQ-083 | REQ-SEC-005: every new source file carries the license header | VERIFIED_COMPLETE | V-002 |
| REQ-084 | REQ-PROD-001: untouched baseline recorded before upgrade changes | VERIFIED_COMPLETE | V-001 |
| REQ-085 | REQ-PROD-002: source tree and packed artifact both tested | VERIFIED_COMPLETE | V-002 |
| REQ-086 | REQ-PROD-003: every persistent store has tested migration + future-schema behaviour | VERIFIED_COMPLETE | V-002 |
| REQ-087 | REQ-PROD-004: release package free of scratch paths and nested archives | VERIFIED_COMPLETE | V-002 |
| REQ-088 | REQ-PROD-005: zero production dependencies remain | VERIFIED_COMPLETE | V-002 |
| REQ-089 | REQ-PROD-006: OS x Node matrix green or documented classified exclusion | IN_PROGRESS | — |
| REQ-090 | REQ-PROD-007: non-developer can install, verify, use from documentation alone | NOT_STARTED | — |
| REQ-091 | REQ-PROD-008: known limitations published, not hidden | NOT_STARTED | — |
| REQ-092 | REQ-UX-001: normal start requires exactly one instruction | VERIFIED_COMPLETE | V-002 |
| REQ-093 | REQ-UX-002: readiness output follows the five-line contract | VERIFIED_COMPLETE | V-002 |
| REQ-094 | REQ-UX-003: staged write never described as saved | VERIFIED_COMPLETE | V-002 |
| REQ-095 | REQ-CAP-009: deferred capability discoverable, describable AND invokable, fully governed | VERIFIED_COMPLETE | V-002 |
| REQ-096 | REQ-CAP-010: disclosure degrades through three tiers; eager when budget allows | VERIFIED_COMPLETE | V-002 |
| REQ-097 | REQ-CAP-011: every operation carries an execution context, most conservative default | VERIFIED_COMPLETE | V-002 |
| REQ-098 | REQ-CAP-012: host code intelligence used when present, never faked when absent | VERIFIED_COMPLETE | V-002 |
| REQ-099 | REQ-SKL-014: fallback skill hidden when the better capability exists | VERIFIED_COMPLETE | V-002 |
| REQ-100 | REQ-SKL-015: env var NAMES declarable; values never read or requested | VERIFIED_COMPLETE | V-002 |
| REQ-101 | REQ-SKL-016: seed skills ship, install, update without clobbering user edits | VERIFIED_COMPLETE | V-002 |
| REQ-102 | REQ-SKL-017: at most three skill bodies per task, selection explainable | VERIFIED_COMPLETE | V-002 |
| REQ-103 | REQ-SKL-018: deny verdict never overridable; review needs recorded justification | VERIFIED_COMPLETE | V-002 |
| REQ-104 | REQ-SKL-019: retirement archives; pins protected; curation interval-bounded | VERIFIED_COMPLETE | V-002 |
| REQ-105 | REQ-MEM-014: hot-view overflow produces consolidation candidate, never loses canonical record | VERIFIED_COMPLETE | V-002 |
| REQ-106 | REQ-SEC-006: sensitive paths denied by default; exact-path audited overrides only | VERIFIED_COMPLETE | V-002 |
| REQ-107 | REQ-SEC-007: bulk attachments respect soft and hard context guards | VERIFIED_COMPLETE | V-002 |
| REQ-108 | REQ-AUT-013: child agent cannot interact with user, schedule, message, or write global state | VERIFIED_COMPLETE | V-002 |
| REQ-109 | REQ-AUT-014: delegation depth/budget/stall bounded; child resources cleaned up | VERIFIED_COMPLETE | V-002 |
| REQ-110 | REQ-EXT-002: policy/gate hooks fail closed; capture hooks fail open and record loss | VERIFIED_COMPLETE | V-002 |
| REQ-111 | REQ-PROD-009 (N): behavioural eval suite exists, runnable, honestly reported | VERIFIED_COMPLETE | V-003 |
| REQ-112 | REQ-UX-004: chronological plain-language record of everything learned (journey) | VERIFIED_COMPLETE | V-002 |
| REQ-113 | REQ-EXT-001: optional extension contract implemented end to end | VERIFIED_COMPLETE | V-002 |
| REQ-114 | REQ-ARC-009: optional accelerated index (built-in SQLite/FTS) when the runtime provides one | NOT_APPLICABLE | V-002 |
| REQ-115 | REQ-SKL-013: external skill directories interop | NOT_APPLICABLE | V-002 |
| REQ-116 | REQ-L2-001: full L2 host-native enforcement checks executed on a live host | IMPLEMENTED_NOT_VERIFIED | V-004 |

---

### REQ-001
- **Source:** 50 §1
- **Requirement:** REQ-BOOT-001: one instruction (read START-HERE.md) reaches a ready state for any capable file-reading model
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** L0C-T05, SH-T03 green; START-HERE review
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-002
- **Source:** 50 §1
- **Requirement:** REQ-BOOT-002: absent/read-only/volatile global home is named and degraded safely
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** HOME-T01, BOOT-T05 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-003
- **Source:** 50 §1
- **Requirement:** REQ-BOOT-003: existing .apex state resumed, never overwritten
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** BOOT-T03 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-004
- **Source:** 50 §1
- **Requirement:** REQ-BOOT-004: tampered core manifest refuses mechanical trust, permits L0
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** BOOT-T04 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-005
- **Source:** 50 §1
- **Requirement:** REQ-BOOT-005: two simultaneous first runs produce one valid structure
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** BOOT-T02 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-006
- **Source:** 50 §1
- **Requirement:** REQ-BOOT-006: future schema is read-only, never downgraded
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** BOOT-T06, MIG-T02 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-007
- **Source:** 50 §1
- **Requirement:** REQ-BOOT-007: hundreds of skills/tools stay inside boot context budget
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** BOOT-T07, CTX-T01, CTX-T02 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-008
- **Source:** 50 §1
- **Requirement:** REQ-BOOT-008: a new model restores durable identity and open work
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** BOOT-T08, ID-T01 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-009
- **Source:** 50 §1
- **Requirement:** REQ-BOOT-009: START-HERE within estimated-token ceiling
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** SH-T01, PERF-T08 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-010
- **Source:** 50 §2
- **Requirement:** REQ-HOME-001: filesystem root/empty/system-wide home refused
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** HOME-T01, SEC-T03 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-011
- **Source:** 50 §2
- **Requirement:** REQ-HOME-002: project facts never appear in an unrelated project
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** HOME-T02, ID-T05 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-012
- **Source:** 50 §2
- **Requirement:** REQ-HOME-003: project can disable global memory categories
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** HOME-T03, CFG-T06 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-013
- **Source:** 50 §2
- **Requirement:** REQ-HOME-004: direct writes to global home outside chokepoints blocked at L1/L2
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** HOME-T04 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-014
- **Source:** 50 §2
- **Requirement:** REQ-HOME-005: instruction-shaped memory never rendered as authority
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** HOME-T05, SH-T05, SEC-T01 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-015
- **Source:** 50 §2
- **Requirement:** REQ-HOME-006: extension/external-skill hash drift invalidates trust
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** HOME-T06, EXT-T03, SKSEC-T02 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-016
- **Source:** 50 §2
- **Requirement:** REQ-HOME-007: portable mode never enabled silently
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** HOME-T07 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-017
- **Source:** 50 §2
- **Requirement:** REQ-HOME-008: provider credentials never in identity or global store
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** ID-T03, SEC-T02 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-018
- **Source:** 50 §2
- **Requirement:** REQ-HOME-009: global root ~/.apex/; ~/.army/ reported, never auto-migrated
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** NAM-T01, NAM-T04 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-019
- **Source:** 50 §3
- **Requirement:** REQ-MEM-001: explicit durable preference survives model change
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** MEM-T01 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-020
- **Source:** 50 §3
- **Requirement:** REQ-MEM-002: concurrent writers cannot silently lose an accepted record
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** MEM-CON-T01..T07 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-021
- **Source:** 50 §3
- **Requirement:** REQ-MEM-003: likely secrets rejected/redacted before durable persistence
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** MEM-T04, SEC-T02 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-022
- **Source:** 50 §3
- **Requirement:** REQ-MEM-004: session-start snapshot frozen; live correction via overlay
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** CTX-T03, CTX-T04 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-023
- **Source:** 50 §3
- **Requirement:** REQ-MEM-005: expired item never injected
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** MEM-T05 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-024
- **Source:** 50 §3
- **Requirement:** REQ-MEM-006: hot views deletable and rebuildable, no data loss
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** MEM-T06 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-025
- **Source:** 50 §3
- **Requirement:** REQ-MEM-007: explicit correction supersedes with auditable chain
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** MEM-T03 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-026
- **Source:** 50 §3
- **Requirement:** REQ-MEM-008: unresolved conflicts recorded, never both-injected
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** MEM-T03 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-027
- **Source:** 50 §3
- **Requirement:** REQ-MEM-009: Devanagari and Hinglish round-trip and are searchable
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** SEC-T08 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-028
- **Source:** 50 §3
- **Requirement:** REQ-MEM-010: read-only session performs zero durable global writes
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** PERF-T07, LIFE-T02 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-029
- **Source:** 50 §3
- **Requirement:** REQ-MEM-011: project memory keeps six sections, human-readable
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** PMEM-T01 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-030
- **Source:** 50 §3
- **Requirement:** REQ-MEM-012: personal facts never mirrored into shared instruction files
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** PMEM-T03, PMEM-T04 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-031
- **Source:** 50 §3
- **Requirement:** REQ-MEM-013: memory list/inspect/correct/retract/approve/export/disable without editing internals
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** CLI tests in WP-073 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-032
- **Source:** 50 §4
- **Requirement:** REQ-ARC-001: file-capable L0 resumes from compact capsule, no database
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** ARC-T01 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-033
- **Source:** 50 §4
- **Requirement:** REQ-ARC-002: prior session found by real recorded content with provenance
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** ARC-T03, SRCH-T01 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-034
- **Source:** 50 §4
- **Requirement:** REQ-ARC-003: destroying derived index loses no canonical history
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** ARC-T05, SRCH-T05 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-035
- **Source:** 50 §4
- **Requirement:** REQ-ARC-004: chat-only L0 honestly reports durable archive unavailable
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** ARC-T02 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-036
- **Source:** 50 §4
- **Requirement:** REQ-ARC-005: secret-bearing output redacted via one chokepoint
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** ARC-T04 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-037
- **Source:** 50 §4
- **Requirement:** REQ-ARC-006: prune never removes verification evidence; dry-run supported
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** SRCH-T03, SRCH-T04 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-038
- **Source:** 50 §4
- **Requirement:** REQ-ARC-007: project-scoped query cannot retrieve another project private events
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** SRCH-T06 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-039
- **Source:** 50 §4
- **Requirement:** REQ-ARC-008: detaching a host binding never deletes personal/project state
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** CLI test green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-040
- **Source:** 50 §5
- **Requirement:** REQ-SKL-001: verified repeated workflow becomes candidate; writing file never activates
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** FORGE-T01, LRNT-T01 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-041
- **Source:** 50 §5
- **Requirement:** REQ-SKL-002: activation requires platform, capabilities, trust, validation
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** SKL-T03 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-042
- **Source:** 50 §5
- **Requirement:** REQ-SKL-003: changing executable content invalidates prior trust/validation
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** SKSEC-T02 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-043
- **Source:** 50 §5
- **Requirement:** REQ-SKL-004: user fast-promotion only via recorded override, never presented as verified
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** FORGE-T02, FORGE-T05 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-044
- **Source:** 50 §5
- **Requirement:** REQ-SKL-005: large catalogue loads metadata only; bodies/references on demand
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** SKL-T01, SKL-T02 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-045
- **Source:** 50 §5
- **Requirement:** REQ-SKL-006: discovered script never executes automatically
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** SKSEC-T01, SEC-T06 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-046
- **Source:** 50 §5
- **Requirement:** REQ-SKL-007: curator never silently deletes a user skill
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** SKSEC-T03 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-047
- **Source:** 50 §5
- **Requirement:** REQ-SKL-008: using a skill does not rewrite SKILL.md
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** SKSEC-T04 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-048
- **Source:** 50 §5
- **Requirement:** REQ-SKL-009: project-supplied skills off by default, never self-trusting
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** CFG-T07, SEC-T05 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-049
- **Source:** 50 §5
- **Requirement:** REQ-SKL-010: subagent cannot directly write global skill/memory record
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** LRNT-T03, FLT-T02 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-050
- **Source:** 50 §5
- **Requirement:** REQ-SKL-011: unverified failed task creates no active skill and no global fact
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** LRNT-T01 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-051
- **Source:** 50 §5
- **Requirement:** REQ-SKL-012: curation and learning require no daemon
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** LRNT-T05, LIFE-T01 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-052
- **Source:** 50 §6
- **Requirement:** REQ-CAP-001: equivalent host tools normalize to one canonical id
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** CAP-T01 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-053
- **Source:** 50 §6
- **Requirement:** REQ-CAP-002: large catalogues do not require all schemas at startup
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** TLS-T01, TLS-T02 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-054
- **Source:** 50 §6
- **Requirement:** REQ-CAP-003: missing capability reported UNAVAILABLE; no pretend call
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** CAP-T05, TLS-T07, AUT-T03 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-055
- **Source:** 50 §6
- **Requirement:** REQ-CAP-004: unknown external tool never optimistically read-only
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** CAP-T02 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-056
- **Source:** 50 §6
- **Requirement:** REQ-CAP-005: capability exposure never bypasses Governor
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** CAP-T04 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-057
- **Source:** 50 §6
- **Requirement:** REQ-CAP-006: exactly one effects taxonomy across all subsystems
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** CAP-T07 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-058
- **Source:** 50 §6
- **Requirement:** REQ-CAP-007: discovery performs no destructive probe
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** TLS-T05 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-059
- **Source:** 50 §6
- **Requirement:** REQ-CAP-008: disconnect/hash drift invalidates cached schemas without daemon
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** CAP-T06, TLS-T04 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-060
- **Source:** 50 §7
- **Requirement:** REQ-AUT-001: code/research/artifact/data/system tasks use domain-appropriate evidence
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** AUT-T01, AUT-T02 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-061
- **Source:** 50 §7
- **Requirement:** REQ-AUT-002: autonomy never bypasses Governor approval for destructive/external effects
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** AUT-T06 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-062
- **Source:** 50 §7
- **Requirement:** REQ-AUT-003: open goal persists and resumes with no heartbeat/gateway/service
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** AUT-T05 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-063
- **Source:** 50 §7
- **Requirement:** REQ-AUT-004: learned memory/skills never override a current requirement
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** AUT-T04, CTX-T05 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-064
- **Source:** 50 §7
- **Requirement:** REQ-AUT-005: requested artifact physically validated before completion
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** AUT-T07 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-065
- **Source:** 50 §7
- **Requirement:** REQ-AUT-006: no second goal database
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** TASK-T01 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-066
- **Source:** 50 §7
- **Requirement:** REQ-AUT-007: changed project fingerprint forces resume revalidation
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** TASK-T03 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-067
- **Source:** 50 §7
- **Requirement:** REQ-AUT-008: child cannot close parent task or grant itself scope
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** FLT-T01, TASK-T04 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-068
- **Source:** 50 §7
- **Requirement:** REQ-AUT-009: Council agreement never treated as verification
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** FLT-T04 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-069
- **Source:** 50 §7
- **Requirement:** REQ-AUT-010: unchanged failing attempt cannot loop
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** RCV-T01 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-070
- **Source:** 50 §7
- **Requirement:** REQ-AUT-011: failing test never fixed by deleting it
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** RCV-T05 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-071
- **Source:** 50 §7
- **Requirement:** REQ-AUT-012: unknown failure stays explicitly unknown
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** RCV-T06 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-072
- **Source:** 50 §8
- **Requirement:** REQ-DAT-001: every durable entity declares a schema version
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** DAT-T01 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-073
- **Source:** 50 §8
- **Requirement:** REQ-DAT-002: ids stable across migration, never recycled
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** DAT-T02, MIG-T04 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-074
- **Source:** 50 §8
- **Requirement:** REQ-DAT-003: no two documents/stores claim writable authority over same state
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** DAT-T04 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-075
- **Source:** 50 §8
- **Requirement:** REQ-DAT-004: broken cross-store reference surfaced by Doctor
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** DAT-T06, DOC-T05 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-076
- **Source:** 50 §8
- **Requirement:** REQ-MIG-001: interrupted migration recovers without canonical corruption
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** MIG-T01 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-077
- **Source:** 50 §8
- **Requirement:** REQ-MIG-002: legacy versionless state adopted non-destructively after snapshot
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** MIG-T03 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-078
- **Source:** 50 §8
- **Requirement:** REQ-MIG-003: declared compatibility window executable in CI
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** MIG-T07 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-079
- **Source:** 50 §8
- **Requirement:** REQ-SEC-001: persistent learned text cannot change policy precedence
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** SEC-T01 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-080
- **Source:** 50 §8
- **Requirement:** REQ-SEC-002: path traversal from project cannot reach global home
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** SEC-T04 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-081
- **Source:** 50 §8
- **Requirement:** REQ-SEC-003: Windows permission reporting never claims POSIX guarantees
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** SEC-T07 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-082
- **Source:** 50 §8
- **Requirement:** REQ-SEC-004: no mandatory telemetry/network call at bootstrap
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** PERF-T05 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-083
- **Source:** 50 §8
- **Requirement:** REQ-SEC-005: every new source file carries the license header
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** PKG-T08 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-084
- **Source:** 50 §9
- **Requirement:** REQ-PROD-001: untouched baseline recorded before upgrade changes
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** BASE-T01..T05; EVD-001 recorded
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-001
- **Notes:** 
- **Reason:** 

### REQ-085
- **Source:** 50 §9
- **Requirement:** REQ-PROD-002: source tree and packed artifact both tested
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** PKG-T01..T07 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-086
- **Source:** 50 §9
- **Requirement:** REQ-PROD-003: every persistent store has tested migration + future-schema behaviour
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** MIG-T01..T07 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-087
- **Source:** 50 §9
- **Requirement:** REQ-PROD-004: release package free of scratch paths and nested archives
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** PKG-T02, PKG-T03 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-088
- **Source:** 50 §9
- **Requirement:** REQ-PROD-005: zero production dependencies remain
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** sourcescan CORE-003 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-089
- **Source:** 50 §9
- **Requirement:** REQ-PROD-006: OS x Node matrix green or documented classified exclusion
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** CI matrix green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** IN_PROGRESS
- **Implemented in:** 
- **Evidence:** 
- **Notes:** 
- **Reason:** 

### REQ-090
- **Source:** 50 §9
- **Requirement:** REQ-PROD-007: non-developer can install, verify, use from documentation alone
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** manual, dated record
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** NOT_STARTED
- **Implemented in:** 
- **Evidence:** 
- **Notes:** 
- **Reason:** 

### REQ-091
- **Source:** 50 §9
- **Requirement:** REQ-PROD-008: known limitations published, not hidden
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** docs/KNOWN-LIMITATIONS.md review
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** NOT_STARTED
- **Implemented in:** 
- **Evidence:** 
- **Notes:** 
- **Reason:** 

### REQ-092
- **Source:** 50 §9
- **Requirement:** REQ-UX-001: normal start requires exactly one instruction
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** L0C-T05 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-093
- **Source:** 50 §9
- **Requirement:** REQ-UX-002: readiness output follows the five-line contract
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** SH-T03 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-094
- **Source:** 50 §9
- **Requirement:** REQ-UX-003: staged write never described as saved
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** SH-T06 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-095
- **Source:** 54 §22
- **Requirement:** REQ-CAP-009: deferred capability discoverable, describable AND invokable, fully governed
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** TLS-T08..T10 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-096
- **Source:** 54 §22
- **Requirement:** REQ-CAP-010: disclosure degrades through three tiers; eager when budget allows
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** TLS-T11, PERF-T09, PERF-T10 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-097
- **Source:** 54 §22
- **Requirement:** REQ-CAP-011: every operation carries an execution context, most conservative default
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** CAP-T08, CAP-T09 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-098
- **Source:** 54 §22
- **Requirement:** REQ-CAP-012: host code intelligence used when present, never faked when absent
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** CAP-T10, AUT-T08 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-099
- **Source:** 54 §22
- **Requirement:** REQ-SKL-014: fallback skill hidden when the better capability exists
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** SKL-T06 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-100
- **Source:** 54 §22
- **Requirement:** REQ-SKL-015: env var NAMES declarable; values never read or requested
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** SKL-T07, SEC-T09 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-101
- **Source:** 54 §22
- **Requirement:** REQ-SKL-016: seed skills ship, install, update without clobbering user edits
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** SKL-T08..T10, PKG-T09 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-102
- **Source:** 54 §22
- **Requirement:** REQ-SKL-017: at most three skill bodies per task, selection explainable
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** SKL-T11, SKL-T12 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-103
- **Source:** 54 §22
- **Requirement:** REQ-SKL-018: deny verdict never overridable; review needs recorded justification
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** SKSEC-T06 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-104
- **Source:** 54 §22
- **Requirement:** REQ-SKL-019: retirement archives; pins protected; curation interval-bounded
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** SKSEC-T07..T09, LIFE-T08 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-105
- **Source:** 54 §22
- **Requirement:** REQ-MEM-014: hot-view overflow produces consolidation candidate, never loses canonical record
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** MEM-T08, MEM-T09 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-106
- **Source:** 54 §22
- **Requirement:** REQ-SEC-006: sensitive paths denied by default; exact-path audited overrides only
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** SEC-T10, SEC-T11 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-107
- **Source:** 54 §22
- **Requirement:** REQ-SEC-007: bulk attachments respect soft and hard context guards
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** CTX-T07 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-108
- **Source:** 54 §22
- **Requirement:** REQ-AUT-013: child agent cannot interact with user, schedule, message, or write global state
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** FLT-T07 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-109
- **Source:** 54 §22
- **Requirement:** REQ-AUT-014: delegation depth/budget/stall bounded; child resources cleaned up
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** FLT-T08..T11 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-110
- **Source:** 54 §22
- **Requirement:** REQ-EXT-002: policy/gate hooks fail closed; capture hooks fail open and record loss
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** EXT-T08..T11 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-111
- **Source:** 54 §22
- **Requirement:** REQ-PROD-009 (N): behavioural eval suite exists, runnable, honestly reported
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** EVAL-T01, EVAL-T02
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-003
- **Notes:** 
- **Reason:** 

### REQ-112
- **Source:** 54 §22
- **Requirement:** REQ-UX-004: chronological plain-language record of everything learned (journey)
- **Component:** army-v4 upgrade
- **Depends on:** 
- **Acceptance:** UX-T07 green
- **Verify by:** `npm run verify (runtime/) + packet-specific verify command`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-113
- **Source:** 50 §10
- **Requirement:** REQ-EXT-001: optional extension contract implemented end to end
- **Component:** 
- **Depends on:** 
- **Acceptance:** EXT-T01, EXT-T02, EXT-T03, EXT-T04, EXT-T05, EXT-T06, EXT-T07 green — discover, hash, trust, deny/review verdicts; fail-closed gate hooks are REQ-EXT-002 (EXT-T08..T11)
- **Verify by:** `npm run verify (runtime/)`
- **Status:** VERIFIED_COMPLETE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 

### REQ-114
- **Source:** 50 §10
- **Requirement:** REQ-ARC-009: optional accelerated index (built-in SQLite/FTS) when the runtime provides one
- **Component:** 
- **Depends on:** 
- **Acceptance:** declared non-blocking — canonical file-backed search (SRCH-T01..T07) already meets the blocking archive requirements; no built-in SQLite/FTS exists in a dependency-free runtime
- **Verify by:** `release-scope review (50 §10, doc 16 §3)`
- **Status:** NOT_APPLICABLE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 16 §3 offers the accelerated index only "when the runtime provides one"; the runtime is deliberately dependency-free (42 §1), so there is no built-in SQLite/FTS to accelerate. Canonical file-backed search already meets the blocking archive requirements (SRCH-T01..T07). Declared non-blocking (50 §10).

### REQ-115
- **Source:** 50 §10
- **Requirement:** REQ-SKL-013: external skill directories interop
- **Component:** 
- **Depends on:** 
- **Acceptance:** declared non-blocking — optional per 18 §9 ("Support is optional and must be explicit"); global and project skill sources are shipped and covered (SKL-T01..T12)
- **Verify by:** `release-scope review (50 §10, doc 18 §9)`
- **Status:** NOT_APPLICABLE
- **Implemented in:** 
- **Evidence:** V-002
- **Notes:** 
- **Reason:** 18 §9 declares external skill directory support optional ("Support is optional and must be explicit"). The runtime ships global and project skill sources (SKL-T01..T12) without additional external directories — a conscious omission, published in docs/KNOWN-LIMITATIONS.md at release (WP-089). Declared non-blocking (50 §10).

### REQ-116
- **Source:** 50 §10
- **Requirement:** REQ-L2-001: full L2 host-native enforcement checks executed on a live host
- **Component:** 
- **Depends on:** 
- **Acceptance:** L2M-T01, L2M-T02, L2M-T03, L2M-T04 executed per docs/L2-MANUAL-CHECKS.md on a live host, with the dated release-scope statement recorded
- **Verify by:** `manual live-host session (docs/L2-MANUAL-CHECKS.md)`
- **Status:** IMPLEMENTED_NOT_VERIFIED
- **Implemented in:** 
- **Evidence:** V-004
- **Notes:** 
- **Reason:** 
