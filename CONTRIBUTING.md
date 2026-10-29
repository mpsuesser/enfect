# Contributing to Enfect

## Prerequisites

- [Bun](https://bun.sh) 1.4.4
- Node.js 24 or newer, for the `@enfect/oxlint` tests and the Claude Code and Codex CLI hooks

## Setup

```sh
git clone https://github.com/mpsuesser/enfect.git
cd enfect
bun install
```

## Layout

```
.claude-plugin/marketplace.json   Claude Code marketplace; installs @enfect/claude from npm
.agents/plugins/marketplace.json  Codex marketplace; installs @enfect/codex from npm
.agents/commands/                 commands for agents working on this repository
plugins/                          published packages, one per host
  claude/     @enfect/claude: Claude Code plugin manifest, hooks, and hook entrypoint
  codex/      @enfect/codex: Codex plugin manifest, generated hooks, and hook entrypoint
  opencode/   @enfect/opencode: OpenCode V2 plugin
  oxlint/     @enfect/oxlint: oxlint rules and presets (npm and JSR)
  pi/         @enfect/pi: Pi extension, skills, and prompt templates
packages/                         private workspace packages shared by the agent plugins
  commands/   slash commands, one Markdown file each
  core/       catalog loading, pattern matching, write projection, and feedback
  guidance/   documents added to every session, plus Effect release audits in docs/
  patterns/   post-write checks, one Markdown file and one test each
  skills/     one directory per skill, each with a SKILL.md
scripts/      stage-catalogs.ts: copies the catalogs into an agent plugin's build
test/         cross-package checks: catalog READMEs, Effect release alignment, versions
```

Edit commands, guidance, skills, and patterns only in `packages/`. Each agent
plugin's build bundles the core code and copies the catalogs into its own
package, because installed plugins can't read files outside their package.
The copies are gitignored. The Claude Code and Codex builds also turn each
command into a skill, since that's how those hosts ship plugin commands.

## Workflow

```sh
bun run build   # bundle every plugin
bun run check   # oxfmt --check, oxlint, and tsgo
bun run fmt     # format in place
bun run test    # bun test, then Vitest for @enfect/oxlint
```

Run one directory's Bun tests with, for example, `bun test packages/patterns`. `@enfect/oxlint`
uses Vitest on Node because oxlint's `RuleTester` refuses to run under Bun:
`bun run --filter @enfect/oxlint test`.

Run a local plugin build in a host:

- Claude Code: `claude --plugin-dir plugins/claude`
- Codex CLI: follow the local development steps in
  [`plugins/codex/README.md`](plugins/codex/README.md#local-development)
- OpenCode: `"plugins": ["/path/to/enfect/plugins/opencode/dist"]`
- Pi: `pi install --local /path/to/enfect/plugins/pi`

## Code Style

- Tabs, single quotes, semicolons, no trailing commas (enforced by oxfmt)
- Effect versions come from the workspace catalog in the root `package.json`
- oxlint rules are defined with the [`effect-oxlint`](https://github.com/mpsuesser/effect-oxlint) SDK

## Releases

The published packages share one version. To release, bump `version` in
`plugins/claude/package.json`, `plugins/claude/.claude-plugin/plugin.json`,
`plugins/codex/package.json`, `plugins/codex/.codex-plugin/plugin.json`, both
version fields in `.agents/plugins/marketplace.json`,
`plugins/opencode/package.json`, `plugins/oxlint/package.json`,
`plugins/oxlint/jsr.json`, and `plugins/pi/package.json`, then push to `main`. `test/release.test.ts` fails
if they drift. The publish workflow verifies the repository, publishes every
package whose version isn't on npm yet, and publishes `@enfect/oxlint` to JSR.

`plugins/oxlint/jsr.json` maps the rule sources' bare imports to npm versions,
because JSR can't read `catalog:` specifiers. Keep it in step with
`plugins/oxlint/package.json` and the root catalog; the release test checks it.
