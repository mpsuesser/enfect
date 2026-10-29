# @enfect/opencode

Effect v4 guidance, skills, and post-write pattern checks for OpenCode V2. Part
of [Enfect](https://github.com/mpsuesser/enfect).

## Install

Add the plugin to `opencode.json` in your project, or to
`~/.config/opencode/opencode.jsonc` for every project:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@enfect/opencode"]
}
```

Start a new session. OpenCode installs the package automatically. To turn it
off in a subdirectory with its own config, add `"-enfect"` to that config's
`plugins` list.

## What it does

- **Guidance** is added to the system prompt before every model call.
- **Skills** load through OpenCode's native skill tool as `effect-*`.
- **Patterns** run after `write`, `edit`, `patch`, and `apply_patch`. Edits and
  patches are checked only in newly added text; full writes are checked in
  full.

To opt one agent out, set `"enfect": false` in that agent's configuration. The
agent gets no guidance or pattern feedback, and the bundled skills are denied
to it.

## Develop locally

From the repository root, run `bun run build`, then point a config at the
built bundle: `"plugins": ["/path/to/enfect/packages/opencode/dist"]`.

## License

MIT
