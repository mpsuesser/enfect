# @enfect/core

Host-independent code shared by the Enfect agent plugins:

- `src/guidance.ts`: loads the guidance documents
- `src/pattern-catalog.ts`, `src/pattern.ts`, `src/frontmatter.ts`: load and
  validate pattern definitions
- `src/pattern-matcher.ts`, `src/ast-grep.ts`: match patterns against written
  code
- `src/write-projection.ts`: reconstruct the code a write or edit added, so
  checks only report new findings

The content lives in [`@enfect/guidance`](../guidance),
[`@enfect/skills`](../skills), and [`@enfect/patterns`](../patterns).
[`@enfect/claude`](../../plugins/claude) and
[`@enfect/opencode`](../../plugins/opencode) bundle this code when they build.
This package is private and never published.
