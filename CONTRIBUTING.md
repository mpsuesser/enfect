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
plugins/                          published packages, one per host
  claude/     @enfect/claude: Claude Code plugin manifest, hooks, and hook entrypoint
  opencode/   @enfect/opencode: OpenCode V2 plugin
  oxlint/     @enfect/oxlint: oxlint rules and presets (npm and JSR)
packages/                         private workspace packages shared by the agent plugins
  core/       catalog loading, pattern matching, write projection, and feedback
  guidance/   documents added to every session, plus Effect release audits in docs/
  patterns/   post-write checks, one Markdown file and one test each
  skills/     one directory per skill, each with a SKILL.md
scripts/      stage-catalogs.ts: copies the catalogs into an agent plugin's build
test/         cross-package checks: catalog READMEs, Effect release alignment, versions
```

Edit guidance, skills, and patterns only in `packages/`. The Claude Code and
OpenCode builds bundle the core code and copy the catalogs into their own
package, because installed plugins can't read files outside their package.
The copies are gitignored.

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
- OpenCode: `"plugins": ["/path/to/enfect/plugins/opencode/dist"]`

## Code Style

- Tabs, single quotes, semicolons, no trailing commas (enforced by oxfmt)
- Effect versions come from the workspace catalog in the root `package.json`
- oxlint rules are defined with the [`effect-oxlint`](https://github.com/mpsuesser/effect-oxlint) SDK

## Releases

The three published packages share one version. To release, bump `version` in
`plugins/claude/package.json`, `plugins/claude/.claude-plugin/plugin.json`,
`plugins/opencode/package.json`, `plugins/oxlint/package.json`, and
`plugins/oxlint/jsr.json`, then push to `main`. `test/release.test.ts` fails
if they drift. The publish workflow verifies the repository, publishes every
package whose version isn't on npm yet, and publishes `@enfect/oxlint` to JSR.

`plugins/oxlint/jsr.json` maps the rule sources' bare imports to npm versions,
because JSR can't read `catalog:` specifiers. Keep it in step with
`plugins/oxlint/package.json` and the root catalog; the release test checks it.
