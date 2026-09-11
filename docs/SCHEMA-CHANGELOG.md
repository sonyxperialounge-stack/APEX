# Schema changelog

Every durable store carries its own version number, and the versions move independently
(upgrade plan `29 §2`): a memory record can be at version 1 while the config is at version 2.
This file records, per release, which store moved and what moved in it.

The single registry of writer versions lives in `runtime/src/core/schema.ts`
(`CURRENT_SCHEMA`). Everything else — the config migration, the doctor report, the migration
runner — derives from it. If this file and that constant ever disagree, the constant is
wrong or this file is stale; both are bugs.

## The reading rules (`29 §7`–`§9`, `43 §5`)

| Situation | What the runtime does |
|---|---|
| Store version equals its writer version | Reads and writes normally. |
| Store version is older | Forward migration through the registry, journalled, snapshot/backup first. |
| Store version is newer | `READ_ONLY_FUTURE_SCHEMA` — read-only, never downgraded, never "migrated down". |
| No version marker at all | Legacy state: adopted after shape validation, never assumed current. |

A reader accepts its own version and the immediately previous one. A writer writes only its
own current version.

---

## 2.0.0 — the V4 release

The V4 release introduces the global APEX home and its stores. Their first shipped format is
version 1; only the project config moves to 2.

| Store | Writer version | Lives in | Changes in 2.0.0 |
|---|---|---|---|
| `config` | **2** | `<project>/.apex/config.json` and `config.json` in the APEX home | `schemaVersion` key added; new sections `context` (`learnedContextTokens`, `freezeHotSnapshot`), `skills` (`enabled`, `useGlobal`, `projectSkills`, `autoPromote`, `maxIndexTokens`), `capabilities` (`discovery`, `lazySchemas`, `aliasOverrides`), `memory` (`useGlobal`, `writePolicy`, `notifications`, `mirror`, `globalCategories`), `archive` (`detail`, `resumeCapsules`, `events`, `toolOutput`, `index`), `learning` (`extractOn`, `candidateScope`). |
| `memory` | 1 | `<home>/memory/` — `records.jsonl`, `state.json`, `pending/mutations.jsonl` | New store. |
| `archive` | 1 | `<home>/sessions/` — `sessions.jsonl`, `events/<SES-id>.jsonl`, `events/quarantine.jsonl` | New store. |
| `skills` | 1 | `<home>/skills/<name>/SKILL.md` | New store; the version lives in the SKILL.md frontmatter (`version` field, `18 §3`). |
| `trust` | 1 | `<home>/trust/skills.json` | New store; hash-bound grants. |
| `project` | 1 | `<home>/home.json` | New store — the home manifest itself. |

### The config migration (`MIG-config-1-to-2`)

A V3 config has no `schemaVersion`. On first load the runtime:

1. takes a lock (`.apex/locks/config-migrate.lock`) so two sessions cannot migrate at once;
2. backs the file up (`config.json.bak`, reference recorded in the journal);
3. rewrites it with `schemaVersion: 2` as the **first** key and every existing key —
   comments included — in its original order;
4. appends one entry to `<project>/.apex/migrations/journal.json`.

The journal (`schemaVersion: 1`) is the audit trail: `id`, `store`, `from`, `to`,
`startedAt`, `completedAt`, `status`, `backupRef`. An interrupted migration is found by
scanning the journal and resumed; a completed one is never re-run. Migration is idempotent:
a file that already carries `schemaVersion` is left untouched.

### What did *not* change

The project ledger files under `.apex/` (`REQUIREMENTS.md`, `VERIFICATION.md`,
`HANDOFF.md`, `FINDINGS.md`, `DECISIONS.md`, `PROGRESS.md`, `SUBAGENTS.md`,
`COMPLETION.md`, `MEMORY.md`, and the `snapshots/` directory) keep their V3 formats. An
untouched V3 project keeps working with no migration beyond the config stamp above.
