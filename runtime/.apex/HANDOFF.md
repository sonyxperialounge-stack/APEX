# Handoff — 2026-08-16T01:56:05.085Z
## Objective
Implement: ../build/REQUIREMENTS.md, ../build/ROADMAP.md, ../build/ENGINES.md
Project root: D:\multiworker opencode\Army-V3\runtime
## Sources of truth
- ../build/REQUIREMENTS.md
- ../build/ROADMAP.md
- ../build/ENGINES.md
## User restrictions
- Never read: (none)
- Never modify: ../core/, ../adapters/, ../templates/, ../START-HERE.md
- Autonomy: GUARDED
## State
11/11 requirements verified. Full table: REQUIREMENTS.md
- VERIFIED_COMPLETE: 11
## Architecture you need to know
Engines are host-agnostic with injected I/O; mcp/, cli/ and plugin/ are thin adapters over them. Engines never import from adapters.
## Commands
- types: `npx tsc --noEmit`
- suite: `npm test`
- build: `npm run build`
## Environment
Node 24, TypeScript 5.9 as a devDependency only, zero runtime deps. Tests use node --test with native type stripping.
## Known failures
- none
- V-001 NOT_RUN — `` No parse command is configured for this project.
- V-003 NOT_RUN — `` No lint command is configured for this project.
- V-004 NOT_RUN — `` No unit command is configured for this project.
## Subagents
- none open
## RESUME
Start from: All 11 phases are verified. Remaining work is live verification on a real OpenCode install (build/TESTING.md manual checklist).
Do not redo: REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-011
Verify first: npm run verify
Watch out: Never publish without `npm run build` — raw .ts cannot run under node_modules.
