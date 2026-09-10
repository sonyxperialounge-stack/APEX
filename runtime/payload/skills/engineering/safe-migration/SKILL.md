---
name: safe-migration
description: Migrate durable state with snapshot, migrate, validate, journal, rollback — never in place without a way back.
version: 1.0.0
status: active
scope: global
platforms: [windows, linux, macos]
requires.capabilities: [fs.read, fs.write, process.exec]
source.kind: builtin
security.executable_resources: false
---

# Goal
Change durable state so that a failure at any step leaves a path back to the previous state: snapshot first, migrate, validate, journal, and only then commit.

# Use when
Migrating schema, reindexing, rewriting stored files, or any change to durable state where a crash mid-way must not corrupt the store.

# Do not use when
The change is to throwaway or regenerable state — then a snapshot is wasted work; say why it is safe to skip.

# Preconditions
The current state is readable, the migration target is defined, and the store's schema version is known (29 §2).

# Required capabilities
fs.read, fs.write (state and snapshot), process.exec (to run the migration and its validation).

# Procedure
1. Snapshot: copy or hash the current state so the pre-migration content is recoverable. For files, copy; for stores, record the version and a backup path.
2. Migrate in place or to a temp location, never mixing old and new writes in one file.
3. Validate the migrated state against the migration's own checks: shape, counts, spot-reads.
4. Journal the outcome — the migration registry entry (29 §6) records what ran and whether it terminaled.
5. Only a validated migration is marked complete. A failed validation restores the snapshot.

# Verification
`apex-agent doctor` (or the store's own check) reports the migrated state as current, and the journal shows the migration terminaled.

# Failure branches
- Validation fails: restore the snapshot, mark the migration failed in the journal, and do not leave partial state behind.
- The journal entry is interrupted (crash mid-migration): `doctor --repair` terminales it and the store rebuilds its derived files.
- The snapshot itself is unreadable: stop; do not migrate from an unverifiable baseline.

# Rollback
Restore the snapshot; re-run from the snapshot if the migration is retried. Nothing is ever downgraded silently (29 §7).

# Known limits
Snapshots cost space — keep them until the next successful migration.

# References
`core/09-RECOVERY.md`; `core/29-STORE-SCHEMAS.md` if in the doctrine set; the migration journal (`apex-agent doctor` reports it).