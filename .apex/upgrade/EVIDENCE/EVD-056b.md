# EVD-056b — WP-056b Hook fail-open/closed classes + consent records (54 §15; EXT-T08..T11)

**Date:** 2026-09-11
**Branch:** `upgrade/army-v4`
**Dependencies:** WP-056 (extension trust surface, consent mechanism), doc 54 §15, doc 23 §11, REQ-EXT-002 (54:821)
**Verify:** `npm run verify` → 1229 pass, 0 fail, exit 0 (~40s)

## Context

- **54 §15 (lines 575-606)** — the four hook classes. Pre-operation policy check (Governor, protected paths) is FAIL-CLOSED: *"A guard that disappears when it errors is not a guard"*. Pre-operation context injection is fail-open. Post-operation capture (archive/audit/metrics) fails open but the LOSS IS RECORDED. The completion gate fails closed structurally (errors propagate; it is never wrapped in a failing-open wrapper).
- **54:821 (REQ-EXT-002)** — "Policy and gate hooks fail closed; capture hooks fail open and record the loss."
- **Per-hook timeout** — treated by the hook's own class: a timed-out fail-closed hook blocks; a timed-out fail-open hook degrades silently (loss recorded for capture class).
- **23 §11** — a repeated-crash loop in a FAIL-OPEN hook triggers temporary session quarantine; guards are NEVER quarantined (quarantining a guard reopens the hole).
- **54 §15 consent** — a user-supplied hook script runs only on a consent record keyed by `(event, canonical command path, content hash)` — **the same mechanism as extension trust, not a second one**. EXT-T11: an unapproved hook script never runs.

## What was built

### Hook classes (`src/plugin/hook-safety.ts`, new, 315 lines)

- `HookClass = "policy" | "inject" | "capture" | "gate"` and ONE class map `HOOK_CLASS` read by both the plugin and doctor (`describeHookClasses`), so a hook cannot silently drift between classes. Unclassified names default to `inject` (54 §15 default fail-open).
- `safe(name, fn, timeoutMs?, quarantine?)` — the FAIL-OPEN wrapper: deliberate blocks (`BlockedError`, or any error whose message carries `[APEX BLOCKED:` — defence in depth for prototype-lost blocks crossing module boundaries) always re-throw with a `plugin.block.propagated` event; genuine errors/timeouts are swallowed, and a CAPTURE-class loss additionally emits `plugin.capture.lost { hook, reason: timeout|error }` — the archive hole is visible in the audit trail, never silent.
- `safeClosed(name, fn, timeoutMs?)` — the FAIL-CLOSED wrapper: genuine errors AND timeouts THROW (`hook <name> failed closed — the operation is blocked…`), deliberate blocks propagate unchanged, a `plugin.hook.failed-closed` event is emitted, and the wrapper carries a `HOOK_CLOSED` symbol (`isClosedWrapper`) so doctor/tests can verify wiring. Guards are never quarantined.
- `HookTimeoutError` — a distinct type so a hang is never misread as a regular error; timeouts are handled by the wrapper of the hook's class.
- `openHookQuarantine(maxCrashes = 3)` — 23 §11 in-memory session quarantine (same pattern as `openExtensionQuarantine`), wired on the fail-open hooks: system.transform, tool.execute.after (610s budget for long verifier runs), event.
- `hookScriptRunnable` / `assertHookScriptRunnable` — the EXT-T11 fail-closed gate over a structural `HookConsentReader`; missing/stale consent → `ApexError(HOOK_CONSENT_MISSING)`. Reads and hashes the script only — never executes.
- `GATE_NOTE` documents that the completion gate (CLI `apex-agent gate`, MCP gate tool) fails closed by construction.

### Consent store (`src/stores/hook-consent.ts`, new, 206 lines)

- `HookConsentGrant` keyed by `(event, canonical command path, content hash)`, persisted in `trust/hooks.json` — separate file, same mechanism.
- Injected `scanCached` + `lockFile` + clock from the trust store: ONE scan-cache writer, ONE cross-process lock (54 §15 — not a second mechanism). `scan` uses `HOOK_SCAN_CONTEXT = "extension"` (strictest, 47 §4.5) under the `hook:` cache namespace so hook verdicts never collide with skill/extension slots.
- `approve`: scanner `deny` → `HOOK_SCANNER_DENY`, never overridable in any autonomy mode; `review` override → recorded `justification` required (`MISSING_JUSTIFICATION`); idempotent within `withCrossProcessLock`; a re-approve at a NEW hash SUPERSEDES the stale row (the file never grows one dead row per edit).
- `status`: exact triple → trusted; same event+path at a different hash → stale/"content hash changed… re-approve required" (hash-drift → inert, EXT-T03-style); none → no consent.

### Wiring (`src/plugin/index.ts`, 768 lines)

- `Engines.trust: TrustStore` + `Engines.hookQuarantine` in `bootstrapEngines`; trust store falls back to `<projectRoot>/.apex` when no global home resolves (consent degrades to closed — no readable store means no consent means scripts do not run).
- Class-correct hook wiring, the enforcement point: `tool.execute.before` and `permission.ask` → `safeClosed`; `tool.execute.after`, `event`, system/messages.transform, session.compacting, chat.params → `safe` (capture ones record losses; quarantine on system.transform/after/event).
- `hookScriptRegistry(engines)` → `{ classes, consent: { approve(event, commandPath, {tier, grantedBy, override?, justification?}), status(event, commandPath), require(event, commandPath) } }` — the fail-closed gate any execution path must pass; `extensionSurface` exposes `hooks`, `hookClasses`, `config`, `trust`.

## Acceptance mapping

| Acceptance | Where |
|---|---|
| EXT-T08 throwing policy hook blocks | `safeClosed` unit tests + end-to-end: the wired `tool.execute.before` rejects a protected write |
| EXT-T09 throwing capture hook does not block + loss recorded | `safe` swallow + `plugin.capture.lost` present in events.jsonl, naming hook + reason |
| EXT-T10 timed-out hook handled by its class | timed-out `safeClosed` rejects; timed-out `safe` returns undefined; timed-out capture records the loss; plugin wiring verified via `isClosedWrapper` |
| EXT-T11 unapproved hook script never runs | `assertHookScriptRunnable` → `HOOK_CONSENT_MISSING`; trust-store round-trip: approve → runnable, hash drift → inert |

Also covered: 54 §15 default fail-open for unclassified hooks; deliberate blocks always propagate (PLG-002 regression); 23 §11 quarantine after maxCrashes (blocks never count as crashes); deny never overridable for hooks; review override needs justification; re-approve supersedes stale rows; `hook:` cache namespace + shared lock structural check; surface degradation to data-only defaults without engines.

## Surprises

- **`ApexError` carries its code as a property, not in the message** — `HOOK_CONSENT_MISSING` never appears in `err.message`; tests assert on `err.code`.
- **TS generic inference**: `safe("name", async () => …)` infers `A = []` — fixtures must declare `(_i: unknown, _o: unknown)` to accept host args.
- **Module budget (MOD-T05) again**: the trust store grew to 365 lines and was brought back under 350 by compressing doc comments (347 final); the consent logic lives in its own new file, so the store only delegates.
- No phantom helper file — the test harness helpers are local to `test/plugin/hook-safety.test.ts` (there is no `test/helpers/` directory in this tree).

## Files

- `+runtime/src/plugin/hook-safety.ts` (new, 315 lines)
- `+runtime/src/stores/hook-consent.ts` (new, 206 lines)
- `~runtime/src/stores/trust-store.ts` (365 → 347 lines; `approveHook`/`hookStatus`/`scanHook` delegation, shared lock + scan-cache)
- `~runtime/src/plugin/index.ts` (class-correct wiring, `Engines.trust`, `hookQuarantine`, `hookScriptRegistry`, surface extension)
- `+runtime/test/plugin/hook-safety.test.ts` (new, 29 tests)
- `~.apex/upgrade/STATE.json` (WP-056b IN_PROGRESS → DONE)

## Next

- WP-057 — capability doctrine (`+core/16-CAPABILITIES.md`, `~START-HERE.md`, payload sync; packaging tests pass).