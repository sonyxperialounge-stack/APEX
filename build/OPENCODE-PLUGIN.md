# L2 — THE OPENCODE PLUGIN

> The deepest binding. This is where doctrine stops being a request and becomes a mechanism.
>
> **Before writing any of this:** read the installed types at
> `node_modules/@opencode-ai/plugin`. Hook names and signatures below were correct as of
> 2026-08-15, but **the installed types outrank this document** (REQ PLG-016). Record any
> divergence in `.apex/DECISIONS.md`.

---

## THE SHAPE

```ts
// src/plugin/index.ts
import type { Plugin } from "@opencode-ai/plugin"
import { Engines } from "../engines/index.js"
import { safe } from "./safe.js"

export const ApexPlugin: Plugin = async ({ project, directory, worktree, client, $ }) => {
  const engines = await Engines.bootstrap({ projectRoot: worktree ?? directory, client, $ })
  await engines.ledger.writeRuntimeMarker({ level: 2, version: VERSION })   // PLG-015

  return {
    "experimental.chat.system.transform": safe(systemTransform(engines)),
    "tool.execute.before":                safe(toolBefore(engines)),
    "tool.execute.after":                 safe(toolAfter(engines)),
    "permission.ask":                     safe(permissionAsk(engines)),
    "event":                              safe(onEvent(engines)),
    "experimental.session.compacting":    safe(onCompacting(engines)),
    "experimental.chat.messages.transform": safe(messagesTransform(engines)),
    "chat.params":                        safe(chatParams(engines)),
    tool:                                 apexTools(engines),
    dispose:                              () => engines.shutdown(),
  }
}
export default ApexPlugin
```

### `safe()` — PLG-002, non-negotiable

A throw inside a plugin hook takes down the user's session. Every hook body is wrapped:

```ts
// src/plugin/safe.ts
export function safe<A extends any[], R>(fn: (...a: A) => Promise<R>) {
  return async (...args: A): Promise<R | undefined> => {
    try {
      return await withTimeout(fn(...args), HOOK_TIMEOUT_MS)
    } catch (err) {
      log.error("apex hook failed — continuing without it", { err: String(err) })
      return undefined            // absence of an APEX behaviour, never a broken session
    }
  }
}
```

`withTimeout` matters as much as the try/catch: a hook that hangs is indistinguishable from a
frozen editor, and PLG-017 caps hook overhead at 50 ms p95.

---

## HOOK 1 — `experimental.chat.system.transform`

**The single highest-leverage line of code in APEX.** Every request the model receives carries
current, specific, live state.

```ts
const systemTransform = (e: Engines) => async (input: { system: string[], sessionID?: string }) => {
  const apex = await e.cortex.assemble({
    sessionId: input.sessionID ?? "unknown",
    activeReq: await e.ledger.activeRequirement(),
    files: await recentFiles(e)   // local helper; reads IN_PROGRESS requirement files,
    budget: e.cfg.cortexBudgetTokens ?? 2000,
  })
  // PREPEND: APEX must not be buried under the host's own prompt, and must not
  // replace it — the host's prompt contains the tool contract the model needs.
  return { system: [apex, ...input.system] }
}
```

Why this changes behaviour so much: a model does not "forget" its instructions so much as have
them pushed out by distance and compaction. Re-stating the active requirement, the protected
paths, and the last three failures **every single turn** removes the decay mechanism entirely.

---

## HOOK 2 — `tool.execute.before` (enforcement)

This is Law 8 becoming a mechanism.

```ts
const toolBefore = (e: Engines) => async (
  input: { tool: string; sessionID: string; callID: string },
  output: { args: Record<string, any> },
) => {
  const op = classify(input.tool, output.args)     // read | write | bash | network | …

  // 1 — hard block
  const decision = e.governor.decide(op)
  if (!decision.allowed) {
    throw new Error(
      `[APEX BLOCKED: ${decision.rule}] ${decision.reason}\n` +
      `This path is protected by the user's configuration in .apex/config.json. ` +
      `Do not retry it or route around it. If this work genuinely requires that path, ` +
      `stop and ask the user.`)
  }

  // 2 — bulk expansion: what will this ACTUALLY touch? (GOV-006)
  if (op.kind === "bash" && looksBulk(op.command)) {
    const targets = await e.governor.expandBulk(op.command)
    const hits = targets.filter(t => e.governor.isProtectedWrite(t))
    if (hits.length) throw new Error(
      `[APEX BLOCKED: bulk-operation] This command expands to ${targets.length} paths, ` +
      `${hits.length} of which are protected: ${hits.slice(0, 5).join(", ")}. ` +
      `Narrow the command so it touches only what you intend.`)
  }

  // 3 — snapshot before risk
  if (decision.requiresSnapshot && op.path) {
    await e.governor.snapshot(await e.ledger.activeRequirement() ?? "UNSCOPED", [op.path])
  }

  // 4 — record the intent, so a crash mid-operation is still legible
  e.intents.set(input.callID, { op, tool: input.tool, reqId })   // in-memory; survives only the turn
}
```

Two details that matter:

- **The error text teaches.** `"Do not retry it or route around it"` prevents the common
  follow-on where a blocked model tries `bash cat` after `read` is denied.
- **Bulk expansion happens before execution.** This is the `black .` / `rm -rf build/*` class of
  disaster, caught at the only moment it can be caught.

---

## HOOK 3 — `tool.execute.after` (grounding)

This is Law 2 becoming a mechanism.

```ts
const toolAfter = (e: Engines) => async (
  input: { tool: string; sessionID: string; callID: string },
  output: { title: string; output: string; metadata: any },
) => {
  const intent = e.intents.get(input.callID)
  e.intents.delete(input.callID)
  if (!intent) return

  // Record what ACTUALLY happened — not what the model will later say happened
  await e.ledger.appendProgress({ reqId: intent.reqId ?? "", what: `${intent.tool} ${intent.op.path}`, filesChanged: [intent.op.path] })

  if (!isEdit(input.tool)) return

  // Auto-verify. The whole point: this lands in the SAME turn, before any claim.
  const records = await e.verifier.cascade(
    [intent.op.path!],
    [await e.ledger.activeRequirement() ?? "UNSCOPED"],
    { maxTier: "unit", stopAtFirstFailure: true },   // fast tiers only — keep it under a second
  )

  const failed = records.find(r => r.result === "FAIL")
  if (failed) {
    // Mutating `output.output` is what puts the failure in front of the model NOW.
    output.output += [
      ``,
      `── APEX VERIFICATION FAILED ──`,
      `$ ${failed.command}`,
      failed.actual,
      ``,
      `This edit did not pass. Fix it before continuing. Do not report success.`,
      `Recorded as ${failed.id} in .apex/VERIFICATION.md.`,
    ].join("\n")
  }

  await e.recall.captureFromEvent({ kind: "command_succeeded", command: passed.command })     // REC-002
}
```

> **This hook is why a mid-tier model behaves like a careful one.** The dominant failure mode in
> agentic coding is a confident claim built on an unverified edit. Here the failure arrives
> before the claim can be made, in the same context window, attached to the edit that caused it.

Keep it to the fast tiers (`parse`, `types`, targeted `unit`). Running a full suite on every
edit makes the session unusable; the suite belongs at the requirement boundary, not the edit
boundary.

---

## HOOK 4 — `permission.ask`

This is what "I don't want to click anything" actually means.

```ts
const permissionAsk = (e: Engines) => async (
  input: { type: string; pattern?: string; sessionID?: string },
  output: { status: "ask" | "deny" | "allow" },
) => {
  const decision = e.governor.decide(fromPermission(input))
  output.status = !decision.allowed ? "deny"
              : e.cfg.autonomy === "MANUAL" ? "ask"
              : e.cfg.autonomy === "GUARDED" ? (isRoutine(input) ? "allow" : "ask")
              : "allow"                                   // AUTO / FULL_AUTO
  event("plugin.permission", { type: input.type, status, rule: decision.rule })   // GOV-012
}
```

The blocklist runs first and produces `deny` regardless of mode — GOV-002. There is no config
value that reorders this.

---

## HOOK 5 — `event` (recovery and tracking)

```ts
const onEvent = (e: Engines) => async ({ event }: { event: any }) => {
  switch (event.type) {
    case "session.error":
      return { action: "recover", detail: String(props.sessionID ?? "") }   // caller drives warden.recover()
      break

    case "session.idle": {
      const id = event.properties?.sessionID
      // warden.classifyEvent() decides: idle with unmet criteria is a FAILURE (WAR-004)
      break
    }

    case "session.created":
      if (props.parentID) return { action: "track_child", detail: String(props.sessionID) }  // PLG-010
      break

    case "file.edited":
      // governor.isProtectedWrite() on the edited path — WAR-005
      await e.ledger.addFinding({ where: file, what: "protected path reported as edited", whyNotFixed: "detected after the fact", recommend: "review and revert if unintended" })
      break

    case "session.compacted":
      await e.ledger.appendProgress({ note: "context compacted — ledger is authoritative" })
      break
  }
}
```

`session.idle` with unmet acceptance criteria is the single most valuable detection in this
hook. It is the state that looks exactly like success and is not.

---

## HOOK 6 — `experimental.session.compacting`

Compaction is where long sessions lose their constraints. This hook is the fix.

```ts
const onCompacting = (e: Engines) => async (input: any, output: { prompt?: string }) => {
  const anchor = await e.cortex.assembleCompactionAnchor()
  output.prompt = [
    input.prompt ?? "",
    ``,
    `MUST SURVIVE COMPACTION — reproduce verbatim in the summary:`,
    preserved,      // protected paths · autonomy · unresolved REQs · blockers · recent failures
  ].join("\n")
}
```

Without this, the first thing compaction discards is the early message containing the user's
constraints — which is precisely the content whose loss causes the worst outcomes.

---

## HOOK 7 — `experimental.chat.messages.transform`

A lighter, per-turn re-anchor. Use sparingly; every insertion costs tokens on every request.

```ts
const messagesTransform = (e: Engines) => async (input: { messages: any[] }) => {
  if (input.messages.length < e.cfg.reanchorAfterTurns) return
  const anchor = await e.cortex.assembleCompactionAnchor()   // ~200 tokens, constraints only
  const msgs = [...input.messages]
  msgs.splice(-1, 0, { role: "user", content: [{ type: "text", text: anchor }] })
  return { messages: msgs }
}
```

---

## HOOK 8 — `chat.params`

```ts
const chatParams = (e: Engines) => async (input: any, output: { temperature?: number; topP?: number }) => {
  switch (await e.ledger.currentTaskClass()) {
    case "planning":  output.temperature = 0.7; break   // want breadth
    case "editing":   output.temperature = 0.1; break   // want precision
    case "reviewing": output.temperature = 0.3; break
    case "debugging": output.temperature = 0.2; break
  }
}
```

Small effect compared to the other hooks, but free.

---

## CUSTOM TOOLS — the `tool` hook

At L2 the `apex_*` tools are registered natively, so no MCP server needs to run.

```ts
import { tool } from "@opencode-ai/plugin"

const apexTools = (e: Engines) => ({
  apex_status: tool({
    description: "Current APEX state: requirement counts, active requirement, blockers, level.",
    args: {},
    async execute() { return JSON.stringify(await e.ledger.status(), null, 2) },
  }),

  apex_req_status: tool({
    description:
      "Set a requirement's status. Illegal transitions are rejected. " +
      "VERIFIED_COMPLETE requires a passing verification record.",
    args: {
      id:     tool.schema.string().describe("REQ-001"),
      status: tool.schema.enum([
        "IN_PROGRESS","IMPLEMENTED_NOT_VERIFIED","VERIFIED_COMPLETE","BLOCKED","NOT_APPLICABLE",
      ]),
      reason: tool.schema.string().optional().describe("Required for BLOCKED and NOT_APPLICABLE"),
    },
    async execute(a) {
      try { return JSON.stringify(await e.ledger.setStatus(a.id, a.status as any, { reason: a.reason })) }
      catch (err) { return `REJECTED: ${(err as Error).message}` }   // teach, do not crash
    },
  }),

  apex_verify: tool({
    description: "Run the verification cascade and record the literal output as evidence.",
    args: {
      files:  tool.schema.array(tool.schema.string()).describe("Changed files"),
      reqIds: tool.schema.array(tool.schema.string()),
      maxTier: tool.schema.enum(["parse","types","lint","unit","suite","build","runtime"]).optional(),
    },
    async execute(a) { return JSON.stringify(await e.verifier.cascade(a.files, a.reqIds, { maxTier: a.maxTier as any }), null, 2) },
  }),

  apex_gate: tool({
    description: "Run the completion gate. Returns pass/fail and every unmet check.",
    args: {},
    async execute() {
      const r = await e.gate.run()
      return r.passed
        ? "GATE PASSED. You may write the completion report."
        : `GATE FAILED. Do not claim completion.\n\nUnmet:\n${r.failures.map(f => `  · ${f}`).join("\n")}`
    },
  }),

  // Every other apex_* tool has the same shape. In the built plugin they are not written
  // out by hand at all — `apexTools()` generates the whole registry from the single TOOLS
  // list in `mcp/tools.ts`, so the L1 and L2 surfaces cannot drift apart.
})
```

### `apex_fleet` is DEFERRED — not shipped at either level

An earlier draft of this file carried a full `apex_fleet: tool({...})` block calling
`warden.runFleet()`. **That method does not exist**, and neither does the tool — at L1 or L2.

It is deferred for the reason in `MCP-SERVER.md` (DEC-004, DEC-005): a fleet needs a host
that can spawn child sessions and stream events, and neither surface carries a real host
client yet. The fleet *engine* is built and tested (`engines/warden.ts`, FLT-001..017);
what is missing is the wiring, and `apex_delegate` covers single-subagent dispatch today.

This block survived a round of fixing precisely because the test that catches phantom tools
only scanned `MCP-SERVER.md`. It now scans this file too. The lesson is F-005's, repeated:
**a fix claim needs a check covering the whole surface, not the file that happened to be
open.**

Note the pattern in `apex_req_status` and `apex_gate`: **the failure path returns a useful
message rather than throwing.** The tool's job is to make the model do the right thing next,
and an actionable refusal does that better than an exception.

---

## PACKAGING AND INSTALL

Built to a single ESM file, no external imports at runtime:

```
~/.config/opencode/plugins/apex.js          (or %USERPROFILE%\.config\opencode\plugins\apex.js)
```

Registered in `opencode.json` — merged, never replaced:

```json
{
  "plugin": ["apex-agent@1"],
  "instructions": ["AGENTS.md", ".apex/MEMORY.md"],
  "snapshot": true,
  "subagent_depth": 2
}
```

`"snapshot": true` is required for `POST /session/:id/revert` to work — the plugin must check
for it at load and warn if it is off, because rollback silently degrades without it.

### The Windows-path trap — INS-004

The previous version of this system shipped this, and it disabled everything:

```json
"command": ["C:\Users\me\python.exe"]     ← INVALID JSON. \U is not an escape.
```

The whole config fails to parse and OpenCode loads none of it, with no obvious error. Always:

```ts
const json = JSON.stringify(config, null, 2)
JSON.parse(json)                     // must not throw — validate before writing
await fs.writeFile(target, json, "utf8")
```

Never build config text by concatenation. Never write a path without going through
`JSON.stringify`. There is a dedicated regression test for exactly this.

---

## COMPANION FILES SHIPPED WITH THE PLUGIN

| Path | Purpose |
|---|---|
| `agents/apex-implementer.md` | `mode: subagent` — implements one packet, verifies, reports literally |
| `agents/apex-reviewer.md` | `mode: subagent`, read-only permissions — adversarial diff review |
| `agents/apex-researcher.md` | `mode: subagent`, read-only — investigation without write access |
| `commands/apex.md` | `/apex <task>` — full intake → loop → gate |
| `commands/apex-status.md` | `/apex-status` — ledger summary |
| `commands/apex-gate.md` | `/apex-gate` — run the completion gate |
| `skills/apex-doctrine/SKILL.md` | Core doctrine, progressive disclosure |
| `skills/apex-recovery/SKILL.md` | Loaded on repeated failure |
| `skills/apex-delegation/SKILL.md` | Loaded before spawning a subagent |

Skills matter here: they let the doctrine load **on demand** rather than occupying the system
prompt permanently. The Cortex carries only the live state; the reference material stays in
skills until needed.

---

## VERIFICATION CHECKLIST FOR THIS PHASE

- [ ] Types read from `node_modules/@opencode-ai/plugin`; divergences recorded (PLG-016)
- [ ] Plugin loads in a real OpenCode with no startup error
- [ ] Fault injection: a throw in each hook leaves the session alive (PLG-002)
- [ ] Write to a `do_not_touch` path is blocked and the reason reaches the model (PLG-004)
- [ ] `black .` style bulk command is blocked when it would hit a protected path (GOV-006)
- [ ] An introduced type error surfaces in the same turn as the edit (PLG-006)
- [ ] Each autonomy mode produces the documented `permission.ask` answer (PLG-008)
- [ ] A killed subagent session triggers recovery (PLG-009)
- [ ] Constraints survive a forced compaction (PLG-011)
- [ ] `.apex/runtime.json` reports level 2 while loaded (PLG-015)
- [ ] Hook overhead <50 ms p95 excluding the verify command (PLG-017)
- [ ] `opencode.json` round-trips: written, re-read, byte-identical except APEX additions

---

Next: `MCP-SERVER.md` (the portable L1) · `TESTING.md`
