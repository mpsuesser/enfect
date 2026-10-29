# @enfect/claude

Effect v4 guidance, skills, and post-write pattern checks for Claude Code. Part
of [Enfect](https://github.com/mpsuesser/enfect).

## Install

For one project, add the marketplace and enable the plugin in
`.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "enfect": { "source": { "source": "github", "repo": "mpsuesser/enfect" } }
  },
  "enabledPlugins": { "enfect@enfect": true }
}
```

Or install it from the command line:

```sh
claude plugin marketplace add mpsuesser/enfect
claude plugin install enfect@enfect --scope project
```

The marketplace installs this npm package. To turn the plugin off for one
project, run `claude plugin disable enfect@enfect --scope project`.

## What it does

- **Guidance** is added in full at session start, after `/clear`, after
  compaction, and to every subagent when it starts. It is split into labeled
  parts because each hook output is limited to 10,000 characters.
- **Skills** load as plugin skills named `enfect:effect-*`.
- **Patterns** run after `Write`, `Edit`, and `MultiEdit`. Edits are checked
  only in newly added text; full writes are checked in full. When several
  patterns match, the most severe findings include their guidance inline and
  the rest point to their pattern files.

The hooks need Node.js 20 or newer, with `npm`, on `PATH`. In the first
session, the plugin installs the `@ast-grep/napi` native binding into its
Claude Code data directory. If that install fails, regex-based checks still
run, and the session context notes that AST-based checks are disabled.

## Develop locally

From the repository root, run `bun run build`, then start a session with
`claude --plugin-dir plugins/claude`.

## License

MIT
