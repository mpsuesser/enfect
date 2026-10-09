import { readFile } from "node:fs/promises"

import { bySeverity, feedbackPreamble, guidanceWithSkillHints } from "../core/guidance.ts"
import { matchesPattern } from "../core/pattern-matcher.ts"
import type { Pattern, Span } from "../core/pattern.ts"
import { changedSpans, relativeToolPath, resolveToolPath } from "../core/write-projection.ts"
import { claudeSkill, CONTEXT_LIMIT, PLUGIN_NAME } from "./session-context.ts"

/** File-mutating Claude Code tools whose results are checked. */
export const CHECKED_TOOLS: ReadonlySet<string> = new Set(["Write", "Edit", "MultiEdit"])

const property = (value: unknown, key: string): unknown =>
  typeof value === "object" && value !== null ? Reflect.get(value, key) : undefined

const stringProperty = (value: unknown, key: string): string | undefined => {
  const current = property(value, key)
  return typeof current === "string" ? current : undefined
}

const insertedStrings = (toolInput: unknown): ReadonlyArray<string> => {
  const edits = property(toolInput, "edits")
  const candidates = Array.isArray(edits)
    ? edits.map((edit) => stringProperty(edit, "new_string"))
    : [stringProperty(toolInput, "new_string")]
  return candidates.filter((value): value is string => value !== undefined && value.length > 0)
}

const occurrences = (content: string, inserted: ReadonlyArray<string>): ReadonlyArray<Span> =>
  inserted.flatMap((text) => {
    const spans: Array<Span> = []
    let index = content.indexOf(text)
    while (index !== -1) {
      spans.push({ start: index, end: index + text.length })
      index = content.indexOf(text, index + text.length)
    }
    return spans
  })

/**
 * Determine which text a completed tool call added. Writes are checked in full, as in
 * OpenCode; edits diff against `tool_response.originalFile`, falling back to the
 * inserted strings when a Claude Code version omits it.
 */
export const addedSpans = (
  toolName: string,
  toolInput: unknown,
  toolResponse: unknown,
  content: string
): ReadonlyArray<Span> => {
  const fullFile = [{ start: 0, end: content.length }]
  if (toolName === "Write") return fullFile
  const original = property(toolResponse, "originalFile")
  if (typeof original === "string") return changedSpans(original, content)
  if (original === null) return fullFile
  return occurrences(content, insertedStrings(toolInput))
}

/** Fit severity-ordered feedback into Claude Code's hook context budget. */
export const buildClaudeFeedback = (
  patterns: ReadonlyArray<Pattern.Value>,
  filePath: string,
  limit: number = CONTEXT_LIMIT
): string => {
  const selected = bySeverity(patterns)
  const head = [
    ...feedbackPreamble(PLUGIN_NAME, filePath),
    "Matched patterns:",
    ...selected.map((pattern) => `- ${pattern.name} [${pattern.level}]: ${pattern.description}`),
    "",
    "Relevant guidance:"
  ].join("\n")
  const deferredNote = (deferred: ReadonlyArray<Pattern.Value>) =>
    [
      "",
      "Guidance for these patterns did not fit here. Read each file before revising:",
      ...deferred.map((pattern) => `- ${pattern.name}: \`${pattern.sourcePath}\``)
    ].join("\n")
  const sections: Array<string> = []
  const deferred: Array<Pattern.Value> = []
  let length = head.length + deferredNote(selected).length
  for (const pattern of selected) {
    const section = `## ${pattern.name}\n${guidanceWithSkillHints(pattern, claudeSkill)}`
    if (deferred.length === 0 && length + section.length + 1 <= limit) {
      sections.push(section)
      length += section.length + 1
    } else {
      deferred.push(pattern)
    }
  }
  return [head, ...sections, ...(deferred.length === 0 ? [] : [deferredNote(deferred)])].join(
    "\n"
  )
}

/** Return review feedback for a PostToolUse payload, or `undefined` when nothing matched. */
export const postToolUseFeedback = async (
  payload: unknown,
  patterns: ReadonlyArray<Pattern.Value>
): Promise<string | undefined> => {
  const toolName = stringProperty(payload, "tool_name")
  if (toolName === undefined || !CHECKED_TOOLS.has(toolName)) return undefined
  const toolInput = property(payload, "tool_input")
  const toolResponse = property(payload, "tool_response")
  const target = stringProperty(toolInput, "file_path") ?? stringProperty(toolResponse, "filePath")
  if (target === undefined) return undefined
  const directory = process.env.CLAUDE_PROJECT_DIR ?? stringProperty(payload, "cwd")
    ?? process.cwd()
  let content: string
  try {
    content = await readFile(resolveToolPath(directory, target), "utf8")
  } catch {
    return undefined
  }
  const spans = addedSpans(toolName, toolInput, toolResponse, content)
  if (spans.length === 0) return undefined
  const filePath = relativeToolPath(directory, target)
  const input = { filePath, content, changedSpans: spans }
  const matched = patterns.filter((pattern) => matchesPattern("edit", input, "after", pattern))
  return matched.length === 0 ? undefined : buildClaudeFeedback(matched, filePath)
}
