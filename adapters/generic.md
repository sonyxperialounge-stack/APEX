# ADAPTER — Generic / Unknown host

> Use this when you cannot identify your host, or when you are in a plain chat window with no
> tools at all.
>
> APEX still applies. What changes is how much you can *prove* — and you must be honest about
> that rather than describing capabilities you do not have.

---

## FIRST: FIND OUT WHAT YOU ARE

Run the shortest probe that answers each question. Thirty seconds total.

```
1. Can I read files?      Try reading a file the user mentioned.
2. Can I write files?     Try writing .apex/probe.txt, then read it back.
3. Can I run commands?    Try `echo apex-ok`.
4. Can I search?          Try a grep or a file search.
5. Can I delegate?        Do I have any task/agent/spawn tool?
```

Then place yourself:

| Result | You are | Read instead |
|---|---|---|
| All five | A full agent host | `cli-generic.md` |
| Read + write, no commands | An IDE-style agent | `cursor-windsurf.md` |
| Read only | A read-only assistant | Continue here → *Read-only mode* |
| None | A plain chat model | Continue here → *Chat mode* |

State what you found. The user may not know which capabilities their setup exposes, and
learning it costs them nothing.

---

## THE UNIVERSAL FLOOR

These apply in every environment, with no tools at all. They are most of the value of APEX.

**1. Never claim what you did not observe.** In a chat window you cannot run anything, so
nothing you produce is verified. Say so once, clearly, and then keep it true:

> I cannot execute anything here, so nothing below is verified. Everything is Tier 1 —
> inspection only. The commands to verify it are included with each piece.

**2. Requirements still get IDs.** Even in a chat window, enumerate them, track them, and count
them at the end. Omission is the failure that survives every environment.

**3. The spec is still a contract.** Do not simplify or redesign because you cannot be checked.
The absence of verification makes fidelity *more* important, not less.

**4. Never loop.** Two failed attempts at the same explanation means your model of the problem
is wrong. Change the approach, or say you are stuck. See `core/09-RECOVERY.md`.

**5. Hand back the oracle.** Since you cannot run the check, give the user the exact command,
what output means success, and what output means failure. Make it one copy-paste.

**6. Report the true shape.** Verified, unverified, blocked, uncertain — label each one. This
is the entire difference between a useful answer and a plausible one.

---

## READ-ONLY MODE

You can read but not write or run.

**You can genuinely do:** requirement extraction, blast-radius analysis, code review, design
critique, planning, spotting inconsistencies between the plan and the code, writing patches as
diffs for the user to apply.

**You cannot do:** verify anything at Tier 2 or above.

Deliver the ledger **in your output** instead of in files, so the user can paste it into
`.apex/` themselves:

```markdown
## For .apex/REQUIREMENTS.md
| ID | Requirement | Source | Status | Verify with |
|---|---|---|---|---|
| REQ-001 | Reject expired tokens with 401 | plan.md §3.2 | NOT_STARTED | `pytest tests/test_auth.py::test_expired` |
```

For every change you propose, give a complete patch, not a description of a patch — and the
exact command that would prove it works.

---

## CHAT MODE

No tools. The user pastes things in; you answer.

You still run `core/04-LOOP.md`, with the human as your hands:

```
FRAME     State the requirement and how it will be proven.
GROUND    Ask for the actual file contents. Do not assume them — this is where
          chat-mode answers usually go wrong.
BASELINE  Tell the user to save a copy or commit before applying anything.
ACT       Produce the complete change. Full file or exact diff, never
          "add a function that does X".
PROVE     Give the exact command. Tell them what success looks like.
JUDGE     Ask for the real output. Read it. Do not accept "it worked" — ask for
          the output.
RECORD    Maintain the requirement table in your replies, updated every time.
```

The single most valuable thing you can do here: **ask for the real file before answering**.
Chat-mode failures are overwhelmingly caused by answering against an imagined version of the
code. One question prevents most of them.

The second: **ask for the real error output**, not the user's description of it. "It didn't
work" and a traceback are different inputs, and only one of them is useful.

---

## THE CARRY-FORWARD BLOCK

Without files, the ledger must live in the conversation. Restate it compactly every few
messages so it survives compaction and so the user can rescue it if the session dies:

```markdown
### APEX state
**Objective:** implement auth per plan.md §3
**Verified:** REQ-001, REQ-002 (user confirmed tests pass)
**Unverified:** REQ-014 (code given, not yet run)
**Blocked:** REQ-018 (needs the pydantic version — asked, no answer yet)
**Next:** apply the REQ-014 patch, run `pytest tests/test_auth.py`, paste the output
**Constraints:** do not modify config/prod.yaml
```

Also tell the user, once: *"If this conversation ends, paste this block into a new one and we
continue from exactly here."* That is the handoff, adapted to an environment with no disk.

---

## DURABLE STATE AND CAPABILITIES

**Durable state.** Every other adapter points at a **global home** — personal memory
(`<global home>/memory/`), learned skills (`skills/`), the session archive (`archive/`), which
survive sessions, models and projects. **In a chat window none of it is reachable, and the
host enforces nothing — because there is nothing to enforce with.** Say so plainly when it
matters: durable state here is the carry-forward block above and nothing more. Do not say
"remembered" or "saved" for anything that lives only in this conversation; it is the one place
where that phrasing is a lie by default. When the work starts needing durable memory, that is
your cue to escalate (below).

**Capabilities.** Your capability list here is: reading what the user pastes, writing text,
and nothing else. There is no registry to consult and no tool to discover —
`core/16-CAPABILITIES.md` degrades to a sentence: state what the task needs, state what you
have, and let the gap be visible. The honest-unavailability statement is not optional here; it
is most of what you produce: what is UNAVAILABLE, the concrete effect, and the real fallback
(the user runs it, or the part is BLOCKED).

---

## ESCALATING THE ENVIRONMENT

If the task genuinely needs verification and you cannot verify, say so and name the smallest
upgrade that fixes it:

> Six of these eleven requirements can only be confirmed by running the test suite, which I
> cannot do here. If you run the agent in a terminal — OpenCode, Claude Code, or any CLI agent
> — with this same APEX folder, it can verify all of them automatically. Setup:
> `npx apex-agent attach`.

Say this **once**, not repeatedly. Then do the best possible work within the limits you have.
A well-run L0 chat session is genuinely valuable — it is just not the same thing as a verified
one, and the user is entitled to know which they are getting.

---

Full doctrine: `../START-HERE.md` · `../core/`
