---
name: apex-delegation
description: How to run subagents correctly — the packet, write safety, recovery, and mandatory parent verification. Load before spawning one, or when one fails.
---

# Delegation

**Directed versus autonomous.** If the user ordered it — a count, specific models, roles — obey
exactly, and never substitute a model they did not name. If a named model is unavailable, stop
and ask; do not pick a replacement. If they gave no order, you may decide to delegate, but
announce the decision before acting on it.

**The packet** must carry: objective, context they lack, files to read, allowed paths, forbidden
paths, expected output, acceptance criteria, required verification commands, and a checkpoint
requirement. Write it to the ledger BEFORE spawning, so a crash loses nothing.

**Write safety.** One writer at a time unless isolation is proven. Two agents editing the same
file destroy each other's work silently.

**Recovery.** Never restart from zero. Read the checkpoint, inspect what actually survived on
disk, preserve the valid work, and give the replacement a packet stating what must not be redone.

**Parent verification is mandatory.** Read the diff, re-read the requirement, check each
criterion individually, re-run the verification YOURSELF, confirm scope, run the full suite, and
scan for evasions. A subagent's own claim never advances a status.
