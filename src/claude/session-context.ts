import { readdir, readFile } from "node:fs/promises"
import path from "node:path"

/** Claude Code saves hook context over 10,000 characters to a file and shows only a preview. */
export const CONTEXT_LIMIT = 9_500

/**
 * Guidance parts declared in hooks/hooks.json: one SessionStart entry and one SubagentStart
 * entry per part.
 */
export const SESSION_PARTS = 12

/** Plugin name used to namespace bundled skills in Claude Code. */
export const PLUGIN_NAME = "effect-enforcer"

/** Reference a bundled skill by its Claude Code plugin-qualified name. */
export const claudeSkill = (skill: string): string => `${PLUGIN_NAME}:${skill}`

/** Guidance routed first because it tells the model how to use everything else. */
const ROUTING_GUIDANCE = "progressive-disclosure-guidance.md"

const POLICY = [
  "## Effect Enforcer policy",
  "",
  `- Bundled Effect skills are namespaced: invoke them as \`${
    claudeSkill("<skill>")
  }\`, for example \`${claudeSkill("effect-schema-v4")}\`.`,
  "- Treat post-write pattern feedback as an immediate review request. Fix valid findings before continuing.",
  "- Pattern findings are advisory: explain intentional exceptions or false positives instead of changing correct code."
].join("\n")

const loadDocuments = async (guidanceDirectory: string): Promise<ReadonlyArray<string>> => {
  const entries = (await readdir(guidanceDirectory)).filter((entry) => entry.endsWith(".md"))
    .toSorted((left, right) =>
      Number(right === ROUTING_GUIDANCE) - Number(left === ROUTING_GUIDANCE)
      || left.localeCompare(right)
    )
  const documents = await Promise.all(
    entries.map((entry) => readFile(path.join(guidanceDirectory, entry), "utf8"))
  )
  return documents.map((content) => content.trim()).filter((content) => content.length > 0)
}

const isFenceLine = (line: string): boolean => line.trimStart().startsWith("```")

/** Split Markdown before top-level and second-level headings outside code fences. */
const sections = (document: string): ReadonlyArray<string> => {
  const result: Array<Array<string>> = [[]]
  let fenced = false
  for (const line of document.split("\n")) {
    if (isFenceLine(line)) fenced = !fenced
    if (!fenced && /^#{1,2}\s/.test(line) && (result.at(-1)?.length ?? 0) > 0) result.push([])
    result.at(-1)?.push(line)
  }
  return result.map((lines) => lines.join("\n").trim()).filter((section) => section.length > 0)
}

/** Split an oversized section at paragraph breaks, then lines, so no piece exceeds `size`. */
const pieces = (section: string, size: number): ReadonlyArray<string> => {
  if (section.length <= size) return [section]
  const pack = (units: ReadonlyArray<string>, joiner: string): Array<string> => {
    const packed: Array<string> = []
    for (const unit of units) {
      const last = packed.at(-1)
      if (last !== undefined && last.length + joiner.length + unit.length <= size) {
        packed[packed.length - 1] = `${last}${joiner}${unit}`
      } else {
        packed.push(unit)
      }
    }
    return packed
  }
  return pack(section.split("\n\n"), "\n\n").flatMap((piece) =>
    piece.length <= size ? [piece] : pack(piece.split("\n"), "\n")
  )
}

const header = (part: number, total: number): string =>
  `<!-- effect-enforcer guidance part ${part} of ${total}. The parts are separate context `
  + "blocks of one continuous document; read them in part order. -->"

/**
 * Split the policy, notices, and complete bundled guidance into labeled parts that each
 * fit one SessionStart hook output. OpenCode receives the same guidance inline.
 */
export const buildSessionParts = async (
  guidanceDirectory: string,
  notices: ReadonlyArray<string> = []
): Promise<ReadonlyArray<string>> => {
  const budget = CONTEXT_LIMIT - header(SESSION_PARTS, SESSION_PARTS).length - 2
  const units = (await loadDocuments(guidanceDirectory)).flatMap((document, index) => [
    ...(index === 0 ? [] : ["---"]),
    ...sections(document).flatMap((section) => pieces(section, budget))
  ])
  // Policy and notices form their own part so guidance boundaries never depend on notices.
  const bodies: Array<string> = [[POLICY, ...notices].join("\n\n")]
  let guidanceStart = true
  for (const unit of units) {
    const last = bodies.at(-1)
    if (!guidanceStart && last !== undefined && last.length + 2 + unit.length <= budget) {
      bodies[bodies.length - 1] = `${last}\n\n${unit}`
    } else {
      bodies.push(unit)
    }
    guidanceStart = false
  }
  return bodies.map((body, index) => `${header(index + 1, bodies.length)}\n\n${body}`)
}
