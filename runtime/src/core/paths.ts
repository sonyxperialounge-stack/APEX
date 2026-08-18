/*
 * APEX — ARMY V3 — Copyright (c) 2026 Lalit. All rights reserved.
 * Licensed under the APEX Personal Use License 1.0 (see the LICENSE file).
 * Not open source: personal, non-commercial use of unmodified copies only.
 * Modification, resale, commercial use, and renaming are prohibited.
 * Removing this notice or the LICENSE grants no rights whatsoever.
 */

/**
 * Cross-platform path handling (CORE-007).
 *
 * Windows is the primary target. Every path is built with path.join — never string
 * concatenation — and every path destined for JSON is normalised to forward slashes,
 * which are valid on Windows and unambiguous everywhere (INS-004).
 */

import path from "node:path"
import os from "node:os"
import fs from "node:fs"

export const IS_WINDOWS = process.platform === "win32"

/**
 * Normalise a path for embedding in JSON or config.
 *
 * A lone backslash before a letter is an invalid JSON escape. Writing `C:\Users\x`
 * into a config file makes the ENTIRE file unparseable, and the host then silently
 * loads none of it. That exact bug disabled the previous version of this system.
 */
export function toJsonPath(p: string): string {
  return p.replace(/\\/g, "/")
}

/** Resolve a possibly-relative path against a root, returning an absolute path. */
export function resolveFrom(root: string, p: string): string {
  return path.isAbsolute(p) ? path.normalize(p) : path.resolve(root, p)
}

/**
 * Fully resolve a path for comparison: absolute, normalised, symlinks followed where
 * they exist, and lower-cased on Windows.
 *
 * Symlink resolution is best-effort — a path that does not exist yet still needs a
 * stable comparison form, so we resolve the deepest existing ancestor and re-append
 * the remainder.
 */
export function realpathSafe(p: string): string {
  let current = path.normalize(p)
  const tail: string[] = []

  for (let i = 0; i < 64; i++) {
    try {
      const real = fs.realpathSync.native(current)
      const joined = tail.length ? path.join(real, ...tail.reverse()) : real
      return canonicalCase(path.normalize(joined))
    } catch {
      const parent = path.dirname(current)
      if (parent === current) break
      tail.push(path.basename(current))
      current = parent
    }
  }
  return canonicalCase(path.normalize(p))
}

/** Windows path comparison is case-insensitive; POSIX is not. */
export function canonicalCase(p: string): string {
  return IS_WINDOWS ? p.toLowerCase() : p
}

/** True when `child` is the same as, or nested inside, `parent`. */
export function isUnder(child: string, parent: string): boolean {
  const c = canonicalCase(path.normalize(child))
  const p = canonicalCase(path.normalize(parent))
  if (c === p) return true
  const rel = path.relative(p, c)
  return rel.length > 0 && !rel.startsWith("..") && !path.isAbsolute(rel)
}

/**
 * Minimal glob matcher — supports `*`, `**`, `?` and character classes.
 * Deliberately dependency-free (CORE-003).
 */
export function globMatch(target: string, pattern: string): boolean {
  const t = canonicalCase(path.normalize(target).replace(/\\/g, "/"))
  const raw = canonicalCase(pattern.replace(/\\/g, "/"))

  // A pattern ending in "/" means "this directory and everything under it".
  const p = raw.endsWith("/") ? raw + "**" : raw

  let re = ""
  for (let i = 0; i < p.length; i++) {
    const ch = p[i]!
    if (ch === "*") {
      if (p[i + 1] === "*") {
        // "**/" consumes zero or more path segments
        if (p[i + 2] === "/") {
          re += "(?:.*/)?"
          i += 2
        } else {
          re += ".*"
          i += 1
        }
      } else {
        re += "[^/]*"
      }
    } else if (ch === "?") {
      re += "[^/]"
    } else if (ch === "[") {
      const close = p.indexOf("]", i)
      if (close === -1) {
        re += "\\["
      } else {
        re += p.slice(i, close + 1)
        i = close
      }
    } else {
      re += ch.replace(/[.+^${}()|\\]/g, "\\$&")
    }
  }
  return new RegExp(`^${re}$`).test(t)
}

// ── Well-known locations ────────────────────────────────────────────────────

/** Per-project ledger root. */
export function apexDir(projectRoot: string): string {
  return path.join(projectRoot, ".apex")
}

/**
 * True when a path is a filesystem root: `/`, `C:\`, or a bare UNC share root.
 *
 * Windows-shaped roots are classified as pure strings FIRST, because a host can hand
 * over a Windows root while we run on Linux (and vice versa) — `path.resolve()` is
 * host-dependent and turns `C:\` into a relative path on posix. Only paths that are
 * not Windows roots fall through to the host's own resolver, which correctly answers
 * for `/` on posix and `C:\` on Windows.
 */
export function isFilesystemRoot(p: string): boolean {
  if (!p) return true
  const t = p.trim()
  // A drive root on any host: "C:", "C:\", "d:/"
  if (/^[A-Za-z]:[\\/]*$/.test(t)) return true
  // A bare UNC share root on any host: "//server/share" or "\\server\share"
  if (/^[\\/]{2}[^\\/]+[\\/][^\\/]+[\\/]*$/.test(t)) return true
  const resolved = path.resolve(t)
  return path.dirname(resolved) === resolved
}

/**
 * Resolve a project root supplied by a host, refusing anything that would scatter a
 * ledger somewhere destructive.
 *
 * A host can legitimately hand over an empty or placeholder value — OpenCode passed
 * `worktree: "/"` when the plugin loaded before a project was resolved, which wrote a
 * full ledger to the drive root. Trusting that value is how an agent litters a user's
 * machine, so it is validated rather than assumed.
 */
export function safeProjectRoot(candidate: string | undefined, fallback = process.cwd()): {
  root: string
  rejected: string | null
} {
  const tried = (candidate ?? "").trim()
  if (!tried || isFilesystemRoot(tried)) {
    return { root: path.resolve(fallback), rejected: tried || "(empty)" }
  }
  const resolved = path.resolve(tried)
  if (!fs.existsSync(resolved)) return { root: path.resolve(fallback), rejected: tried }
  return { root: resolved, rejected: null }
}

/** Per-user state: logs, install record. Never project data. */
export function userStateDir(): string {
  if (process.env.APEX_STATE_DIR) return process.env.APEX_STATE_DIR
  if (IS_WINDOWS) {
    const base = process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local")
    return path.join(base, "apex")
  }
  const base = process.env.XDG_STATE_HOME ?? path.join(os.homedir(), ".local", "state")
  return path.join(base, "apex")
}

/**
 * Config directory for a supported host, or null when unknown.
 *
 * `APEX_HOST_ROOT` relocates EVERY host directory under one root. It exists so tests
 * can never reach a real user configuration — a test that attaches to the machine it
 * runs on is a test that damages its own developer.
 */
export function hostConfigDir(host: string): string | null {
  const home = process.env.APEX_HOST_ROOT ?? os.homedir()
  switch (host) {
    case "opencode":
      return process.env.APEX_HOST_ROOT
        ? path.join(home, ".config", "opencode")
        : (process.env.OPENCODE_CONFIG_DIR ?? path.join(home, ".config", "opencode"))
    case "claude-code":
      return path.join(home, ".claude")
    case "cursor":
      return path.join(home, ".cursor")
    case "windsurf":
      return path.join(home, ".codeium", "windsurf")
    case "zed":
      return path.join(home, ".config", "zed")
    case "gemini-cli":
      return path.join(home, ".gemini")
    default:
      return null
  }
}

/** Walk up from `start` looking for a marker; returns the directory or null. */
export function findUp(start: string, marker: string): string | null {
  let dir = path.resolve(start)
  for (let i = 0; i < 64; i++) {
    if (fs.existsSync(path.join(dir, marker))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
  return null
}
