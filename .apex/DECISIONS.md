# Decision Log

## D-001 — Upgrade Ledger at the repository root (2026-09-10, Phase 0)

The plan (`52 §4`) says upgrade requirements live in "the existing `.apex/`" — but the
repository has two candidate Ledgers: `runtime/.apex/` (the runtime package's own
dogfooding ledger, 11 closed REQ rows) and no root ledger. Decision: create a fresh root
`.apex/` for the upgrade. Protects C-005 (one ledger owns completion truth per project) —
mixing the upgrade's 112 rows into the runtime's ledger would conflate two projects'
authority and rewrite a closed historical record. Reversible.

## D-002 — STATE.json carries an explicit dependencies map and packetOrder (2026-09-10, WP-005)

`52 §2`'s schema is the minimum. I added `packetOrder` (phase reading order) and
`dependencies` (every packet's Dep list, from `49` + `54 §21` insertions) as additive
fields so a successor agent can mechanically select the next packet without re-deriving
the graph from two long documents. Protects the resume protocol (`52 §7`): resumption must
depend only on files, not transcript memory. All `52 §2` fields kept their names and
semantics.

## D-003 — Phase 0 lands as one commit (2026-09-10)

WP-001..WP-006 all write into the same small set of new files (`BASELINE.md` grows across
four packets; STATE.json references BASELINE's content). Six commits would have required
fabricating intermediate states of a frozen document. One commit, six worklog entries, all
evidence recorded. Per-packet commit discipline begins with WP-010.

## D-004 — Baseline requirement closed via the Ledger's own legal path (2026-09-10, WP-004)

REQ-PROD-001 (baseline recorded) was driven NOT_STARTED → IN_PROGRESS →
IMPLEMENTED_NOT_VERIFIED → VERIFIED_COMPLETE with verification V-001 (suite PASS, exit 0,
EVD-001) recorded through `Ledger.addVerification` — not by hand-editing REQUIREMENTS.md.
Protects the Ledger's own invariant (no status without evidence) and demonstrates the
product's discipline in the build itself.
