---
name: dependency-audit
description: Evaluate a proposed dependency against APEX's zero-runtime-dependency contract before adopting it.
version: 1.0.0
status: active
scope: global
platforms: [windows, linux, macos]
requires.capabilities: [network, fs.read]
source.kind: builtin
security.executable_resources: false
---

# Goal
Decide, with evidence, whether a proposed dependency may be adopted — against the contract that shipped APEX code carries zero runtime dependencies (CORE-003) — and when it may not, name the alternative.

# Use when
A proposed dependency appears in an implementation, a review, or a vendor-license conversation; the zero-dep contract might be at risk.

# Do not use when
The dependency is already adopted and only being upgraded — then the question is about the upgrade, not the contract.

# Preconditions
The exact package name and version are known, and what it would replace (a node: builtin, a hand-rolled module, or nothing) is identifiable.

# Required capabilities
network (to read the package's own metadata), fs.read (to inspect the proposal).

# Procedure
1. Ask what the dependency replaces. If it replaces a `node:` builtin or a small hand-rolled function, the default answer is no.
2. Verify the contract: `package.json` of the shipped package must keep `dependencies: {}`. A dependency that would land there is the review target, not an exception.
3. Read the package's own description and license in its registry entry; record both.
4. Consider the alternatives: the builtin, a vendored copy, or writing the function (the runtime is deliberately small).
5. State the verdict with the evidence: adopt (with the reason the contract bends — this is rare and needs a recorded decision), or reject and name the alternative.
6. Record the audit in the requirement's evidence.

# Verification
The verdict is written with the package name, what it replaces, and either a recorded contract-bending decision or the named alternative.

# Failure branches
- The package's license is unclear: reject; unclear licensing is a supply-chain risk, not a convenience.
- The package transitively brings runtime dependencies: reject unless each is also audited.
- The proposal is a devDependency only: it still needs the audit but does not touch the shipped contract.

# Rollback
The audit is advisory; no code changed as part of it.

# Known limits
The zero-dep contract is about runtime dependencies; build-time tooling (TypeScript, the test runner) is governed separately.

# References
The build plans and `core/03-EVIDENCE.md` (the audit is evidence); the shipped package's `package.json` declares its runtime dependencies — the audit checks one the same way it checks its own.