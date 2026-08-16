# THE INSTALLER

> `npx apex-agent attach` — the one command. Detect the host, install the deepest binding it
> supports, verify it, report the level.
>
> **The user should have to do nothing else.** Every decision the installer can make correctly
> on its own, it makes.

---

## THE COMMANDS

```
apex-agent attach [--host <name>] [--project <path>] [--level <0|1|2>] [--yes]
apex-agent detach [--host <name>]
apex-agent doctor [--verbose]
apex-agent mcp                        # run the MCP server (stdio) — used by hosts
apex-agent init [--project <path>]    # create .apex/ in a project, no host changes
apex-agent status                     # ledger summary for the current project
apex-agent --version
```

`attach` with no flags is the entire intended experience. Everything else is for recovery,
scripting, and diagnosis.

---

## WHAT `attach` DOES

```
1. DETECT      which host(s) are installed, and which is running now
2. RESOLVE     the host's config directory and project root
3. BACKUP      copy every file about to change to <file>.apex.bak
4. PAYLOAD     copy core/ + templates/ into the host config dir
5. BIND        install the deepest binding the host supports (L2 → L1 → L0)
6. MERGE       add APEX keys to the host config, preserving everything else
7. VALIDATE    re-read and parse every file written; abort and restore on any failure
8. LEDGER      create .apex/ in the project if absent
9. RECORD      write install.json listing exactly what changed
10. VERIFY     run doctor and report the achieved level
```

Steps 7 and 9 are what separate this from a script that mostly works. Step 7 catches the
Windows-path bug before the user ever sees it; step 9 is what makes `detach` exact.

---

## HOST DETECTION — INS-001

Check in this order and report **everything** found, not just the first:

| Host | Detect by |
|---|---|
| OpenCode | `opencode` on PATH · `~/.config/opencode/` exists · a server answering `GET /global/health` |
| Claude Code | `claude` on PATH · `~/.claude/` exists |
| Cursor | `~/.cursor/` · `.cursor/` in the project |
| Windsurf | `~/.codeium/windsurf/` |
| Codex CLI | `codex` on PATH · `AGENTS.md` convention |
| Gemini CLI | `gemini` on PATH · `~/.gemini/` |
| Aider | `aider` on PATH |
| Zed | `~/.config/zed/` |
| Generic | none of the above — L0 only |

```
$ npx apex-agent attach

APEX 1.0.0

Detected:
  ✓ OpenCode      1.2.4    ~/.config/opencode
  ✓ Claude Code   2.1.0    ~/.claude
  · Cursor        not found

Attaching to OpenCode (deepest available binding: L2)
Also attaching to Claude Code (L1 — MCP)
```

Multiple hosts get attached simultaneously. They do not conflict — the ledger is shared, which
means work started in one host resumes in another. That is a genuine feature, not a side
effect.

---

## PER-HOST BINDING

### OpenCode → L2

```
~/.config/opencode/
  plugins/apex.js                    the built plugin
  skills/apex-*/SKILL.md             doctrine, progressive disclosure
  agents/apex-{implementer,reviewer,researcher}.md
  commands/apex{,-status,-gate}.md
  opencode.json                      MERGED:
```
```json
{
  "plugin": ["apex-agent@1"],
  "instructions": ["AGENTS.md", ".apex/MEMORY.md"],
  "snapshot": true,
  "subagent_depth": 2
}
```

### Claude Code → L1 (+ hooks)

```bash
claude mcp add apex -- npx -y apex-agent@latest mcp
```
Plus, **with the user's consent** (hooks change harness behaviour globally):

```json
{
  "hooks": {
    "PreToolUse":  [{ "matcher": "Write|Edit", "hooks": [{ "type": "command", "command": "npx apex-agent guard" }] }],
    "PostToolUse": [{ "matcher": "Write|Edit", "hooks": [{ "type": "command", "command": "npx apex-agent verify-edit" }] }]
  }
}
```

Plus `.claude/agents/apex-*.md` and a `CLAUDE.md` section pointing at `START-HERE.md`.

### Cursor / Windsurf → L1

MCP registration in the host's config, plus the rules file
(`.cursor/rules/apex.mdc` / `.windsurfrules`) carrying the compressed doctrine.

### Generic → L0

Copy `core/` and `templates/` into the project, write `AGENTS.md` pointing at
`START-HERE.md`, create `.apex/`. Tell the user plainly what they got and what they did not:

```
No supported host detected. Installed L0 (doctrine only).
This still works — point any AI model at ./apex/START-HERE.md.
For enforcement, install OpenCode or Claude Code and re-run attach.
```

---

## NON-DESTRUCTIVE MERGE — INS-003

The rule: **read → merge → validate → back up → write.** Never generate a config from a
template over the top of an existing one.

```ts
async function mergeConfig(file: string, additions: Record<string, unknown>) {
  const original = await readTextOrNull(file)
  const existing = original ? parseJsonLenient(original) : {}    // tolerate comments/trailing commas

  const merged = { ...existing }
  for (const [k, v] of Object.entries(additions)) {
    if (Array.isArray(v) && Array.isArray(existing[k])) {
      merged[k] = [...new Set([...existing[k], ...v])]           // union, preserve order
    } else if (isObject(v) && isObject(existing[k])) {
      merged[k] = { ...existing[k], ...v }                       // shallow merge, existing wins on conflict
    } else if (existing[k] === undefined) {
      merged[k] = v                                              // only add what is absent
    }
    // else: the user already set it — LEAVE IT ALONE
  }

  // INS-003: prove nothing was lost
  for (const k of Object.keys(existing))
    if (!(k in merged)) throw new ApexError(`Merge would drop key "${k}" from ${file}. Aborting.`)

  const text = JSON.stringify(merged, null, 2)
  JSON.parse(text)                                               // INS-004: validate before writing
  if (original) await fs.writeFile(`${file}.apex.bak`, original) // INS-005
  await writeAtomic(file, text)

  const reread = JSON.parse(await fs.readFile(file, "utf8"))     // INS-004: validate after writing
  if (!deepEqual(reread, merged)) throw new ApexError(`Config write verification failed for ${file}`)
}
```

**"The user already set it — leave it alone"** is the important line. If someone has
`"snapshot": false` deliberately, APEX warns rather than overriding.

---

## THE WINDOWS-PATH REGRESSION — INS-004

This bug disabled the entire previous version of this system for weeks, silently. It gets its
own named test.

```ts
test("INS-004: Windows paths never emitted unescaped", async () => {
  const cfg = await buildOpenCodeConfig({
    pythonPath: "C:\\Users\\lalit\\AppData\\Local\\Programs\\Python\\python.exe",
    srcPath: "D:\\multiworker opencode\\Army-V3\\runtime",
  })
  const text = JSON.stringify(cfg, null, 2)

  expect(() => JSON.parse(text)).not.toThrow()          // the actual bug
  expect(text).not.toMatch(/[^\\]\\[A-Za-z](?![\\"])/)  // no lone backslash before a letter
  expect(JSON.parse(text)).toEqual(cfg)                 // round-trips exactly
})
```

Three rules that prevent it recurring, all enforced by tests:

1. Config objects are built as JS objects and serialised with `JSON.stringify`. Never by string
   concatenation, never by template literal.
2. Every write is parsed back before being accepted.
3. Paths destined for JSON are normalised to forward slashes — valid on Windows, unambiguous
   everywhere.

---

## `install.json` — INS-006

The record that makes `detach` exact rather than a guess:

```json
{
  "version": "1.0.0",
  "installedAt": "2026-08-16T09:20:00Z",
  "hosts": [{
    "name": "opencode",
    "level": 2,
    "configDir": "C:/Users/lalit/.config/opencode",
    "filesCreated": [
      "plugins/apex.js",
      "skills/apex-doctrine/SKILL.md",
      "agents/apex-implementer.md",
      "commands/apex.md"
    ],
    "filesModified": [{
      "path": "opencode.json",
      "backup": "opencode.json.apex.bak",
      "keysAdded": ["plugin", "instructions", "snapshot", "subagent_depth"],
      "keysPreexisting": ["mcp", "model", "theme"]
    }]
  }],
  "projects": ["D:/work/myapp"]
}
```

`detach` reads this, removes only `filesCreated`, restores each `filesModified` from its
backup, and leaves `.apex/` alone — that is the user's project record, not APEX's.

---

## `doctor` — INS-008

```
$ npx apex-agent doctor

APEX Doctor

HOST
  ✓ OpenCode 1.2.4 detected at ~/.config/opencode
  ✓ Server responding at http://127.0.0.1:4096
  ✓ 3 providers connected, 11 models available

BINDING
  ✓ Plugin present:      plugins/apex.js (1.0.0)
  ✓ Plugin loaded:       .apex/runtime.json reports level 2
  ✓ opencode.json:       valid JSON, APEX keys present, user keys intact
  ✓ Doctrine payload:    12 core files, 10 templates
  ✗ snapshot:            disabled — rollback will degrade to file copies
                         fix: set "snapshot": true in opencode.json

PROJECT  D:/work/myapp
  ✓ Ledger present:      .apex/ (23 requirements, 14 verified, 1 blocked)
  ✓ Verify commands:     test=pytest  types=mypy src/  lint=ruff check src/
  ⚠ Baseline stale:      captured 3 days ago — re-run to attribute failures correctly

LEVEL: 2  (deepest available on this host)

1 error, 1 warning. Run `apex-agent doctor --verbose` for detail.
```

Seed five broken states in tests and assert doctor identifies each: invalid JSON config ·
plugin file present but not loaded · payload missing · ledger corrupt · host not running.

---

## FAILURE BEHAVIOUR — INS-013

Every failure names the file, the cause, and the fix:

```
✗ Cannot write to C:/Users/lalit/.config/opencode/opencode.json
  Cause: file is read-only
  Fix:   remove the read-only attribute, or run:
         attrib -R "C:\Users\lalit\.config\opencode\opencode.json"
  Nothing was changed. Re-run attach afterwards.
```

Rules:
- **Atomic overall.** If any step fails, restore every backup and exit non-zero. A half-attached
  state is worse than no attach.
- **Never proceed past a validation failure.** A config that does not re-parse is not written.
- **Never require the network** after the package is fetched (INS-012).
- **Never prompt for a credential** (INS-011). If a host is unauthenticated, say so and point at
  the host's own login command.

---

## IDEMPOTENCE — INS-010

```
$ npx apex-agent attach

APEX is already attached to OpenCode at level 2 (version 1.0.0, current).
Nothing to do.

  apex-agent doctor     check health
  apex-agent detach     remove
```

Re-running must be safe, silent, and fast. Version upgrade is the one case that writes: back
up, replace the payload and plugin, preserve config keys and the ledger.

---

## VERIFICATION CHECKLIST FOR THIS PHASE

- [ ] Correct detection for each host, and for a machine with none
- [ ] Rich pre-existing config survives: diff shows only APEX additions
- [ ] **INS-004 regression test passes**
- [ ] `.bak` matches the original byte-for-byte
- [ ] `detach` restores byte-identical config and removes only what it created
- [ ] `doctor` correctly identifies all five seeded broken states
- [ ] Second `attach` is a no-op
- [ ] Attach succeeds with networking disabled
- [ ] Attach fails atomically on a read-only config and restores everything
- [ ] Works on Windows and POSIX (CI matrix)
- [ ] No credential is ever read or requested

---

Next: `TESTING.md` · `ROADMAP.md`
