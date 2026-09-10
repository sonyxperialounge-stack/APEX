# NO-REGRESSION — frozen 2026-09-10

Every behaviour from `42 §11` (HC-010), the test file that proves it, the named tests inside
that file, and its recorded state in the untouched baseline run (WP-002: 671 pass, 0 fail,
exit 0 — EVD-001). Any upgrade commit that turns one of these red is a defect, not a design
choice.

| # | Behaviour (`42 §11`) | Proving test file | Named tests (from the suite sources) | WP-002 state |
|---|---|---|---|---|
| 1 | 22 `apex_*` MCP tools keep names, argument shapes, error semantics | `test/mcp/server.test.ts` | the tool-contract tests across the file (22 tools listed in `src/mcp/tools.ts`) | GREEN (in 671/671, exit 0) |
| 2 | Requirement status machine + illegal-transition errors | `test/engines/ledger.test.ts` | LED-transition suite incl. illegal-transition assertions | GREEN |
| 3 | Verify cascade order parse → types → lint → unit → suite → build → runtime | `test/engines/verifier.test.ts` | VER-cascade tests (`CASCADE_ORDER` assertions) | GREEN |
| 4 | Governor decision shape `{allowed, rule, reason, requiresSnapshot, ask}` | `test/engines/governor.test.ts` | GOV decision-shape tests | GREEN |
| 5 | `UserDecisionRequired` on unavailable user-named models — no substitution | `test/engines/warden.test.ts` | warden model-substitution tests | GREEN |
| 6 | Payload sync root ↔ `runtime/payload/**` | `test/cli/payload.test.ts`, `test/cli/packaging.test.ts` | payload sync + packaging suites | GREEN |

## Source-scan invariants that guard these (also GREEN in WP-002)

From `test/sourcescan.test.ts` — observed in the run tail (EVD-001):

- `erasable-syntax discipline` — no enums, no parameter properties, no namespaces (HC-001)
- `CORE-003 — dependency discipline` — zero runtime dependencies, imports node: + relative only
- `MCP-001 — stdout is reserved for the protocol` — only `src/mcp/server.ts` writes stdout
- `CORE-005` scan — no direct file writes outside `src/core/json.ts` / `src/core/log.ts`
- `no leftover TODO/FIXME/stub markers in shipped source`

## Rule for every later packet

`npm run verify` must pass before any packet is recorded DONE, and the six behaviours above
must never regress. Payload note from `42 §11`: any doctrine file added or edited at the
repository root (`core/`, `adapters/`, `templates/`, `START-HERE.md`, `README.md`,
`EXAMPLES.md`, `LEGAL-NOTICE.md`) must be re-synced via `npm run sync:payload` in the same
commit or the packaging tests fail.
