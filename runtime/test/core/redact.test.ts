import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { redact, redactDeep, containsSecret, bound, REDACTED } from "../../src/core/redact.ts"

// CORE-004 — a corpus of real secret shapes. Each must be removed.
const SECRETS: Array<[string, string]> = [
  ["anthropic", "sk-ant-api03-AAaa11BBbb22CCcc33DDdd44EEee55"],
  ["openai", "sk-proj-AAaa11BBbb22CCcc33DDdd44EEee55FFgg"],
  ["openai-classic", "sk-AAaa11BBbb22CCcc33DDdd44EEee55"],
  ["github-pat", "ghp_AAaa11BBbb22CCcc33DDdd44EEee55FF"],
  ["github-fine", "github_pat_11ABCDEFG0aBcDeFgHiJkLmNoPqRsTuVwXyZ"],
  ["gitlab", "glpat-AAaa11BBbb22CCcc33DD"],
  ["slack", "xoxb-123456789012-1234567890123-AbCdEfGhIjKlMnOp"],
  ["stripe", "sk_live_AAaa11BBbb22CCcc33DDdd44"],
  ["google", "AIzaSyA1bCdEfGhIjKlMnOpQrStUvWxYz01234567"],
  ["sendgrid", "SG.AAaa11BBbb22CCcc.DDdd44EEee55FFgg66HH"],
  ["npm-token", "npm_AAaa11BBbb22CCcc33DDdd44EEee55FFgg66"],
  ["huggingface", "hf_AAaa11BBbb22CCcc33DDdd"],
  ["aws-access-key", "AKIAIOSFODNN7EXAMPLE"],
  ["jwt", "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk"],
]

describe("redact — provider key corpus", () => {
  for (const [name, secret] of SECRETS) {
    test(`removes ${name}`, () => {
      const out = redact(`config error near ${secret} while loading`)
      assert.ok(!out.includes(secret), `${name} survived redaction: ${out}`)
      assert.ok(out.includes(REDACTED))
    })
  }
})

describe("redact — contextual shapes", () => {
  test("bearer header", () => {
    const out = redact("Authorization: Bearer abcdefghijklmnopqrstuvwxyz123456")
    assert.ok(!out.includes("abcdefghijklmnopqrstuvwxyz123456"))
  })

  test("x-api-key header", () => {
    const out = redact('x-api-key: "hunter2hunter2hunter2"')
    assert.ok(!out.includes("hunter2hunter2hunter2"))
  })

  test("connection string password", () => {
    const out = redact("postgres://appuser:s3cr3tP4ss@db.internal:5432/app")
    assert.ok(!out.includes("s3cr3tP4ss"))
    assert.ok(out.includes("appuser"), "the non-secret user should survive as context")
  })

  test("uppercase env assignment", () => {
    const out = redact('AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMIK7MDENGbPxRfiCYEXAMPLEKEY"')
    assert.ok(!out.includes("wJalrXUtnFEMIK7MDENGbPxRfiCYEXAMPLEKEY"))
  })

  test("lowercase assignment", () => {
    const out = redact("password = 'hunter2hunter2'")
    assert.ok(!out.includes("hunter2hunter2"))
  })

  test("private key block", () => {
    const pem = "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA\nabc\n-----END RSA PRIVATE KEY-----"
    const out = redact(`key material:\n${pem}\ndone`)
    assert.ok(!out.includes("MIIEowIBAAKCAQEA"))
    assert.ok(out.includes("done"))
  })

  test("entropy blob after a secret keyword", () => {
    const blob = "a".repeat(48)
    const out = redact(`token: ${blob}`)
    assert.ok(!out.includes(blob))
  })
})

describe("redact — safety properties", () => {
  test("is idempotent", () => {
    const once = redact("sk-ant-api03-AAaa11BBbb22CCcc33DDdd44")
    assert.equal(redact(once), once)
  })

  test("leaves ordinary text untouched", () => {
    const text = "Ran pytest tests/test_auth.py -> 6 passed, 0 failed in 0.42s"
    assert.equal(redact(text), text)
  })

  test("does not mangle normal code", () => {
    const code = "const total = items.reduce((a, b) => a + b.price, 0)"
    assert.equal(redact(code), code)
  })

  test("handles null and undefined", () => {
    assert.equal(redact(null), "")
    assert.equal(redact(undefined), "")
  })

  test("handles empty string", () => {
    assert.equal(redact(""), "")
  })

  test("containsSecret detects and clears correctly", () => {
    assert.equal(containsSecret("ghp_AAaa11BBbb22CCcc33DDdd44EEee55FF"), true)
    assert.equal(containsSecret("just some ordinary log output"), false)
  })
})

describe("redactDeep", () => {
  test("walks nested structures, preserving keys", () => {
    const input = {
      command: "deploy",
      env: { TOKEN: "ghp_AAaa11BBbb22CCcc33DDdd44EEee55FF", REGION: "us-east-1" },
      args: ["--key", "sk-ant-api03-AAaa11BBbb22CCcc33DD"],
      count: 3,
      ok: true,
    }
    const out = redactDeep(input)
    assert.equal(out.env.REGION, "us-east-1")
    assert.equal(out.count, 3)
    assert.equal(out.ok, true)
    assert.ok(!JSON.stringify(out).includes("ghp_AAaa11"))
    assert.ok(!JSON.stringify(out).includes("sk-ant-api03"))
    assert.ok("TOKEN" in out.env, "keys are preserved, only values are redacted")
  })
})

describe("bound — VER-004", () => {
  test("short text is unchanged", () => {
    assert.equal(bound("hello", 100), "hello")
  })

  test("truncates the MIDDLE and preserves the tail", () => {
    const text = "HEAD" + "x".repeat(5000) + "FAILURE SUMMARY AT THE END"
    const out = bound(text, 500)
    assert.ok(out.startsWith("HEAD"), "head preserved")
    assert.ok(out.endsWith("FAILURE SUMMARY AT THE END"), "tail preserved — this is the evidence")
    assert.ok(out.includes("omitted from the middle"))
    assert.ok(out.length < text.length)
  })
})
