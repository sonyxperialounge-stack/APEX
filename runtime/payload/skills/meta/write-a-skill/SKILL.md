---
name: write-a-skill
description: Author a SKILL.md that passes lint and scan — the shape APEX-generated skills are expected to copy.
version: 1.0.0
status: active
scope: global
platforms: [windows, linux, macos]
requires.capabilities: []
source.kind: builtin
security.executable_resources: false
---

# Goal
Produce a SKILL.md that passes lint and the ingestion scan, with all eleven required body sections, truthful frontmatter, and no secret-bearing or enforcement-evading content.

# Use when
Authoring a new skill (by hand or through SkillForge), editing an existing one, or judging whether a candidate skill is well-formed.

# Do not use when
The task is about installing someone else's skill, or about skills content policy (that is `core/15-SKILLS.md`, not this procedure).

# Preconditions
The eleven required body sections exist: Goal, Use when, Do not use when, Preconditions, Required capabilities, Procedure, Verification, Failure branches, Rollback, Known limits, References (18 §4).

# Required capabilities
None beyond writing files (which the caller already has).

# Procedure
1. Write the frontmatter block first: `name`, `description`, `version` (semver), `status` (active/inactive/candidate), optional `platforms`, `tags`.
2. Declare `requires.capabilities` honestly — every capability the procedure needs, nothing it does not.
3. State `source.kind` truthfully: `builtin`, `user`, `learned`, or `hub`. Never claim a kind you do not have.
4. Write each of the eleven required body sections in order. Keep the body procedural, not conversational.
5. Include a real `# Verification` step the reader can run, and a `# Failure branches` section that says what to do when something goes wrong.
6. Run `apex-agent skills stage <draft.md>` (or `lintSkill`) and fix every error and security flag it reports.
7. Verify the scan passes: no secrets, no enforcement-evading instructions (18 §7).
8. If this is a learned skill, attach the evidence ids that produced it (`source.evidence_ids`).

# Verification
`apex-agent skills stage <draft.md>` exits 0 (or `lintSkill(content)` reports zero errors and zero security flags), and the scanned verdict is not `deny`.

# Failure branches
- Lint errors name their section: fix the missing or malformed section and re-stage.
- A `security` flag fires: remove the offending content — a skill must never need redaction (18 §7).
- The scan returns deny: stop; a deny verdict is never overridable in any autonomy mode (54 §9.1).

# Rollback
Revert the draft file; staging produced no live skill until promotion.

# Known limits
Lint is advisory on content quality; only structural errors and security flags are blocking at stage.

# References
`core/15-SKILLS.md`; `core/18-SKILL-BODY.md` if in the doctrine set; WP-040 frontmatter rules.