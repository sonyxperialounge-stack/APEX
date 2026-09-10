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

5. **"Phases 0-4 complete" vs six pending second-pass packets (found in audit).**
   The 2026-09-11 HANDOFF declared phases 0-4 COMPLETE while WP-026b, WP-041b,
   WP-042b, WP-047b, WP-049b and WP-049c — second-pass packets that live inside
   phases 2 and 4 — are still PENDING. Their dependencies are all satisfied, and
   `49` introduces them as "not optional extras". The phase exit gates as written
   in `35`/`49` do not name them, so the gates technically held; the word
   "COMPLETE" did not. HANDOFF is corrected to list them; the build continues
   with those six before Phase 5's WP-050. Confirm you agree they should land
   before Phase 6 (rather than being descoped to KNOWN-LIMITATIONS).

6. **Ledger VERIFIED_COMPLETE promotion timing.** `.apex/REQUIREMENTS.md` still
   shows only REQ-084 verified (baseline) even though 46 packets landed with
   passing suites. `EXECUTE.md` §11.4 makes "every blocking requirement
   VERIFIED_COMPLETE, traced to a verification id" a FINAL gate, and WP-088
   (traceability generation) is the packet that produces the full map — so
   batch promotion at WP-088 is the working assumption. If you want incremental
   promotion per phase instead, say so and the ladder will be exercised at the
   next phase boundary.
