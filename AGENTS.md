# Enfect

A Bun workspace that publishes Effect v4 plugins for three hosts from shared
sources. See `CONTRIBUTING.md` for the layout and commands.

## Source of truth

- `packages/core/guidance/`, `skills/`, `patterns/`, `docs/`: the only copies.
  Never edit the copies that builds place in `packages/claude` or
  `packages/opencode`.
- `packages/core/src/`: host-independent catalog loading, matching, write
  projection, and feedback. Host-specific behavior belongs in an adapter.
- `packages/claude/src/hook.ts`: Claude Code hook entrypoint, bundled to
  `dist/hook.mjs`. `hooks/hooks.json` declares one SessionStart and one
  SubagentStart entry per guidance part.
- `packages/opencode/src/index.ts`: OpenCode V2 composition root, bundled to
  `dist/index.js`.
- `packages/oxlint/src/`: oxlint rules, one file per rule.

Keep `@ast-grep/napi` out of the plugin bundles, and load it only through
`packages/core/src/ast-grep.ts`. Installed Claude Code plugins have no
`node_modules`, so the hook installs it into the plugin data directory.

Keep the versions in the three published `package.json` files and
`packages/claude/.claude-plugin/plugin.json` equal.

## Verification

```sh
bun run build
bun run check
bun run test
claude plugin validate packages/claude --strict
claude plugin validate . --strict
```

Pattern changes must preserve the inventory enforced by
`packages/core/test/all-patterns-covered.test.ts`. Every skill, pattern, and
guidance document must stay linked from `packages/core/README.md`.
