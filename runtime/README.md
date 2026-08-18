# apex-agent

The APEX runtime. Gives any MCP-capable AI coding host durable requirement tracking,
grounded verification, protected paths, and a real completion gate.

Doctrine lives one directory up, in [`../core/`](../core/). This package is what makes it
**enforced** rather than merely requested.

---

## Install

```bash
npx apex-agent attach
```

Detects your host, installs the deepest binding it supports, merges your config
non-destructively (with a backup), creates the project ledger, and reports the level.

```
apex-agent attach [--host <name>] [--project <path>]
apex-agent detach [--host <name>]     remove cleanly, restoring your original config
apex-agent doctor                     what is installed, what is broken, how to fix it
apex-agent init                       create .apex/ only, no host changes
apex-agent status                     ledger summary
apex-agent gate                       run the completion gate
apex-agent mcp                        the MCP stdio server (hosts call this)
```

---

## What it does

| Tool | Effect |
|---|---|
| `apex_req_add` | Requirements become objects with IDs, acceptance criteria, and a proving command |
| `apex_req_status` | **Illegal transitions are rejected.** `VERIFIED_COMPLETE` without a passing verification record is refused |
| `apex_verify` | Runs the real cascade — parse → types → lint → targeted test → suite → build — and records the literal output |
| `apex_check` | Answers whether an operation is permitted *before* it runs, with the rule that decided |
| `apex_snapshot` / `apex_rollback` | Undo exactly your change, never the user's unrelated work |
| `apex_gate` | Refuses completion while anything is unverified, blocked, or regressed |
| `apex_handoff` | Generates the successor briefing from recorded state, not from a summary |

The refusals are the product. A model that tries to shortcut is told precisely what to do
instead, which converts a doctrine rule into a mechanism it cannot forget.

---

## Status

**All 11 phases built and verified.** Seven engines, the MCP server (L1), the OpenCode
plugin (L2), and the installer.

```
npm run verify       typecheck + full suite + build, all green
npm pack + install   CLI, MCP server and L2 plugin all run from the tarball
```

Exact counts live in [`.apex/VERIFICATION.md`](.apex/VERIFICATION.md), where they are dated
evidence of a specific run. Prose that hardcodes a number goes stale the moment someone adds
a test — which this project did to itself twice.

Not yet done: the live manual checklist in `../build/TESTING.md`, against a real OpenCode
installation. Mock-green is not shipped-green.

This package's own construction is recorded in [`.apex/`](.apex/), built under APEX.

---

## Development

```bash
npm install          # typescript + @types/node only; zero runtime dependencies
npm run verify       # typecheck + tests + build
npm test             # node --test with native type stripping — no build needed
npm run build        # compile to dist/ (required before packing)
```

### Two rules that exist because they were violated

**Ship compiled JavaScript.** Node refuses to strip TypeScript types for files under
`node_modules`, so a package shipping raw `.ts` installs cleanly and throws on first run.
`prepack` builds; `test/cli/packaging.test.ts` keeps it that way.

**Never build config text by concatenation.** `C:\Users\x` written into JSON is an invalid
escape that makes the whole file unparseable, and the host then silently loads none of it.
Everything goes through `serialiseChecked`, which parses its own output before writing.
This exact bug disabled the previous version of this system for weeks.

### Layout

```
src/core/       types, paths, redaction chokepoint, safe JSON I/O, exec, logging
src/engines/    ledger · verifier · governor · cortex · warden · recall · council
                (host-agnostic, I/O injected, testable with no host running)
src/mcp/        stdio server + the apex_* tool surface        (L1)
src/plugin/     OpenCode hooks, every one wrapped by safe()   (L2)
src/host/       host abstraction + a null client that degrades honestly
src/cli/        attach · detach · doctor · detect
payload/        the doctrine, shipped so attach works offline
```

Engines never import from `mcp/`, `cli/`, or `host/`. Dependencies point one way only, which
is what keeps every engine testable with no host running.

---

## License

Not open source. Distributed under the **APEX Personal Use License 1.0**
([`LICENSE`](LICENSE)): free personal, non-commercial use of unmodified copies only.
You may **not** sell, modify, or rename this software.
