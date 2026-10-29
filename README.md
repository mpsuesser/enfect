# Enfect

**Spend less time teaching your coding agent Effect.**

Enfect keeps Effect v4 conventions in front of coding agents and in your lint
step. One repository publishes three plugins built from the same guidance,
skills, and rules:

| Package                                | For         | What it does                                                                              |
| -------------------------------------- | ----------- | ----------------------------------------------------------------------------------------- |
| [`@enfect/claude`](plugins/claude)     | Claude Code | Adds Effect guidance to every session and subagent, bundles 54 skills, and reviews writes |
| [`@enfect/opencode`](plugins/opencode) | OpenCode    | Adds Effect guidance to every model call, bundles 54 skills, and reviews writes           |
| [`@enfect/oxlint`](plugins/oxlint)     | oxlint      | 74 lint rules that flag non-idiomatic Effect code in your editor and CI                   |

The agent plugins share their content, which lives in private workspace
packages:

- [`packages/guidance`](packages/guidance): the documents added to every
  session, plus the Effect release audits
- [`packages/skills`](packages/skills): the 54 skills
- [`packages/patterns`](packages/patterns): the 45 post-write checks and their
  tests
- [`packages/core`](packages/core): the code that loads the catalogs and
  matches patterns

Everything targets **Effect `4.0.6` (stable)**.

## How the agent plugins help

**Guidance** reaches the model before it writes anything. Four documents cover
Effect-first design, schema-first modeling, typed dependencies, and choosing
the relevant skills.

**Skills** explain specific Effect APIs. The agent loads the guide it needs
across services, streams, HTTP, SQL, React, AI, and more.

**Patterns** check the code after edits. 45 tested checks look for common
mistakes in newly written code and send correction advice back to the agent
for its next turn. Checks are advisory and never block a write.

## Use all three in a project

Install the lint rules:

```sh
bun add -D oxlint @enfect/oxlint
```

`@enfect/oxlint` is also on [JSR](https://jsr.io/@enfect/oxlint).

```json
{
  "jsPlugins": ["@enfect/oxlint"]
}
```

Load the OpenCode plugin from the project's `opencode.json`:

```json
{
  "plugins": ["@enfect/opencode"]
}
```

Enable the Claude Code plugin in the project's `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "enfect": { "source": { "source": "github", "repo": "mpsuesser/enfect" } }
  },
  "enabledPlugins": { "enfect@enfect": true }
}
```

Each package's README covers its options and host-specific behavior.

## Development

```sh
bun install
bun run build   # bundle each plugin and copy in the shared catalogs
bun run check   # oxfmt, oxlint, and tsgo
bun run test    # bun test, plus Vitest for @enfect/oxlint
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the repository layout and release
process.

## License

[MIT](LICENSE)
