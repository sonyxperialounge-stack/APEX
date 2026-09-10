# QUESTIONS — assumptions made that a human should eventually confirm

None of these blocked work; each has a recorded decision in `.apex/DECISIONS.md` and the
build continued per the ambiguity policy (`52 §8`).

1. **Upgrade Ledger location.** The repository had no root `.apex/`. I created one and
   seeded the 112 requirement rows there, rather than mixing them into
   `runtime/.apex/REQUIREMENTS.md` (the runtime package's own dogfooding ledger, REQ-001..011,
   all closed). Confirm you are happy with the upgrade having its own project Ledger at the
   repository root. Reversible: rows can be re-seeded anywhere; the engine assigns ids.

2. **Phase 0 committed as a single commit** covering WP-001..WP-006 instead of six
   commits. The six packets share one artifact (`BASELINE.md`) written incrementally;
   per-packet commits would have required fabricating intermediate file states. Per-packet
   commit discipline applies from WP-010 onward.

3. **Node 22.6.x floor: NOT_RUN locally** (only Node v24.16.0 exists on this machine).
   Floor evidence is deferred to the existing CI matrix (node 22 + 24 on three OSes),
   which already matches `43 §6`. Confirm this is acceptable, or install a 22.x Node and
   I will run the suite on it.

4. **REQ-PROD-009 (behavioural eval suite) is priority N (non-blocking).** If not
   delivered, it must appear in `docs/KNOWN-LIMITATIONS.md`. Confirm whether you want it
   in this release (WP-085b plans it regardless; only its release-gate status is N).
