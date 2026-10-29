# Contributing to Enfect

## Prerequisites

- [Bun](https://bun.sh) 1.4.4
- Node.js 24 or newer, for the `@enfect/oxlint` tests and the Claude Code hook

## Setup

```sh
git clone https://github.com/mpsuesser/enfect.git
cd enfect
bun install
```

## Layout

```
.claude-plugin/marketplace.json   Claude Code marketplace; installs @enfect/claude from npm
packages/
  core/       private: guidance, skills, patterns, release docs, and matching code
  claude/     @enfect/claude: Claude Code plugin manifest, hooks, and hook entrypoint
  opencode/   @enfect/opencode: OpenCode V2 plugin
  oxlint/     @enfect/oxlint: oxlint rules and presets
```

Edit guidance, skills, and patterns only in `packages/core`. The Claude Code
and OpenCode builds bundle the core code and copy those catalogs into their own
package, because installed plugins can't read files outside their package.
The copies are gitignored.

## Workflow

```sh
bun run build   # bundle every plugin
bun run check   # oxfmt --check, oxlint, and tsgo
bun run fmt     # format in place
bun run test    # bun test, then Vitest for @enfect/oxlint
```

Run one package's Bun tests with `bun test packages/core`. `@enfect/oxlint`
uses Vitest on Node because oxlint's `RuleTester` refuses to run under Bun:
`bun run --filter @enfect/oxlint test`.

Run a local plugin build in a host:

- Claude Code: `claude --plugin-dir packages/claude`
- OpenCode: `"plugins": ["/path/to/enfect/packages/opencode/dist"]`

## Code Style

- Tabs, single quotes, semicolons, no trailing commas (enforced by oxfmt)
- Effect versions come from the workspace catalog in the root `package.json`
- oxlint rules are defined with the [`effect-oxlint`](https://github.com/mpsuesser/effect-oxlint) SDK

## Releases

The three published packages share one version. To release, bump `version` in
`packages/claude/package.json`, `packages/claude/.claude-plugin/plugin.json`,
`packages/opencode/package.json`, and `packages/oxlint/package.json`, then
push to `main`. The publish workflow verifies the repository and publishes
every package whose version isn't on npm yet.
