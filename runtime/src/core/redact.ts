/*
 * APEX — ARMY V3 — Copyright (c) 2026 Lalit Sharma. All rights reserved.
 * Licensed under the APEX Personal Use License 1.0 (see the LICENSE file).
 * Not open source: personal, non-commercial use of unmodified copies only.
 * Modification, resale, commercial use, and renaming are prohibited.
 * Removing this notice or the LICENSE grants no rights whatsoever.
 */

/**
 * THE redaction chokepoint (CORE-004, CORE-005).
 *
 * Every string that reaches disk, a log, a ledger file, or an evidence block passes
 * through `redact()`. Nothing else in the package writes text directly — a source-scan
 * test enforces that.
 *
 * The patterns are deliberately broad. A false positive costs one unreadable token in a
 * log; a false negative writes a live credential into a file the user will commit.
 */

export const REDACTED = "[REDACTED]"

interface Pattern {
  name: string
  re: RegExp
  /** Replace only this capture group; the rest of the match is preserved as context. */
  group?: number
}

const PATTERNS: Pattern[] = [
  // Provider keys — prefix-shaped
  { name: "anthropic", re: /\bsk-ant-[A-Za-z0-9_\-]{8,}/g },
  { name: "openai", re: /\bsk-(?:proj-)?[A-Za-z0-9_\-]{16,}/g },
  { name: "github-pat", re: /\bgh[pousr]_[A-Za-z0-9]{16,}/g },
  { name: "github-fine", re: /\bgithub_pat_[A-Za-z0-9_]{20,}/g },
  { name: "gitlab", re: /\bglpat-[A-Za-z0-9_\-]{16,}/g },
  { name: "slack", re: /\bxox[abprs]-[A-Za-z0-9\-]{10,}/g },
  { name: "stripe", re: /\b[rs]k_(?:live|test)_[A-Za-z0-9]{16,}/g },
  { name: "google", re: /\bAIza[A-Za-z0-9_\-]{30,}/g },
  { name: "sendgrid", re: /\bSG\.[A-Za-z0-9_\-]{16,}\.[A-Za-z0-9_\-]{16,}/g },
  { name: "npm", re: /\bnpm_[A-Za-z0-9]{30,}/g },
  { name: "hf", re: /\bhf_[A-Za-z0-9]{20,}/g },
  { name: "aws-access-key", re: /\b(?:AKIA|ASIA|ABIA|ACCA)[A-Z0-9]{16}\b/g },

  // Bearer / auth headers
  { name: "bearer", re: /\b(?:Bearer|Basic|Token)\s+([A-Za-z0-9._\-+/=]{12,})/gi, group: 1 },
  { name: "authorization-header", re: /\b(authorization|x-api-key|api-key|apikey)\s*[:=]\s*["']?([^\s"',;]{8,})/gi, group: 2 },

  // JWTs
  { name: "jwt", re: /\beyJ[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}/g },

  // Private keys — whole block
  { name: "private-key", re: /-----BEGIN[ A-Z]*PRIVATE KEY-----[\s\S]*?-----END[ A-Z]*PRIVATE KEY-----/g },

  // Connection strings with inline credentials
  { name: "conn-string", re: /\b([a-z][a-z0-9+.\-]{2,}):\/\/[^\s:/@]+:([^\s@]+)@/gi, group: 2 },

  // key = value assignments where the key name implies a secret
  {
    name: "secret-assignment",
    re: /\b([A-Za-z0-9_]*(?:SECRET|PASSWORD|PASSWD|PASSPHRASE|TOKEN|APIKEY|API_KEY|ACCESS_KEY|PRIVATE_KEY|CLIENT_SECRET|CREDENTIAL)[A-Za-z0-9_]*)\s*[:=]\s*["']?([^\s"',;{}]{4,})/gi,
    group: 2,
  },
  {
    name: "secret-assignment-lower",
    re: /\b([A-Za-z0-9_]*(?:secret|password|passwd|passphrase|token|apikey|api_key|access_key|private_key|client_secret|credential)[A-Za-z0-9_]*)\s*[:=]\s*["']?([^\s"',;{}]{4,})/g,
    group: 2,
  },

  // Generic high-entropy hex/base64 blobs that follow a secret-ish word
  { name: "entropy-after-keyword", re: /\b(?:secret|token|key|password)\b\W{0,4}([A-Fa-f0-9]{32,}|[A-Za-z0-9+/]{40,}={0,2})/gi, group: 1 },
]

/**
 * Redact secrets from a string.
 *
 * Safe to call on any input, including non-strings (returns "" for null/undefined).
 * Idempotent: redacting already-redacted text is a no-op.
 */
export function redact(input: unknown): string {
  if (input === null || input === undefined) return ""
  let text = typeof input === "string" ? input : String(input)
  if (text.length === 0) return text

  for (const pattern of PATTERNS) {
    // Fresh regex each pass: the global flag carries lastIndex between calls.
    const re = new RegExp(pattern.re.source, pattern.re.flags)
    if (pattern.group === undefined) {
      text = text.replace(re, REDACTED)
    } else {
      const group = pattern.group
      text = text.replace(re, (match, ...groups) => {
        const captured = groups[group - 1]
        if (typeof captured !== "string" || captured.length === 0) return match
        if (captured === REDACTED) return match
        return match.replace(captured, REDACTED)
      })
    }
  }
  return text
}

/** True when the input still contains something that looks like a live secret. */
export function containsSecret(input: unknown): boolean {
  if (input === null || input === undefined) return false
  const text = typeof input === "string" ? input : String(input)
  return redact(text) !== text
}

/**
 * Redact recursively through a JSON-shaped value. Object keys are preserved;
 * only values are examined. Used before any structured write.
 */
export function redactDeep<T>(value: T): T {
  if (typeof value === "string") return redact(value) as unknown as T
  if (Array.isArray(value)) return value.map((v) => redactDeep(v)) as unknown as T
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = redactDeep(v)
    }
    return out as unknown as T
  }
  return value
}

/**
 * Bound a long string for storage, truncating the MIDDLE.
 *
 * The end of command output carries the failure summary — truncating it destroys the
 * evidence the whole system exists to preserve (VER-004).
 */
export function bound(text: string, max = 20_000): string {
  if (text.length <= max) return text
  const head = Math.floor(max * 0.4)
  const tail = max - head
  const omitted = text.length - max
  return (
    text.slice(0, head) +
    `\n\n… [${omitted} characters omitted from the middle — the tail is preserved] …\n\n` +
    text.slice(text.length - tail)
  )
}
