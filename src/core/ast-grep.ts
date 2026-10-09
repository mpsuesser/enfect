import type * as AstGrep from "@ast-grep/napi"
import { createRequire } from "node:module"
import path from "node:path"

let cached: typeof AstGrep | undefined

// Native addon boundary: the Claude Code hook bundle cannot inline ast-grep, and
// installed plugin copies omit node_modules, so search the plugin data directory too.
const searchRoots = (): ReadonlyArray<string> => [
  import.meta.url,
  ...(process.env.CLAUDE_PLUGIN_DATA === undefined
    ? []
    : [path.join(process.env.CLAUDE_PLUGIN_DATA, "package.json")])
]

/** Load the ast-grep native binding once, or `undefined` when it is unavailable. */
export const loadAstGrep = (): typeof AstGrep | undefined => {
  if (cached !== undefined) return cached
  for (const root of searchRoots()) {
    try {
      cached = createRequire(root)("@ast-grep/napi") as typeof AstGrep
      return cached
    } catch {
      // Try the next root.
    }
  }
  return undefined
}
