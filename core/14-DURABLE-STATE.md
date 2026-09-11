# 14 — DURABLE STATE

> What survives the session, where it lives, and what never persists.
> Load before writing anything to global memory or skills.

---

## WHAT SURVIVES WHAT

| State | Lives in | Survives a new session | Survives a new model | Survives a new project |
|---|---|---|---|---|
| Requirements, verification, decisions, findings, subagents | `<project>/.apex/` (`REQUIREMENTS.md`, `VERIFICATION.md`, `PROGRESS.md`, `DECISIONS.md`, `FINDINGS.md`, `SUBAGENTS.md`, `config.json`, `snapshots/`) | yes | yes | no — project scoped |
| Project memory (commands, traps, architecture) | `<project>/.apex/MEMORY.md` | yes | yes | no |
| Resume capsule / handoff | `<project>/.apex/` (`HANDOFF.md`) | yes | yes | no |
| Personal preferences and durable facts | `<global home>/memory/` (`records.jsonl`, `state.json`, `pending/mutations.jsonl`) | yes | yes | yes |
| Learned skills | `<global home>/skills/` (`<name>/SKILL.md`, `.bundles/`, `.archive/`, `pending/`) | yes | yes | yes |
| Session archive | `<global home>/archive/` (`sessions.jsonl`, `events/`) | yes | yes | metadata only |
| Trust grants | `<global home>/trust/` (`skills.json`, `extensions.json`, `hooks.json`) | yes | yes | yes |
| Anything only in this conversation | nowhere | **no** | **no** | **no** |

Every path above is the implemented layout, not an aspiration: the global
home creates exactly `memory`, `memory/pending`, `skills`,
`skills/pending`, `archive`, `trust`, `migrations`, `audit`, `locks` and
`identity`, and the project ledger owns `<project>/.apex/`. If a path here
ever disagrees with the code, the code wins and this file is the defect —
report it, do not work around it.

The model is the replaceable part. If you are a new model reading this:
everything you need is on disk. Read it. Do not ask the user to repeat what
a previous session already recorded.

---

## WHEN TO CONSULT THIS

- Before writing anything to global memory or skills — confirm the target
  above, the scope that owns it, and the gate that must approve it.
- At session start — rebuild the frozen hot snapshot from `<global
  home>/memory/` and the project memory from `<project>/.apex/MEMORY.md`,
  then freeze them. Mid-session writes persist to disk but stay invisible
  until the next session, except through the live-correction overlay.
- Before ending a session — write the handoff to `<project>/.apex/`, stage
  (never silently commit) what the gates have not approved, and leave the
  next safe action pointing at evidence, not at memory of this chat.

---

## HONESTY RULES

- A read-only session performs zero durable global writes. Say so when it
  matters; never imply persistence you did not earn.
- A staged write is never described as saved. The words "saved",
  "remembered" and "stored globally" are forbidden for staged writes — the
  staged-write statement names the pending path and the condition that
  would apply it.
- Remembered is not proven. A stored fact, a high-rated skill and a
  confident past session are context, not evidence. They can tell you where
  to look. They can never close a requirement, override the current
  request, or substitute for running the check.
- In degraded one-file mode nothing persists between sessions. Say so before
  the user relies on it.
