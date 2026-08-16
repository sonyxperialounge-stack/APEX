import { test, describe } from "node:test"
import assert from "node:assert/strict"
import path from "node:path"
import { isUnder, globMatch, toJsonPath, canonicalCase, resolveFrom, isFilesystemRoot, safeProjectRoot, IS_WINDOWS } from "../../src/core/paths.ts"

describe("isUnder", () => {
  const root = path.resolve("/project")

  test("identity", () => {
    assert.equal(isUnder(root, root), true)
  })

  test("direct child", () => {
    assert.equal(isUnder(path.join(root, "src"), root), true)
  })

  test("deep child", () => {
    assert.equal(isUnder(path.join(root, "src", "a", "b.ts"), root), true)
  })

  test("sibling is not under", () => {
    assert.equal(isUnder(path.resolve("/other"), root), false)
  })

  test("parent is not under child", () => {
    assert.equal(isUnder(root, path.join(root, "src")), false)
  })

  test("traversal that escapes is not under", () => {
    assert.equal(isUnder(path.join(root, "..", "elsewhere"), root), false)
  })

  test("traversal that returns IS under", () => {
    assert.equal(isUnder(path.join(root, "src", "..", "config"), root), true)
  })

  test("a prefix-sharing sibling directory is not under", () => {
    assert.equal(isUnder(path.resolve("/project-two/x"), root), false)
  })
})

describe("globMatch", () => {
  const cases: Array<[string, string, boolean]> = [
    ["config/prod.yaml", "config/prod.yaml", true],
    ["config/prod.yaml", "config/*.yaml", true],
    ["config/prod.yaml", "config/", true],
    ["config/deep/prod.yaml", "config/", true],
    ["config/deep/prod.yaml", "config/*.yaml", false],
    ["config/deep/prod.yaml", "config/**/*.yaml", true],
    ["src/a.ts", "**/*.ts", true],
    ["a.ts", "**/*.ts", true],
    ["migrations/001.sql", "migrations/", true],
    ["src/app.ts", "migrations/", false],
    ["file.txt", "file.???", true],
    ["file.txtx", "file.???", false],
    ["node_modules/x/y.js", "node_modules/", true],
    ["src/node_modules_helper.ts", "node_modules/", false],
  ]

  for (const [target, pattern, expected] of cases) {
    test(`${target} vs ${pattern} -> ${expected}`, () => {
      assert.equal(globMatch(target, pattern), expected)
    })
  }

  test("backslash separators are normalised", () => {
    assert.equal(globMatch("config\\prod.yaml", "config/*.yaml"), true)
  })

  test("dots in the pattern are literal, not wildcards", () => {
    assert.equal(globMatch("configXprod.yaml", "config.prod.yaml"), false)
  })
})

describe("toJsonPath", () => {
  test("converts every backslash", () => {
    assert.equal(toJsonPath("C:\\a\\b\\c.exe"), "C:/a/b/c.exe")
  })

  test("leaves forward slashes alone", () => {
    assert.equal(toJsonPath("/usr/local/bin"), "/usr/local/bin")
  })

  test("handles UNC prefixes", () => {
    assert.equal(toJsonPath("\\\\srv\\share"), "//srv/share")
  })
})

describe("canonicalCase", () => {
  test("matches the platform convention", () => {
    const out = canonicalCase("/A/B")
    assert.equal(out, IS_WINDOWS ? "/a/b" : "/A/B")
  })
})

describe("resolveFrom", () => {
  test("keeps an absolute path absolute", () => {
    const abs = path.resolve("/abs/x")
    assert.equal(resolveFrom(path.resolve("/root"), abs), path.normalize(abs))
  })

  test("resolves a relative path against the root", () => {
    const root = path.resolve("/root")
    assert.equal(resolveFrom(root, "src/a.ts"), path.join(root, "src", "a.ts"))
  })
})

// ── the C:\.apex incident ───────────────────────────────────────────────────
//
// OpenCode called the plugin with `worktree: "/"` before a project was resolved. The
// plugin trusted it and wrote a full ledger to the drive root. These tests exist so a
// host handing over a bad path can never do that again.

describe("isFilesystemRoot", () => {
  const ROOTS = ["/", "C:/", "C:\\", "c:\\", "//server/share", "\\\\server\\share"]
  for (const p of ROOTS) {
    test(`recognises ${JSON.stringify(p)} as a root`, () => {
      assert.equal(isFilesystemRoot(p), true)
    })
  }

  test("an empty path is treated as a root", () => {
    assert.equal(isFilesystemRoot(""), true)
  })

  const NOT_ROOTS = ["/home/user/project", "C:/work/app", "./relative"]
  for (const p of NOT_ROOTS) {
    test(`${p} is not a root`, () => {
      assert.equal(isFilesystemRoot(p), false)
    })
  }
})

describe("safeProjectRoot", () => {
  test('rejects "/" and falls back', () => {
    const result = safeProjectRoot("/", process.cwd())
    assert.equal(result.rejected, "/")
    assert.equal(result.root, path.resolve(process.cwd()))
  })

  test("rejects an empty value", () => {
    assert.equal(safeProjectRoot("", process.cwd()).rejected, "(empty)")
    assert.equal(safeProjectRoot(undefined, process.cwd()).rejected, "(empty)")
  })

  test("rejects a path that does not exist", () => {
    assert.equal(safeProjectRoot(path.join(process.cwd(), "definitely-not-here-xyz")).rejected !== null, true)
  })

  test("accepts a real directory unchanged", () => {
    const result = safeProjectRoot(process.cwd())
    assert.equal(result.rejected, null)
    assert.equal(result.root, path.resolve(process.cwd()))
  })

  test("a drive root never survives, whatever the separator", () => {
    for (const root of ["C:/", "C:\\", "/"]) {
      assert.notEqual(safeProjectRoot(root, process.cwd()).root, path.resolve(root))
    }
  })
})
