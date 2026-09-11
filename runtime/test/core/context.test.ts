/*


/** WP-059 — execution-context detection (54 §13: EXECUTION_CONTEXTS, CAP-T08/CAP-T09). */

import { test, describe, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import { detectExecutionContext } from "../../src/core/context.ts"
import { DEFAULT_CONFIG } from "../../src/engines/ledger.ts"
import type { ApexConfig } from "../../src/core/types.ts"

const MARKERS: string[] = [
  "CONTAINER_ID",
  "KUBERNETES_SERVICE_HOST",
  "DOCKER_CONTAINER",
  "CI",
  "GITHUB_ACTIONS",
  "GITLAB_CI",
  "JENKINS_URL",
  "BUILDKITE",
  "CIRCLECI",
  "TRAVIS",
  "TEAMCITY_VERSION",
  "BITBUCKET_BUILD_NUMBER",
  "TF_BUILD",
]

const saved = new Map<string, string | undefined>()

function cfg(isolation: "none" | "worktree" = "none"): ApexConfig {
  return { ...DEFAULT_CONFIG, delegation: { ...DEFAULT_CONFIG.delegation, isolation } }
}

beforeEach(() => {
  for (const name of MARKERS) saved.set(name, process.env[name])
  for (const name of MARKERS) delete process.env[name]
})

afterEach(() => {
  for (const name of MARKERS) {
    const value = saved.get(name)
    if (value === undefined) delete process.env[name]
    else process.env[name] = value
  }
})

describe("WP-059 — detectExecutionContext", () => {
  test("no markers and no isolation → local", () => {
    assert.equal(detectExecutionContext(cfg()), "local")
  })

  test("never returns unknown — an unclassifiable environment is still local", () => {
    const out = detectExecutionContext(cfg())
    assert.notEqual(out, "unknown")
    assert.equal(out, "local")
  })

  test("a container marker wins over CI markers and worktree isolation", () => {
    process.env.CI = "true"
    process.env.CONTAINER_ID = "abc123"
    assert.equal(detectExecutionContext(cfg("worktree")), "container")
  })

  test("any container marker alone → container", () => {
    process.env.DOCKER_CONTAINER = "1"
    assert.equal(detectExecutionContext(cfg()), "container")
    delete process.env.DOCKER_CONTAINER
    process.env.KUBERNETES_SERVICE_HOST = "10.0.0.1"
    assert.equal(detectExecutionContext(cfg()), "container")
  })

  test("worktree isolation without container/CI markers → worktree", () => {
    assert.equal(detectExecutionContext(cfg("worktree")), "worktree")
  })

  test("a CI marker without container markers or isolation → remote", () => {
    process.env.GITHUB_ACTIONS = "true"
    assert.equal(detectExecutionContext(cfg()), "remote")
  })

  test("an empty marker value is not a marker — empty env vars are indistinguishable from absent ones", () => {
    process.env.CI = ""
    assert.equal(detectExecutionContext(cfg()), "local")
  })
})