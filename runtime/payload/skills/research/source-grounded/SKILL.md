---
name: source-grounded
description: Research with primary sources, dated evidence, and an explicit confidence statement — never a paraphrase passed off as a citation.
version: 1.0.0
status: active
scope: global
platforms: [windows, linux, macos]
requires.capabilities: [network]
source.kind: builtin
security.executable_resources: false
---

# Goal
Produce research claims that name their primary sources and their dates, state confidence honestly, and flag what could not be verified.

# Use when
A decision depends on facts from outside the repository: API behaviour, versions, policies, ecosystem state.

# Do not use when
The question is answerable from the repository or the installed toolchain — then the repository IS the primary source.

# Preconditions
The question is precise enough that a primary source could answer it, and the fetch surface is available.

# Required capabilities
network (to reach primary sources).

# Procedure
1. Restate the question precisely enough that a primary source could settle it.
2. Fetch the primary source first: the vendor's documentation, the standard, the published schema — not a summary of them.
3. Record the source URL and the date you read it. A claim without a date is a claim without a shelf life.
4. Quote or paraphrase tightly, and mark which parts of the answer came from the source and which are your inference.
5. State confidence: what you verified, what you could not reach, and what would change the answer.
6. Write the conclusion with the evidence ids attached (VER-1042 style) so the decision trail is checkable.

# Verification
Every claim in the answer carries a named primary source, a read-date, and a confidence statement; nothing unverifiable is presented as fact.

# Failure branches
- The primary source is unreachable: say so and do not fabricate a citation from memory — a stale or invented source is worse than no source.
- Sources disagree: present both with dates and explain the disagreement; do not average them.
- The claim is time-sensitive (versions, policies): mark it as needing re-check before use.

# Rollback
The write-up is evidence; correct it the same way it was made — with a dated source.

# Known limits
Network availability is not guaranteed; the procedure stops honestly when it is absent.

# References
`core/03-EVIDENCE.md`; the requirement's evidence ids when this research feeds one.