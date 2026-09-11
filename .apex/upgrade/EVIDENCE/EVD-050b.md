# EVD-050b — Code-intelligence capability ids (WP-050b)

Date: 2026-09-11 · Packet: WP-050b · Branch: upgrade/army-v4

## Context

54 §14 (amending 21 §2 and 24 §3): APEX must not install language servers —
that is a dependency, an install step and a background process, breaking
C-002/C-018 and the zero-dependency contract. What it can do is NAME the
capability so it is used when a host already provides it.

## What was built

- `codeIntelligenceId(hostToolName)` in `capability-registry.ts`: normalizes
  >= 2 differently named host tools per canonical id among
  `code.diagnostics`, `code.symbols`, `code.references`, `code.definition`,
  `code.rename` (CAP-T10). Unknown names return null — never guessed.
- `codeIntelligenceDescriptor(hostToolName, source, opts)`: builds a
  registry-ready descriptor; only `code.rename` carries WRITE (54 §14); all
  others are READ. Registry round-trips it (register/select).
- Diagnostics evidence slot in the verify cascade: `VERIFY_TYPES` +
  `CASCADE_ORDER` grew `"diagnostics"` between `parse` and `types` (cheap
  first), with TIMEOUTS 0 — it never runs a command. The cascade injects one
  `diagnostics` record from the host-reported message when
  `capabilities.hostDiagnostics` is on (new `ApexCapabilitiesConfig`:
  `hostDiagnostics: true`, `diagnosticsMessage: ""`, merged in the ledger and
  documented in both config templates). Clean host message → PASS with the
  strength wording "strong for THIS edit, weaker than the test suite";
  empty message → NOT_RUN with "never reported as failure"; disabled → no
  record at all. Records never stop the cascade (except a FAIL short-circuit
  under stopAtFirstFailure) and never substitute for a required test tier.

## Verify

`npm run verify` -> 1072 pass, 0 fail, exit 0 (31.1s).

## Acceptance mapping

| Id | How |
|---|---|
| CAP-T10 | table-driven: 11 host-tool → canonical pairs; per-canonical >= 2 distinct host aliases |
| AUT-T08 | diagnostics recorded with correct strength; suite tier still required (NOT_RUN when absent) |

## Surprises

1. ApexConfig has no `capabilities` block yet — added `ApexCapabilitiesConfig`
   (54 §20 lists new Phase 5 config keys) with ledger merges and template
   entries; the config-schema template-key test caught the missing template
   copy, now present in both `templates/config.json` and the payload copy.
2. `diagnostics` must appear in `VERIFY_TYPES` before `CASCADE_ORDER` can use
   it; the ledger's `VerifyType` cast accepts the new tier unchanged.

## Next

WP-052 (host discovery: listTools/describeTool/onCapabilityChange).