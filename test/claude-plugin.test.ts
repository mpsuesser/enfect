import { execFile } from "node:child_process"
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { promisify } from "node:util"
import { afterEach, describe, expect, it } from "vitest"

import {
  addedSpans,
  buildClaudeFeedback,
  postToolUseFeedback
} from "../src/claude/post-tool-use.ts"
import { buildSessionParts, CONTEXT_LIMIT, SESSION_PARTS } from "../src/claude/session-context.ts"
import { extractBody } from "../src/core/frontmatter.ts"
import { patterns, requirePattern } from "./helpers/patterns.ts"

const root = path.resolve(import.meta.dirname, "..")
const run = promisify(execFile)
const temporaryDirectories: Array<string> = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true })
    )
  )
})

const temporaryDirectory = async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "effect-enforcer-claude-"))
  temporaryDirectories.push(directory)
  return directory
}

const json = async (relative: string): Promise<Record<string, unknown>> =>
  JSON.parse(await readFile(path.join(root, relative), "utf8"))

describe("Claude Code plugin manifests", () => {
  it("keeps the plugin and package versions aligned", async () => {
    const [manifest, packageJson] = await Promise.all([
      json(".claude-plugin/plugin.json"),
      json("package.json")
    ])
    expect(manifest.version).toBe(packageJson.version)
  })

  it("publishes the repository root as the marketplace plugin", async () => {
    const [manifest, marketplace] = await Promise.all([
      json(".claude-plugin/plugin.json"),
      json(".claude-plugin/marketplace.json")
    ])
    expect(marketplace.plugins).toEqual([
      expect.objectContaining({ name: manifest.name, source: "./" })
    ])
  })

  it("ships a hook bundle that matches the current source", async () => {
    const directory = await temporaryDirectory()
    const outfile = path.join(directory, "claude-hook.mjs")
    await run("bun", [
      "build",
      "src/claude/hook.ts",
      "--target=node",
      "--format=esm",
      "--external",
      "@ast-grep/napi",
      "--outfile",
      outfile
    ], { cwd: root })
    const [fresh, committed] = await Promise.all([
      readFile(outfile, "utf8"),
      readFile(path.join(root, "dist/claude-hook.mjs"), "utf8")
    ])
    expect(committed === fresh, "dist/claude-hook.mjs is stale; run `bun run build`").toBe(true)
  }, 30_000)
})

describe("Claude Code session context", () => {
  const guidanceDirectory = path.join(root, "guidance")
  const stripHeader = (part: string) => part.replace(/^<!--[^\n]*-->\n\n/, "")
  const words = (text: string) => text.split(/\s+/).filter((word) => word.length > 0)

  it("splits the complete guidance into parts that each fit one hook output", async () => {
    const parts = await buildSessionParts(guidanceDirectory, ["notice"])
    parts.forEach((part) => {
      expect(part.length).toBeLessThanOrEqual(CONTEXT_LIMIT)
    })
    expect(parts[0]).toContain("effect-enforcer:effect-schema-v4")
    expect(parts[0]).toContain("notice")
    expect(parts[1]).toContain("# Agent Rules")

    const delivered = words(parts.slice(1).map(stripHeader).join("\n\n")).join(" ")
    const entries = (await readdir(guidanceDirectory)).filter((entry) => entry.endsWith(".md"))
    for (const entry of entries) {
      const document = extractBody(await readFile(path.join(guidanceDirectory, entry), "utf8"))
      expect(delivered, `${entry} must be delivered intact`).toContain(words(document).join(" "))
    }
  })

  it("keeps part boundaries independent of session notices", async () => {
    const [plain, noticed] = await Promise.all([
      buildSessionParts(guidanceDirectory),
      buildSessionParts(guidanceDirectory, ["notice"])
    ])
    expect(noticed.slice(1)).toEqual(plain.slice(1))
  })

  it("declares one SessionStart hook per part", async () => {
    const parts = await buildSessionParts(guidanceDirectory)
    const hooks = await json("hooks/hooks.json")
    const declared = JSON.stringify(hooks).match(/"session-start","\d+"/g) ?? []
    expect(declared).toEqual(
      Array.from({ length: SESSION_PARTS }, (_, index) => `"session-start","${index + 1}"`)
    )
    expect(
      parts.length,
      "Guidance outgrew the declared SessionStart parts; raise SESSION_PARTS and hooks.json"
    ).toBeLessThanOrEqual(SESSION_PARTS)
  })
})

describe("Claude Code post-write feedback", () => {
  it("diffs edits against the original file and checks writes in full", () => {
    const content = "const a = 1\nconst b = 2\n"
    expect(addedSpans("Write", {}, { originalFile: "const a = 1\n" }, content)).toEqual([
      { start: 0, end: content.length }
    ])
    expect(addedSpans("Edit", {}, { originalFile: "const a = 1\n" }, content)).toEqual([
      { start: 12, end: content.length }
    ])
    expect(addedSpans("Edit", {}, { originalFile: null }, content)).toEqual([
      { start: 0, end: content.length }
    ])
    expect(addedSpans("MultiEdit", { edits: [{ new_string: "b = 2" }] }, {}, content)).toEqual([
      { start: 18, end: 23 }
    ])
  })

  it("reports only violations added by an edit", async () => {
    const directory = await temporaryDirectory()
    const filePath = path.join(directory, "app.ts")
    const original = "import * as fs from 'node:fs'\nexport const value = 1\n"
    await writeFile(filePath, `${original}export const now = Date.now()\n`)
    const feedback = await postToolUseFeedback({
      tool_name: "Edit",
      cwd: directory,
      tool_input: { file_path: filePath, old_string: "", new_string: "" },
      tool_response: { originalFile: original }
    }, await patterns)
    expect(feedback).toContain("effect-enforcer review request:")
    expect(feedback).toContain("File: `app.ts`")
    expect(feedback).toContain("use-clock-service")
    expect(feedback).not.toContain("use-filesystem-service")
  })

  it("ignores unrelated tools and clean edits", async () => {
    const directory = await temporaryDirectory()
    const filePath = path.join(directory, "app.ts")
    await writeFile(filePath, "export const value = 1\n")
    const payload = { cwd: directory, tool_input: { file_path: filePath }, tool_response: {} }
    expect(await postToolUseFeedback({ ...payload, tool_name: "Read" }, await patterns))
      .toBeUndefined()
    expect(await postToolUseFeedback({ ...payload, tool_name: "Write" }, await patterns))
      .toBeUndefined()
  })

  it("defers guidance that exceeds the hook budget to pattern files", async () => {
    const matched = await Promise.all(
      ["avoid-node-imports", "prefer-effect-fn", "require-effect-concurrency", "avoid-any"].map(
        requirePattern
      )
    )
    const feedback = buildClaudeFeedback(matched, "src/app.ts", 5_000)
    expect(feedback.length).toBeLessThanOrEqual(5_000)
    expect(feedback).toContain("did not fit here")
    matched.forEach((pattern) => {
      expect(feedback).toContain(`- ${pattern.name} [`)
      expect(
        feedback.includes(`## ${pattern.name}\n`) || feedback.includes(pattern.sourcePath)
      ).toBe(true)
    })
  })
})
