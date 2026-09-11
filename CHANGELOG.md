# What changed in APEX

Written for the owner, not for a changelog format. One section per release; newest first.

---

## 2.0.0 — the V4 release

The discipline you had — evidence before claims, requirements that cannot silently vanish, a
completion gate that refuses to lie — is unchanged. What is new is that APEX now **remembers**,
**learns**, and **shows you everything it keeps**.

### Why you care, in five lines

- **It remembers now.** Preferences and hard-won facts survive across sessions, projects and
  models. You can see everything it remembers (`memory journey`), correct it
  (`memory correct`), or delete it (`memory retract --reason`, `memory journey --forget`).
- **It learns procedures.** After it solves something difficult and proves the solution worked,
  it can save the method as a skill and reuse it. A skill only becomes active after it is
  checked — and promotion without checks needs your explicit, recorded override.
- **It knows what it can actually do.** It looks at the tools your AI host really provides. If
  something is missing, it says UNAVAILABLE instead of pretending.
- **It picks up where it left off.** Every session is archived with what it did and why. A
  different model tomorrow reads the same files and continues. You do not repeat yourself.
- **Still nothing to set up.** No account, no key, no server, no background program. One
  folder, one file to read. The commands below are optional improvements, never prerequisites.

### Added — memory

Durable personal memory, in two scopes. **Global memory** lives in your APEX home folder and
travels with you across projects. **Project memory** lives in the project's `.apex/` and
belongs to that project. Corrections always win over what was learned earlier; nothing is
ever deleted silently — a retraction keeps the record with its reason.

New commands (all with `--help`):

```bash
apex-agent memory list [--project|--global] [--category X]
apex-agent memory show <MEM-id>
apex-agent memory add "<text>" --scope global|project --key <semantic.key>
apex-agent memory correct <MEM-id> "<new text>"
apex-agent memory retract <MEM-id> --reason "<why>"
apex-agent memory pending                     # staged writes awaiting your approval
apex-agent memory approve <id> | reject <id>
apex-agent memory journey [--forget <id>] --reason "<why>"
apex-agent memory export --out <file>
apex-agent memory off --project               # stop retrieving global memory here
```

Memory writes can be staged instead of applied: what the model wants to remember appears
under `memory pending` and only becomes real when you approve it.

### Added — skills

A skill is a reusable procedure the system learned from work it actually verified. Skills are
stored as plain `SKILL.md` files, searched and loaded on demand, and retired when they go
stale. A failing skill is relearned, never silently trusted.

```bash
apex-agent skills list [--stale] [--candidates]
apex-agent skills search "<term>" | show <category/name>
apex-agent skills stage <file.md>
apex-agent skills promote <name> --i-accept-unverified   # explicit override, recorded
apex-agent skills retire <name> --reason "<why>"
apex-agent skills trust <path>                # explicit, hash-bound, never automatic
apex-agent skills pin <name> | unpin <name> | reset <name>
apex-agent skills run <name-or-bundle>
apex-agent skills journey [--forget <name>] --reason "<why>"
```

Trust is hash-bound: a grant made to one file's exact content never silently transfers to a
modified one. The security scan result for a skill can be `deny` (refused outright), `review`
(only your explicit override with a recorded justification installs it) or `allow`.

### Added — session archive and resume

Every session is recorded — what it did, what it verified, where it stopped — in the session
archive. The archive is historical record: it informs the next session, it never silently
becomes current truth.

```bash
apex-agent session list
apex-agent session search "<query>"
apex-agent session show <SES-id>
apex-agent session prune --dry-run            # then --yes to actually prune
apex-agent archive discover|browse|read|scroll   # the same archive, archival names
```

### Added — the APEX home

Your personal data now lives in one place, the APEX home folder (`~/.apex/` by default):
memory, skills, the session archive, trust grants. One command shows it, one command exports
it, one command brings over data from the old Army home.

```bash
apex-agent home show                          # path, mode, risks, sizes
apex-agent home export --out <file>           # everything personal, in one redacted file
apex-agent home migrate-from-army             # one-time copy from a legacy ~/.army (never deletes it)
```

`~/.army` (if you have one from the previous version) is never moved or deleted — migration
is explicit, and only copies.

### Added — configuration surface

Settings live in two files: the project's `.apex/config.json` and the global
`config.json` in the APEX home. The project file wins on conflicts, with deliberate
exceptions: autonomy takes the MORE restrictive of the two layers, protective lists
(`doNotRead`, `doNotTouch`) union, and `allowedPaths` intersects. Unknown keys are reported
with the file they came from and the closest known name. A V3 project's config is migrated in
place on first load — with a backup and a journal entry — and keeps working unchanged.

### Added — the CLI you already had, finished

```bash
apex-agent attach [--host <name>] [--all-hosts]
apex-agent detach [--host <name>]             # never deletes memory or project state
apex-agent doctor [--repair]                  # read-only; safe to run any time
apex-agent status | init | gate | mcp | --version
```

Every command prints useful `--help` and exits non-zero on real failure. No command ever
asks for a credential.

### Changed

- `templates/config.json` ships the full V4 key surface with comments for every section.
- START-HERE, the adapters and the doctrine payload gained the durable-state and capability
  paragraphs; see [`docs/SCHEMA-CHANGELOG.md`](docs/SCHEMA-CHANGELOG.md) for the exact
  store versions behind this release.
- Verification evidence, memory decisions and skill promotions all record their evidence IDs,
  so `memory journey` and `skills journey` can show *why* the system believes something.

### Data ownership — the short version

Removing the binding (`apex-agent detach`) deletes **nothing** personal. `apex-agent home
export` produces one redacted archive of everything personal. Deleting the APEX home folder
deletes your personal memory, skills and session archive — that folder is where they live.
Project state lives in `.apex/` inside the project and belongs to the project. Nothing is
uploaded anywhere. There is no account and no telemetry.

### Known limitations

Listed, dated and honest, in `docs/KNOWN-LIMITATIONS.md` — shipped with the release.
