---
name: reproduce-then-fix
description: Reproduce a defect before changing code, so the fix is verified against the actual failure.
version: 1.0.0
status: active
scope: global
platforms: [windows, linux, macos]
requires.capabilities: [process.exec, fs.read]
source.kind: builtin
security.executable_resources: false
---

# Goal
Turn an unverified fix into a verified one by first reproducing the reported defect, then changing code only after the reproduction is honest.

# Use when
A defect report exists and the fix is not yet proven; regression risk matters; a "fixed" claim needs evidence.

# Do not use when
The change is purely cosmetic, or the defect cannot be reproduced by any affordable means and the decision has been made to fix blind (record that decision).

# Preconditions
The defect report names an observable symptom and a scenario. The repository builds and the test command is known.

# Required capabilities
process.exec (to run the failing scenario), fs.read (to inspect code).

# Procedure
1. Write the reproduction first: the exact command or scenario from the report, against the current code.
2. Run it and confirm the failure matches the reported symptom. A reproduction that does not fail is not the defect — refine it.
3. Only then locate the code that participates in the failing path. Read, do not guess.
4. Change the smallest surface that can plausibly produce the failure.
5. Re-run the reproduction; it must now pass.
6. Run the broader test suite; the fix must not regress unrelated behaviour.
7. Record the outcome: the failing command, the passing command, and the evidence.

# Verification
The reproduction command fails before the change and passes after it, and the suite is green. Both runs are recorded.

# Failure branches
- The reproduction never fails: stop changing code and report that the defect was not reproduced — a fix for an unseen failure is unverified work.
- The reproduction fails differently: the report is stale or mistargeted; update the report, do not code around it.
- The suite regresses: revert the change and pick a narrower surface.

# Rollback
Revert the change; the reproduction stays in the record for the next attempt.

# Known limits
Not a substitute for root-cause analysis. A green reproduction is evidence, not an explanation.

# References
`core/03-EVIDENCE.md`; `core/10-GATE.md`.