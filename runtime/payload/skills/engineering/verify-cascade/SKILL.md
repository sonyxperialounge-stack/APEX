---
name: verify-cascade
description: Choose the cheapest sufficient check first, escalating only when it cannot decide.
version: 1.0.0
status: active
scope: global
platforms: [windows, linux, macos]
requires.capabilities: [process.exec]
source.kind: builtin
security.executable_resources: false
---

# Goal
Verify a claim with the least expensive check that can actually decide it, escalating only when the cheaper check is not enough — never jumping to the full suite.

# Use when
A change needs verification and multiple checks exist at different costs; the full suite is expensive; a fast signal would be sufficient.

# Do not use when
The change is load-bearing and a cheap check cannot possibly cover it — then the expensive check is the cheapest sufficient one.

# Preconditions
The project's check tiers are known (parse, types, lint, unit, suite, runtime), and the change's blast radius is roughly assessed.

# Required capabilities
process.exec (to run the chosen checks).

# Procedure
1. List the candidate checks from cheapest to most expensive.
2. Pick the cheapest check that could falsify the claim about this change. A type change wants typecheck; a formatting change wants lint; a logic change wants a unit test.
3. Run it. If it passes and the claim is about that check's scope, stop.
4. If the cheap check cannot decide the claim (e.g. unit tests pass but you changed shared state), escalate one tier and re-evaluate.
5. Only when the claim spans the whole project run the suite.
6. Record which check decided the claim and why it was sufficient.

# Verification
The claim survives the cheapest check that could have failed it, and the escalation path is recorded — future readers can see why the suite was not needed.

# Failure branches
- The cheap check passes but the claim is not actually covered: escalate; a green cheap check that does not cover the claim is not verification.
- No cheap check exists: run the suite and say so honestly.
- The suite fails after a cheap pass: the change spans tiers; update the record.

# Rollback
Re-run the prior tier; verification decisions are never durable state.

# Known limits
Blast-radius judgment is the weak point. When unsure, escalate one tier.

# References
`core/03-EVIDENCE.md`; the project's `verifyCommands` tiers in `.apex/config.json`.