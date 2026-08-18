/*
 * APEX — ARMY V3 — Copyright (c) 2026 Lalit. All rights reserved.
 * Licensed under the APEX Personal Use License 1.0 (see the LICENSE file).
 * Not open source: personal, non-commercial use of unmodified copies only.
 * Modification, resale, commercial use, and renaming are prohibited.
 * Removing this notice or the LICENSE grants no rights whatsoever.
 */

/**
 * Rotating, redacted logging (CORE-008).
 *
 * Two sinks: a human-readable rotating log, and a structured JSONL event stream.
 * Both redact. Nothing here ever writes to stdout — the MCP server owns stdout, and
 * a stray write there corrupts the protocol stream (MCP-001).
 */

import fs from "node:fs"
import path from "node:path"
import { redact } from "./redact.ts"
import { userStateDir } from "./paths.ts"

export type LogLevel = "debug" | "info" | "warn" | "error"

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 }
const MAX_BYTES = 2 * 1024 * 1024
const KEEP_ROTATIONS = 3

let minLevel: LogLevel = (process.env.APEX_LOG_LEVEL as LogLevel) || "info"
let logDir: string | null = null

export function setLogLevel(level: LogLevel): void {
  minLevel = level
}

/** Override the log directory. Used by tests to keep the user's state clean. */
export function setLogDir(dir: string | null): void {
  logDir = dir
}

function resolveDir(): string {
  return logDir ?? path.join(userStateDir(), "logs")
}

function rotateIfNeeded(file: string): void {
  try {
    const stat = fs.statSync(file)
    if (stat.size < MAX_BYTES) return
    for (let i = KEEP_ROTATIONS - 1; i >= 1; i--) {
      const from = `${file}.${i}`
      const to = `${file}.${i + 1}`
      if (fs.existsSync(from)) fs.renameSync(from, to)
    }
    fs.renameSync(file, `${file}.1`)
  } catch {
    // Absent file, or a race with another process — nothing to rotate.
  }
}

function appendSafe(file: string, line: string): void {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    rotateIfNeeded(file)
    fs.appendFileSync(file, line, "utf8")
  } catch {
    // Logging must never break the caller. Silence is correct here.
  }
}

function write(level: LogLevel, message: string, fields?: Record<string, unknown>): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return
  const stamp = new Date().toISOString()
  const extra = fields && Object.keys(fields).length ? " " + redact(JSON.stringify(fields)) : ""
  appendSafe(path.join(resolveDir(), "apex.log"), `${stamp} ${level.toUpperCase()} ${redact(message)}${extra}\n`)
}

export const log = {
  debug: (m: string, f?: Record<string, unknown>) => write("debug", m, f),
  info: (m: string, f?: Record<string, unknown>) => write("info", m, f),
  warn: (m: string, f?: Record<string, unknown>) => write("warn", m, f),
  error: (m: string, f?: Record<string, unknown>) => write("error", m, f),
}

/** Append one structured event. Exactly one valid JSON object per line. */
export function event(type: string, fields: Record<string, unknown> = {}): void {
  const record = { ts: new Date().toISOString(), type, ...fields }
  let line: string
  try {
    line = redact(JSON.stringify(record))
    JSON.parse(line) // never emit a line that is not valid JSON
  } catch {
    line = JSON.stringify({ ts: record.ts, type, error: "unserialisable event" })
  }
  appendSafe(path.join(resolveDir(), "events.jsonl"), line + "\n")
}

/** Human-facing output. Always stderr, so stdout stays clean for the protocol. */
export function say(message: string): void {
  process.stderr.write(message + "\n")
}
