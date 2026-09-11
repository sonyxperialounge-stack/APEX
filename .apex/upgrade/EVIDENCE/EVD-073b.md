# EVD-073b — WP-073b: memory journey / skills journey (54 §17)

## Result

`npm run verify` (typecheck + build + full suite + payload sync):

```
ℹ tests 1365
ℹ suites 302
ℹ pass 1365
ℹ fail 0
```

Baseline at packet start: 1362 pass. New file `test/cli/wp073b-journey.test.ts` adds 3 tests.

## Acceptance (packet spec: UX-T07 — "journey lists learned items chronologically with
their evidence ids and supports removing one")

| Requirement | Implementation | Test |
|---|---|---|
| `apex-agent memory journey` | new sub in `memory-cli.ts`: all records sorted by `createdAt` ascending, plain-language verbs (learned / learned, then superseded / learned, then retracted / proposed / conflicted / stale), source type per record, `evidence:` line from `provenance[].evidenceIds`, supersession named | "memory journey: chronological, plain-language, with evidence ids" — asserts oldest-first ordering by id position |
| `apex-agent skills journey` | new sub in `skills-cli.ts`: every `skills/<category>/<name>/.promotion.json` (forge promotions, with the new `evidenceIds` field) + every `skills/pending/*.json` (staged candidates, `stagedAt`), merged and sorted chronologically; seed/shipped skills are NOT entries — they are shipped knowledge, not learned | "skills journey: promotions with evidence, staged candidates" — asserts proposed-before-learned ordering |
| "with the evidence that justified it" | `skill-forge.ts` now persists `evidenceIds` in `.promotion.json` at promotion time (backward-compatible extra key); memory uses `provenance[].evidenceIds` | `evidence: V-0100, LRN-0007` and `evidence: V-0007, V-0012` asserted verbatim |
| "supports removing one" | `memory journey --forget <id>` retracts through the librarian (status retracted, still visible in the journey, marked — nothing deleted silently); `skills journey --forget <name>` archives through the same `retireSkillDir` path `retire` uses, destination named, body survives in `.archive` | both removals asserted end-to-end; unknown ids exit non-zero |
| 53 §3 design rules | `--forget` is the explicit removal flag; optional `--reason` recorded via `event("memory.forgotten")` / `event("skill.forgotten")` | covered by the removal tests |
| REQ-UX-004 | the owner sees a chronological, plain-language record of everything learned, with evidence, and can remove any item | the whole describe block |

## Surprises

- The forge deleted the pending record at promotion, losing the evidence ids that had
  justified it. The fix is at the source: `.promotion.json` now carries `evidenceIds`
  forward. Older promotions without the key render without an evidence line, never with
  a fabricated one.
- Retire logic existed only inline in the `retire` case; `journey --forget` needed the
  identical archive-don't-delete behaviour, so it was extracted into `retireSkillDir()`
  and both surfaces share it — one behaviour, not two.

## Files

- `~src/cli/memory-cli.ts` — `journey` sub + usage line
- `~src/cli/skills-cli.ts` — `journey` sub, `retireSkillDir` helper, usage line
- `~src/engines/skill-forge.ts` — `.promotion.json` gains `evidenceIds`
- `~src/cli/index.ts` — USAGE + COMMAND_HELP mention journey
- `+test/cli/wp073b-journey.test.ts` — 3 tests (UX-T07)
