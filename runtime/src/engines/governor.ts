/**
 * GOVERNOR — permission and safety (GOV-001..013).
 *
 * The security surface. Two asymmetric principles:
 *   - fail OPEN on capability: a missing feature degrades, never crashes;
 *   - fail CLOSED on safety: an unrecognised or ambiguous path is protected.
 *
 * The hard blocklist runs BEFORE the mode policy, in every mode including FULL_AUTO.
 * No configuration value can reorder that.
 */

import path from "node:path"
import fsp from "node:fs/promises"
import crypto from "node:crypto"
import type {
  ApexConfig,
  AutonomyMode,
  Decision,
  Operation,
  RollbackReport,
  SnapshotFileRef,
  SnapshotRef,
} from "../core/types.ts"
import { canonicalCase, globMatch, isUnder, realpathSafe, apexDir } from "../core/paths.ts"
import { containsSecret } from "../core/redact.ts"
import { existsSync } from "../core/json.ts"
import { event, log } from "../core/log.ts"

export interface GitClient {
  isRepo(): Promise<boolean>
  head(): Promise<string | null>
  statusShort(): Promise<string[]>
}

interface Rule {
  id: string
  reason: string
  test: (op: Operation, gov: Governor) => boolean
}

/**
 * GOV-005 — destructive command classification.
 *
 * These patterns exist here as DETECTION, which is why this file is exempt from the
 * source scan that forbids destructive git strings elsewhere in the package.
 */
const UNBOUNDED_DELETE =
  /(?:^|[;&|]\s*)rm\s+(?:-[a-zA-Z]*\s+)*-?[a-zA-Z]*[rR][a-zA-Z]*f|(?:^|[;&|]\s*)rm\s+(?:-[a-zA-Z]*\s+)*-?[a-zA-Z]*f[a-zA-Z]*[rR]|find\s+[^|]*-delete|find\s+[^|]*-exec\s+rm|Remove-Item[^|]*-Recurse[^|]*-Force|rmdir\s+\/s/i

const HISTORY_REWRITE =
  /git\s+(?:[\w-]+\s+)*(?:push\s+[^|;&]*--force(?!-with-lease)|reset\s+--hard|clean\s+-[a-z]*f|checkout\s+\.\s*$|checkout\s+--\s+\.\s*$)/i

const BLANKET_STASH = /git\s+stash(?!\s+(?:push|list|show|apply|pop|drop))/i

const SQL_DESTRUCTIVE = /\b(?:DROP\s+(?:DATABASE|SCHEMA|TABLE)|TRUNCATE\s+TABLE|TRUNCATE\s+\w)/i

const RULES: Rule[] = [
  {
    id: "protected-read",
    reason:
      "This path is in do_not_read. It is never opened, summarised, indexed, or passed to a " +
      "subagent. Do not retry it or route around it with another tool.",
    test: (op, gov) => op.kind === "read" && Boolean(op.path) && gov.isProtectedRead(op.path!),
  },
  {
    id: "protected-write",
    reason:
      "This path is in do_not_touch, or lies outside allowed_paths. It is never modified, " +
      "moved, renamed, deleted or reformatted. Do not retry it or route around it. If the " +
      "work genuinely requires it, stop and ask the user.",
    test: (op, gov) =>
      (op.kind === "write" || op.kind === "delete") && Boolean(op.path) && gov.isProtectedWrite(op.path!),
  },
  {
    id: "unbounded-delete",
    reason:
      "This is an unbounded recursive delete. Enumerate what it matches first (ls / --dry-run), " +
      "then narrow it to exactly the paths you intend.",
    test: (op, gov) => op.kind === "bash" && UNBOUNDED_DELETE.test(op.command ?? "") && !gov.isBoundedToProject(op),
  },
  {
    id: "history-rewrite",
    reason:
      "This rewrites or discards work that may not be yours. Use --force-with-lease on a branch " +
      "you created, and revert only the specific files you changed.",
    test: (op) => op.kind === "bash" && HISTORY_REWRITE.test(op.command ?? ""),
  },
  {
    id: "blanket-stash",
    reason:
      "A blanket stash captures the user's uncommitted work along with yours. Use a targeted " +
      "`git stash push -- <paths>` for files you authored, or take a snapshot instead.",
    test: (op) => op.kind === "bash" && BLANKET_STASH.test(op.command ?? ""),
  },
  {
    id: "sql-destructive",
    reason: "Destructive schema or data operation. This requires explicit human authorisation.",
    test: (op) => op.kind === "bash" && SQL_DESTRUCTIVE.test(op.command ?? ""),
  },
  {
    id: "secret-egress",
    reason: "This payload contains something that looks like a credential. It is never transmitted.",
    test: (op) => op.kind === "network" && containsSecret(op.payload ?? ""),
  },
  {
    id: "external-effect",
    reason:
      "Deploys, payments, and outbound messages are externally visible and are not reversible " +
      "by source control. They always require explicit human authorisation.",
    test: (op) => op.kind === "deploy" || op.kind === "payment" || op.kind === "message",
  },
  {
    id: "self-modify",
    reason:
      "An agent may not widen its own permissions. Ask the user to change autonomy or the " +
      "protected paths in .apex/config.json themselves.",
    test: (op, gov) => (op.kind === "write" || op.kind === "delete") && gov.isApexSelfModification(op),
  },
]

/** GOV-001 — what each mode does with an operation that survived the blocklist. */
const ROUTINE: Operation["kind"][] = ["read", "write"]

export class Governor {
  cfg: ApexConfig
  private git: GitClient | null

  constructor(cfg: ApexConfig, git: GitClient | null = null) {
    this.cfg = cfg
    this.git = git
  }

  // ── Decisions ────────────────────────────────────────────────────────────

  /** GOV-002 — the blocklist runs first, always, in every mode. */
  decide(op: Operation): Decision {
    for (const rule of RULES) {
      let hit = false
      try {
        hit = rule.test(op, this)
      } catch (err) {
        // Fail CLOSED on safety: an evaluation error is treated as a hit.
        log.error(`Governor rule ${rule.id} threw; denying by default`, { err: String(err) })
        hit = true
      }
      if (hit) {
        const decision: Decision = {
          allowed: false,
          rule: rule.id,
          reason: `[APEX BLOCKED: ${rule.id}] ${rule.reason}`,
          requiresSnapshot: false,
          ask: false,
        }
        event("governor.block", { rule: rule.id, kind: op.kind, path: op.path })
        return decision
      }
    }
    return this.modePolicy(op)
  }

  private modePolicy(op: Operation): Decision {
    const mode: AutonomyMode = this.cfg.autonomy
    const risky = this.isRisky(op)
    const requiresSnapshot = op.kind === "write" || op.kind === "delete" || risky

    const allow = (reason: string): Decision => ({
      allowed: true,
      rule: `mode:${mode}`,
      reason,
      requiresSnapshot,
      ask: false,
    })
    const ask = (reason: string): Decision => ({
      allowed: false,
      rule: `mode:${mode}`,
      reason,
      requiresSnapshot,
      ask: true,
    })

    switch (mode) {
      case "MANUAL":
        return op.kind === "read"
          ? allow("MANUAL: reading is always permitted")
          : ask("MANUAL: propose the change and wait for an explicit yes")
      case "GUARDED":
        return risky
          ? ask(`GUARDED: ${this.riskLabel(op)} needs a one-time confirmation`)
          : allow("GUARDED: routine operation")
      case "AUTO":
      case "FULL_AUTO":
        return allow(`${mode}: proceeding — snapshot ${requiresSnapshot ? "required" : "not required"}`)
    }
  }

  /** Operations GUARDED pauses on: irreversible or externally visible. */
  isRisky(op: Operation): boolean {
    if (op.kind === "delete") return true
    if (ROUTINE.includes(op.kind)) return false
    if (op.kind !== "bash") return true
    const cmd = op.command ?? ""
    return (
      /\bgit\s+(?:commit|push|merge|rebase|reset|tag|revert)\b/i.test(cmd) ||
      /\b(?:npm|pnpm|yarn|pip|uv|cargo|go)\s+(?:install|add|i|get)\b/i.test(cmd) ||
      /\b(?:alembic|migrate|prisma|flyway|liquibase)\b/i.test(cmd) ||
      /\brm\b|\bdel\b|Remove-Item/i.test(cmd) ||
      /\b(?:docker|kubectl|terraform|helm|systemctl)\b/i.test(cmd)
    )
  }

  private riskLabel(op: Operation): string {
    const cmd = op.command ?? ""
    if (op.kind === "delete" || /\brm\b|\bdel\b|Remove-Item/i.test(cmd)) return "deleting files"
    if (/\bgit\b/i.test(cmd)) return "a git operation"
    if (/install|add\b/i.test(cmd)) return "installing a dependency"
    if (/migrate|alembic|prisma/i.test(cmd)) return "a database migration"
    return "this operation"
  }

  // ── GOV-003, GOV-004 — path protection ───────────────────────────────────

  private resolve(p: string): string {
    return realpathSafe(path.isAbsolute(p) ? p : path.resolve(this.cfg.projectRoot, p))
  }

  private matchesAny(target: string, patterns: string[]): boolean {
    const norm = canonicalCase(target)
    const rel = canonicalCase(path.relative(this.resolve(this.cfg.projectRoot), target).replace(/\\/g, "/"))
    for (const pattern of patterns) {
      if (!pattern) continue
      const resolved = this.resolve(pattern)
      if (norm === resolved || isUnder(norm, resolved)) return true
      // Also match the pattern as a glob, against both the absolute and relative form.
      if (globMatch(norm, canonicalCase(pattern))) return true
      if (rel && globMatch(rel, canonicalCase(pattern))) return true
    }
    return false
  }

  isProtectedRead(target: string): boolean {
    if (!target) return true
    return this.matchesAny(this.resolve(target), this.cfg.doNotRead)
  }

  /**
   * GOV-003 — deny by default outside allowed_paths, then match do_not_touch.
   *
   * Must survive: `..` traversal · absolute paths · symlinks into a protected directory ·
   * Windows case variation · trailing slashes · globs that expand onto a protected file.
   */
  isProtectedWrite(target: string): boolean {
    if (!target) return true
    const resolved = this.resolve(target)

    // Deny-by-default: anything outside the allowed work area is protected.
    const allowed = this.cfg.allowedPaths.length ? this.cfg.allowedPaths : ["."]
    const inAllowed = allowed.some((a) => {
      const root = this.resolve(a)
      return canonicalCase(resolved) === canonicalCase(root) || isUnder(resolved, root)
    })
    if (!inAllowed) return true

    // The ledger's own snapshots are written by APEX and are not user content.
    if (isUnder(resolved, this.resolve(apexDir(this.cfg.projectRoot)))) {
      return this.isApexSelfModification({ kind: "write", path: target })
    }

    return this.matchesAny(resolved, this.cfg.doNotTouch)
  }

  /** GOV-011 — an agent may not widen its own permissions. */
  isApexSelfModification(op: Operation): boolean {
    if (!op.path) return false
    const resolved = this.resolve(op.path)
    const configFile = this.resolve(path.join(apexDir(this.cfg.projectRoot), "config.json"))
    return canonicalCase(resolved) === canonicalCase(configFile)
  }

  /** True when a shell command is provably confined to the project directory. */
  isBoundedToProject(op: Operation): boolean {
    const cmd = op.command ?? ""
    // A variable or a bare glob is never provably bounded.
    if (/\$\{?\w+|%\w+%|\*\s*$|\s\/\s|\s~\s|\s~\//.test(cmd)) return false
    const root = this.resolve(this.cfg.projectRoot)
    const targets = extractPathArguments(cmd)
    if (!targets.length) return false
    return targets.every((t) => {
      const resolved = this.resolve(t)
      return isUnder(resolved, root) && !this.matchesAny(resolved, this.cfg.doNotTouch)
    })
  }

  // ── GOV-006 — bulk expansion ─────────────────────────────────────────────

  /**
   * Enumerate what a bulk command would actually touch, then compare against the
   * protected list. This is the `black .` / `rm -rf build/*` class of disaster, caught
   * at the only moment it can be caught: before execution.
   */
  async expandBulk(command: string): Promise<string[]> {
    const root = this.resolve(this.cfg.projectRoot)
    const args = extractPathArguments(command)
    const out = new Set<string>()

    for (const arg of args) {
      const resolved = this.resolve(arg)
      if (arg.includes("*") || arg.includes("?")) {
        for (const file of await walk(root, this.cfg.ignore)) {
          if (globMatch(file, this.resolve(arg)) || globMatch(path.relative(root, file).replace(/\\/g, "/"), arg)) {
            out.add(file)
          }
        }
        continue
      }
      if (existsSync(resolved)) {
        const stat = await fsp.stat(resolved).catch(() => null)
        if (stat?.isDirectory()) {
          for (const file of await walk(resolved, this.cfg.ignore)) out.add(file)
        } else {
          out.add(resolved)
        }
      }
    }
    return [...out]
  }

  /** Which of a bulk command's targets are protected. Empty means it is safe to run. */
  async bulkViolations(command: string): Promise<string[]> {
    const targets = await this.expandBulk(command)
    return targets.filter((t) => this.isProtectedWrite(t) || this.isProtectedRead(t))
  }

  static looksBulk(command: string): boolean {
    return (
      /[*?]/.test(command) ||
      /\s-[a-zA-Z]*[rR]\b/.test(command) ||
      /--recursive|\s\.\s*$|\s\.$/.test(command) ||
      /\b(?:black|prettier|ruff format|gofmt|rustfmt|eslint --fix)\b/i.test(command)
    )
  }

  // ── GOV-007, GOV-008, GOV-009 — snapshot and surgical rollback ───────────

  async snapshot(reqId: string, files: string[]): Promise<SnapshotRef> {
    const id = `SNAP-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`
    const dir = path.join(apexDir(this.cfg.projectRoot), "snapshots", reqId || "UNSCOPED", id)
    await fsp.mkdir(dir, { recursive: true })

    const refs: SnapshotFileRef[] = []
    for (const file of files) {
      const abs = this.resolve(file)
      if (!existsSync(abs)) continue
      const storedAs = crypto.createHash("sha256").update(abs).digest("hex").slice(0, 16)
      // copyFile, not a content write: a snapshot must be byte-identical, so it must
      // NOT pass through redaction.
      await fsp.copyFile(abs, path.join(dir, storedAs))
      const stat = await fsp.stat(abs)
      refs.push({ originalPath: abs, storedAs, bytes: stat.size })
    }

    // GOV-009 — record what was ALREADY dirty so rollback can leave it alone.
    const preExistingDirty = this.git && (await this.git.isRepo()) ? await this.git.statusShort() : []

    const ref: SnapshotRef = {
      id,
      reqId: reqId || "UNSCOPED",
      dir,
      files: refs,
      preExistingDirty,
      timestamp: new Date().toISOString(),
    }
    await writeManifest(path.join(dir, "manifest.json"), ref)
    event("governor.snapshot", { id, reqId, files: refs.length })
    return ref
  }

  /** GOV-008 — restore ONLY the recorded files. Everything else is left untouched. */
  async rollback(ref: SnapshotRef): Promise<RollbackReport> {
    const restored: string[] = []
    for (const file of ref.files) {
      const stored = path.join(ref.dir, file.storedAs)
      if (!existsSync(stored)) continue
      await fsp.mkdir(path.dirname(file.originalPath), { recursive: true })
      await fsp.copyFile(stored, file.originalPath)
      restored.push(file.originalPath)
    }

    // GOV-009 — prove nothing beyond the recorded set moved.
    const dirtyNow = this.git && (await this.git.isRepo()) ? await this.git.statusShort() : []
    const restoredRel = new Set(
      restored.map((p) => canonicalCase(path.relative(this.resolve(this.cfg.projectRoot), p).replace(/\\/g, "/"))),
    )
    const preExisting = new Set(ref.preExistingDirty.map((p) => canonicalCase(p)))
    const unexpected = dirtyNow.filter((p) => !restoredRel.has(canonicalCase(p)) && !preExisting.has(canonicalCase(p)))

    event("governor.rollback", { id: ref.id, restored: restored.length, unexpected: unexpected.length })
    return { restored, preserved: ref.preExistingDirty, unexpected }
  }
}

// ── helpers ─────────────────────────────────────────────────────────────────

/** Best-effort extraction of path-like arguments from a shell command. */
export function extractPathArguments(command: string): string[] {
  const withoutRedirects = command.replace(/[<>]+\s*\S+/g, " ")
  const tokens = withoutRedirects.match(/"[^"]*"|'[^']*'|\S+/g) ?? []
  const out: string[] = []
  for (let i = 1; i < tokens.length; i++) {
    const raw = tokens[i]!.replace(/^["']|["']$/g, "")
    if (!raw || raw.startsWith("-")) continue
    if (/^[;&|]+$/.test(raw)) continue
    out.push(raw)
  }
  return out
}

async function walk(root: string, ignore: string[], depth = 0): Promise<string[]> {
  if (depth > 12) return []
  const out: string[] = []
  let entries: import("node:fs").Dirent[]
  try {
    entries = await fsp.readdir(root, { withFileTypes: true, encoding: "utf8" })
  } catch {
    return out
  }
  for (const entry of entries) {
    const full = path.join(root, entry.name)
    const rel = entry.name + (entry.isDirectory() ? "/" : "")
    if (ignore.some((pattern) => globMatch(rel, pattern) || pattern.replace(/\/$/, "") === entry.name)) continue
    if (entry.isDirectory()) out.push(...(await walk(full, ignore, depth + 1)))
    else if (entry.isFile()) out.push(full)
  }
  return out
}

/** Snapshot manifests bypass redaction deliberately: they contain paths, not content. */
async function writeManifest(file: string, ref: SnapshotRef): Promise<void> {
  const handle = await fsp.open(file, "w")
  try {
    await handle.write(JSON.stringify(ref, null, 2), 0, "utf8")
  } finally {
    await handle.close()
  }
}
