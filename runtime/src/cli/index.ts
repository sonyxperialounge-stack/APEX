/*
 * APEX — ARMY V3 — Copyright (c) 2026 Lalit. All rights reserved.
 * Licensed under the APEX Personal Use License 1.0 (see the LICENSE file).
 * Not open source: personal, non-commercial use of unmodified copies only.
 * Modification, resale, commercial use, and renaming are prohibited.
 * Removing this notice or the LICENSE grants no rights whatsoever.
 */

/**
 * CLI entry point.
 *
 * Human-facing output goes to stderr via `say()` so that stdout stays clean — `apex-agent
 * mcp` shares this process and stdout is the protocol stream there.
 */

import path from "node:path"
import { runStdioServer, VERSION } from "../mcp/server.ts"
import { attach, detach, doctor } from "./attach.ts"
import { detectProjectRoot, KNOWN_HOSTS, type HostName } from "./detect.ts"
import { Ledger } from "../engines/ledger.ts"
import { Verifier } from "../engines/verifier.ts"
import { RealCommandRunner } from "../core/exec.ts"
import { runGate } from "../mcp/tools.ts"
import { say } from "../core/log.ts"

const USAGE = `
APEX ${VERSION} — an operating doctrine for AI coding agents

  apex-agent attach [--host <name>] [--all-hosts]        install into ONE host (the deepest available)
  apex-agent detach [--host <name>]                      remove cleanly, restoring your original config
  apex-agent doctor [--project <path>]                   what is installed, what is broken, how to fix it
  apex-agent init [--project <path>]                     create .apex/ only, no host changes
  apex-agent status [--project <path>]                   ledger summary for a project
  apex-agent gate [--project <path>]                     run the completion gate
  apex-agent mcp [--project <path>]                      run the MCP stdio server (hosts call this)
  apex-agent --version

Hosts: ${KNOWN_HOSTS.join(", ")}
`.trim()

interface Args {
  command: string
  host?: HostName
  project?: string
  json: boolean
  allHosts: boolean
}

export function parseArgs(argv: string[]): Args {
  const out: Args = { command: argv[0] ?? "help", json: false, allHosts: false }
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--host") out.host = argv[++i] as HostName
    else if (arg === "--project" || arg === "-p") out.project = argv[++i]
    else if (arg === "--json") out.json = true
    else if (arg === "--all-hosts") out.allHosts = true
  }
  if (out.host && !KNOWN_HOSTS.includes(out.host)) {
    throw new Error(`Unknown host "${out.host}". Known: ${KNOWN_HOSTS.join(", ")}`)
  }
  return out
}

export async function main(argv: string[]): Promise<void> {
  const args = parseArgs(argv)
  const projectRoot = path.resolve(args.project ?? detectProjectRoot())

  switch (args.command) {
    case "mcp":
      await runStdioServer(projectRoot)
      return

    case "attach": {
      say(`\nAPEX ${VERSION}\n`)
      const result = await attach({ host: args.host, projectRoot, allHosts: args.allHosts })
      if (args.json) {
        process.stderr.write(JSON.stringify(result, null, 2) + "\n")
        return
      }
      if (result.alreadyAttached) {
        for (const message of result.messages) say(`  ${message}`)
        say(`\n  apex-agent doctor     check health`)
        say(`  apex-agent detach     remove\n`)
        return
      }
      for (const host of result.hosts) {
        say(`  ✓ ${host.name} — level ${host.level}`)
        say(`      ${host.filesCreated.length} file(s) installed in ${host.configDir}`)
        for (const modified of host.filesModified) {
          say(
            `      ${path.basename(modified.path)}: ${modified.keysAdded.length} key(s) added, ` +
              `${modified.keysPreexisting.length} preserved${modified.backup ? ", backup written" : ""}`,
          )
        }
      }
      say(`  ${result.ledgerCreated ? "✓" : "·"} ledger ${result.ledgerCreated ? "created" : "already present"} in ${path.join(projectRoot, ".apex")}`)
      const cmds = Object.entries(result.verifyCommands).filter(([, v]) => v)
      if (cmds.length) say(`  ✓ verify commands: ${cmds.map(([k, v]) => `${k}=${v}`).join("  ")}`)
      for (const message of result.messages) say(`\n  ${message}`)
      say(`\nLEVEL ${result.level}.\n`)
      return
    }

    case "detach": {
      const result = await detach(args.host)
      say(`\nAPEX detached.`)
      say(`  ${result.removed.length} file(s) removed`)
      say(`  ${result.restored.length} config file(s) restored from backup`)
      if (result.notFound.length) say(`  ${result.notFound.length} item(s) were already gone`)
      say(`  .apex/ was left in place — it is your project's record, not APEX's.\n`)
      return
    }

    case "doctor": {
      const { lines, level } = await doctor(projectRoot)
      say(`\nAPEX Doctor\n`)
      let section = ""
      for (const line of lines) {
        if (line.section !== section) {
          section = line.section
          say(`${section}`)
        }
        const mark = line.status === "ok" ? "✓" : line.status === "warn" ? "⚠" : "✗"
        say(`  ${mark} ${line.message}`)
        if (line.fix) say(`      fix: ${line.fix}`)
      }
      const errors = lines.filter((l) => l.status === "error").length
      const warnings = lines.filter((l) => l.status === "warn").length
      say(`\nLEVEL: ${level}`)
      say(`${errors} error(s), ${warnings} warning(s)\n`)
      if (errors) process.exitCode = 1
      return
    }

    case "init": {
      const ledger = new Ledger(projectRoot)
      const result = await ledger.init({ projectRoot })
      const config = await ledger.loadConfig()
      const verifier = new Verifier(config, new RealCommandRunner(), ledger)
      const commands = await verifier.ensureCommands()
      say(`\n${result.created ? "Created" : "Found existing"} ledger at ${path.join(projectRoot, ".apex")}`)
      const cmds = Object.entries(commands).filter(([, v]) => v)
      say(
        cmds.length
          ? `Verify commands: ${cmds.map(([k, v]) => `${k}=${v}`).join("  ")}\n`
          : `No verification commands detected — checks will report NOT_RUN until configured.\n`,
      )
      return
    }

    case "status": {
      const status = await new Ledger(projectRoot).status()
      if (args.json) {
        process.stderr.write(JSON.stringify(status, null, 2) + "\n")
        return
      }
      say(`\nAPEX — ${projectRoot}`)
      say(`  level: ${status.level}`)
      say(`  requirements: ${status.totalRequirements}`)
      for (const [key, value] of Object.entries(status.totals)) if (value) say(`    ${key}: ${value}`)
      if (status.activeRequirement) say(`  active: ${status.activeRequirement}`)
      for (const blocked of status.blocked) say(`  BLOCKED ${blocked.id} — ${blocked.reason}`)
      if (status.resumePoint.nextAction) say(`  next: ${status.resumePoint.nextAction}`)
      say("")
      return
    }

    case "gate": {
      const result = await runGate(new Ledger(projectRoot))
      say(`\n${result.verdict}\n`)
      for (const failure of result.failures) say(`  · ${failure}`)
      say("")
      if (!result.passed) process.exitCode = 1
      return
    }

    case "--version":
    case "-v":
    case "version":
      process.stderr.write(VERSION + "\n")
      process.stderr.write(
        "Copyright (c) 2026 Lalit — APEX Personal Use License 1.0.\n" +
          "Personal non-commercial use only; modification, resale, and renaming are prohibited.\n",
      )
      return

    case "help":
    case "--help":
    case "-h":
      say(USAGE)
      return

    default:
      say(`Unknown command "${args.command}".\n`)
      say(USAGE)
      process.exitCode = 1
  }
}
