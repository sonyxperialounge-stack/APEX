# 16 — CAPABILITIES

> What the host can actually do — and how to say, plainly, when it cannot.
> Load before planning tool-heavy work, and the moment a needed tool seems
> missing.

---

## WHAT A CAPABILITY IS

A capability is a **stable, vendor-neutral action** the current host can
perform — `fs.write`, `process.exec`, `web.search`, `agent.delegate`. Host
tool names are aliases, never the canonical API: the same semantic action
called `shell_exec` in one host and `terminal` in another is still
`process.exec` under this doctrine.

The capability registry is the normalization layer between arbitrary host
tool names and these stable concepts. It is **descriptive and policy-aware,
and it does not execute tools** — a registry lookup performs zero tool
execution. Knowing that a capability exists, or that the model may *see* it,
is a separate decision from being allowed to *use* it.

---

## THE ONE EFFECTS TAXONOMY

Every capability carries effects. There is exactly one canonical vocabulary —
`READ`, `WRITE`, `EXECUTE`, `NETWORK`, `INSTALL`, `DELETE`, `DESTRUCTIVE`,
`EXTERNAL_SIDE_EFFECT` — used identically by the registry, the Governor,
skills and audit logs. Do not invent parallel synonyms (`MUTATE`,
`REMOTE_WRITE`, `DANGER`). If a capability needs more precision, add metadata;
never a second taxonomy.

Effects are declared by trusted adapters when possible, otherwise inferred
**conservatively**: an unknown capability lands on `EXTERNAL_SIDE_EFFECT`,
never on an optimistic "reads only". Assuming a tool is harmless because its
schema is opaque is how a sandbox gets opened.

---

## DISCLOSURE IS NOT EXECUTION

Exposure and execution are separate decisions, in this order:

1. `mayExpose` — may the model even *see* this capability? Availability and
   trust decide it. An unavailable capability is never exposed as if it
   worked; a revoked one is never shown as trustworthy.
2. `mayExecute` — may the model *call* it? Only the Governor decides this,
   through its operation kinds and the autonomy policy in force. The
   registry and the Governor agree through one mapping from effects to
   operation kinds — if the Governor lacks a necessary kind, extend the
   Governor once; never bypass it.

A capability the model can name is not a capability the model may use. If
permission is denied, the denial is reported as a denial — not worked around.

---

## WHEN TO CONSULT THIS FILE

1. **Before planning tool-heavy work** — spend the planning step confirming
   which capabilities the task actually needs and which the host actually
   has. A plan built on a tool that does not exist is not a plan; it is a
   script for pretending.
2. **The moment a needed tool seems missing** — before substituting,
   improvising, or describing what the tool would have done. Refresh the
   registry once, search for an equivalent capability, and only then decide.
3. **On capability loss mid-task** — a capability that worked at session
   start can disappear: a host restarts, an extension disconnects, a trust
   grant is revoked. Treat that as a state change, not a mystery.

The registry refreshes on bootstrap, on an explicit refresh/doctor command,
on a tool-not-found failure, and on connect/disconnect events — never by
polling in a background loop.

---

## WHEN A CAPABILITY IS MISSING

A missing capability is routine. What is never routine is a fake call. State
it in exactly this form:

```text
[capability] is UNAVAILABLE in this host.
Effect on the task: [one concrete sentence].
Fallback: [the real alternative, or "none — this part is BLOCKED"].
```

Forbidden: pretending to call the tool, describing a hypothetical result as
if observed, and silently substituting a different capability without saying
so. The substitution rule is *say it, then do it*: name the substitute
capability and the reason, or do not substitute. If the capability loss
strands the task, mark the descriptor DEGRADED or UNAVAILABLE, search for a
safe equivalent once, re-plan if an equivalent exists, and otherwise report
UNAVAILABLE with the fallback line and let BLOCKED be a legitimate outcome.

---

## THE CATALOGUE STAYS LIGHT

The registry may hold hundreds of capabilities; a session budget does not.
The model sees **progressive disclosure**: stable names and one-line
descriptions at session start, full schemas only when a capability is
selected, lazy detail only when a call is being built. A thousand-capability
catalogue must cost no more than a ten-capability catalogue at session
start — the registry is searched and filtered, never dumped into context.

Capability names are aliases of stable IDs, and forgetting a name costs
nothing: search beats memory. But honesty is not a search problem. The
failure mode this doctrine guards against is a model that reports what it
*would* have done instead of what the host *can* do — and the cure is one
line nobody gets to skip: **UNAVAILABLE, effect, fallback.**