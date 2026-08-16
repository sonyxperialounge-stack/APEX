# L1 — THE MCP SERVER

> The portable binding. Works on every MCP-capable host: Claude Code, Cursor, Windsurf, Zed,
> OpenCode, Goose, and anything else that speaks the protocol.
>
> **L1 gives real state and real verification. It does not give enforcement** — a model that
> simply declines to call `apex_verify` is back at L0. That gap is exactly what L2 closes, and
> it is why both exist.

---

## TRANSPORT

stdio JSON-RPC 2.0. One JSON object per line on stdin, one per line on stdout. **Nothing else
may ever be written to stdout** — a stray `console.log` corrupts the protocol stream and the
host sees an unparseable frame. Route all logging to stderr or to the log file.

```ts
// src/mcp/server.ts
const rl = readline.createInterface({ input: process.stdin })
for await (const line of rl) {
  if (!line.trim()) continue
  let msg: any
  try { msg = JSON.parse(line) }
  catch { write(errorResponse(null, -32700, "Parse error")); continue }   // MCP-009

  try {
    const res = await dispatch(msg)
    if (res) write(res)                       // notifications get no response
  } catch (err) {
    write(errorResponse(msg.id ?? null, -32603, String(err)))   // never crash
  }
}
const write = (o: unknown) => process.stdout.write(JSON.stringify(o) + "\n")
```

Dependency-free by design (CORE-003). The protocol surface APEX needs is small; a framework
would be more code than the implementation.

---

## HANDSHAKE

```ts
case "initialize": {
  const requested = String(msg.params?.protocolVersion ?? "")
  return ok(msg.id, {
    protocolVersion: SUPPORTED.includes(requested) ? requested : LATEST_SUPPORTED,
    capabilities: {
      tools:     {},                                    // MCP-002: advertise only what exists
      resources: { subscribe: false, listChanged: false },
      prompts:   { listChanged: false },
    },
    serverInfo: { name: "apex", version: VERSION },
  })
}
```

**MCP-002 is a real constraint, not boilerplate.** Army-V2 advertised a protocol revision it had
not implemented. Advertise exactly what is implemented and tested — a host that trusts a false
capability fails in confusing ways.

---

## THE TOOLS — MCP-004

| Tool | Args | Returns |
|---|---|---|
| `apex_init` | `projectRoot`, `autonomy?`, `doNotRead?`, `doNotTouch?`, `sourcesOfTruth?` | Created ledger + detected verify commands + loaded memory |
| `apex_status` | — | Counts, active requirement, blockers, level, resume point |
| `apex_req_add` | `source`, `text`, `acceptance`, `verifyBy`, `dependsOn?`, `component?` | The created requirement with its assigned ID |
| `apex_req_list` | `status?` | Requirement table |
| `apex_req_status` | `id`, `status`, `reason?` | Updated record, **or an explanatory rejection** |
| `apex_verify` | `files[]`, `reqIds[]`, `maxTier?` | Verification records with literal output |
| `apex_snapshot` | `reqId`, `files[]` | Snapshot reference |
| `apex_rollback` | `snapshotRef` | Restored files, preserved files, unexpected changes |
| `apex_delegate` | `packet` | Subagent handle + the recorded packet |
| `apex_subagent_status` | `id?` | State, checkpoint, attempt count |
| `apex_models` | — | Live model catalog. Used to check a user-named model **before** dispatch |
| `apex_council` | `reqId`, `diff`, `testOutput` | Findings as hypotheses, with the reviewing model named |
| `apex_gate` | — | `passed` + every unmet check |
| `apex_handoff` | — | Generated handoff text |
| `apex_resume` | `nextAction`, `doNotRedo?`, `verifyFirst?` | Updated resume point |
| `apex_decision` | `context`, `problem`, `chose`, `whyNotAViolation` | Recorded decision |
| `apex_check` | `kind`, `path?`, `command?` | Allow/deny with the rule that decided |
| `apex_task_result` | `taskId` | Poll a long verification started asynchronously |
| `apex_memory_read` | `context?` | Relevant memory facts |
| `apex_memory_write` | `section`, `fact` | Confirmation, after dedupe and redaction |
| `apex_finding` | `where`, `what`, `recommend` | Records one finding |
| `apex_findings` | — | Lists every finding, so none is quietly forgotten |

### Deferred, and why

`apex_fleet` and `apex_fleet_status` are **specified but not implemented**, and that is a
decision rather than an omission (DEC-004):

- A fleet needs a host that can spawn child sessions and stream events. The stdio MCP
  server is filesystem-only by design (MCP-011), so `apex_fleet` there would have to either
  lie about what it did or refuse every call.
- `apex_subagent_status` already returns every field `apex_fleet_status` would.

The fleet engine itself is built and tested in `engines/warden.ts` (FLT-001..017), and is
reachable at **L2**, where the plugin runs inside a host that can actually spawn. Exposing it
over stdio waits until the MCP server carries a real host client.

Naming a tool here that does not exist in the code is the same defect as shipping code the
contract does not name — the mirror image of what an external scan caught earlier. It is
recorded rather than quietly deleted.

### Schemas teach

Descriptions are read by the model on every turn — they are prompt, not documentation. Write
them so the correct behaviour is obvious from the schema alone.

```ts
{
  name: "apex_req_status",
  description:
    "Set a requirement's status. Legal path: NOT_STARTED → IN_PROGRESS → " +
    "IMPLEMENTED_NOT_VERIFIED → VERIFIED_COMPLETE. Nothing skips a step. " +
    "VERIFIED_COMPLETE is REJECTED unless a passing verification record already " +
    "references this requirement — run apex_verify first. " +
    "BLOCKED and NOT_APPLICABLE both require a written reason.",
  inputSchema: {
    type: "object",
    properties: {
      id:     { type: "string", description: "e.g. REQ-014" },
      status: { type: "string", enum: ["IN_PROGRESS","IMPLEMENTED_NOT_VERIFIED","VERIFIED_COMPLETE","BLOCKED","NOT_APPLICABLE"] },
      reason: { type: "string", description: "Required for BLOCKED and NOT_APPLICABLE. State the evidence." },
    },
    required: ["id", "status"],
  },
}
```

`apex_delegate`'s description must carry the substitution law, because it is the rule a model
is most likely to "helpfully" break:

```
"Spawn a supervised subagent from a packet. If the user named specific models they are used
 EXACTLY — this tool NEVER substitutes an unavailable model. If a named model is unreachable
 it returns USER_DECISION_REQUIRED with the real alternatives; relay that and wait. Do not
 pick a replacement yourself."
```

### Rejections are the product — MCP-005

```ts
// Return, do not throw. A thrown error is noise; a returned explanation changes behaviour.
{
  content: [{
    type: "text",
    text:
      "REJECTED: REQ-014 is NOT_STARTED and cannot jump to VERIFIED_COMPLETE.\n" +
      "Do this instead:\n" +
      "  1. apex_req_status REQ-014 IN_PROGRESS\n" +
      "  2. implement it\n" +
      "  3. apex_verify with the changed files\n" +
      "  4. apex_req_status REQ-014 IMPLEMENTED_NOT_VERIFIED\n" +
      "  5. apex_req_status REQ-014 VERIFIED_COMPLETE (allowed once evidence exists)",
  }],
  isError: false,     // this is a correction, not a failure
}
```

This one design choice does most of the work of L1. The model wanted to skip; it was told
precisely what to do instead; it complies. No enforcement was needed — only a refusal that
teaches.

### Long operations — MCP-010

A full test suite can run for minutes. Never block the protocol loop:

```ts
// apex_verify with maxTier: "suite"
→ { taskId: "T-003", status: "running", poll: "apex_task_result" }
// then
→ apex_task_result { taskId: "T-003" } → records, or { status: "running", elapsedMs }
```

---

## RESOURCES AND PROMPTS

```
apex://state          current ledger snapshot (JSON)
apex://requirements   the requirement table (markdown)
apex://handoff        generated handoff (markdown)
apex://memory         project memory (markdown)
```

```
apex-boot     Full doctrine boot for a fresh session
apex-resume   Resume briefing assembled from real recorded state
apex-review   Independent-review prompt for a diff (requirement + diff, no author reasoning)
```

Resources cost nothing until read, so a host that surfaces them gives the user a live view of
the ledger for free.

---

## REGISTERING IT

**Claude Code**
```bash
claude mcp add apex -- npx -y apex-agent@latest mcp
```

**Cursor** — `~/.cursor/mcp.json`
```json
{ "mcpServers": { "apex": { "command": "npx", "args": ["-y", "apex-agent@latest", "mcp"] } } }
```

**Windsurf** — the same block in `~/.codeium/windsurf/mcp_config.json`.

**OpenCode** — `opencode.json` (only if not using L2; the plugin registers the tools natively)
```json
{
  "mcp": {
    "apex": {
      "type": "local",
      "command": ["npx", "-y", "apex-agent@latest", "mcp"],
      "enabled": true,
      "environment": { "APEX_PROJECT_ROOT": "C:/work/myapp" }
    }
  }
}
```

> Forward slashes in that path, or doubled backslashes. Never `C:\work\myapp` — that is invalid
> JSON and the entire config silently fails to load. **INS-004.**

---

## FILESYSTEM-ONLY MODE — MCP-011

Most hosts have no OpenCode server behind them. Everything except `apex_council` must work with
nothing but a filesystem:

| Capability | With a host server | Filesystem only |
|---|---|---|
| Ledger | ✅ | ✅ |
| Verification | ✅ | ✅ (subprocess) |
| Snapshot / rollback | ✅ | ✅ (file copies + git) |
| Gate, handoff, memory | ✅ | ✅ |
| Subagent supervision | ✅ (SSE events) | ⚠️ packet + result-file only |
| Council | ✅ | ❌ — reports "no second model reachable" |

Degrade explicitly and say so in the tool response. Never simulate a capability you do not
have (X-001).

---

## VERIFICATION CHECKLIST FOR THIS PHASE

- [ ] Real subprocess round-trip: spawn the server, initialize, list tools, call one, read the result
- [ ] Fuzzed input (truncated JSON, wrong types, huge payloads, null id) never kills the process
- [ ] Nothing but protocol frames on stdout — asserted by a test that greps the stream
- [ ] Every tool in MCP-004 is listed, callable, and schema-valid
- [ ] Illegal transitions return the teaching rejection, not an exception
- [ ] `apex_gate` failure output names every unmet check
- [ ] Suite verification returns a task id immediately and does not block
- [ ] All tools except `apex_council` work with no host server present
- [ ] Registers and connects successfully in at least two real hosts

---

Next: `INSTALLER.md` · `TESTING.md` · `ROADMAP.md`
