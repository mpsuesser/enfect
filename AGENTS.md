# Enfect

A Bun workspace that publishes Effect v4 plugins for three hosts from shared
sources. See `CONTRIBUTING.md` for the layout and commands.

## Source of truth

- `packages/guidance/`, `packages/skills/`, `packages/patterns/`: the only
  copies of the catalogs. Never edit the copies that builds place in
  `plugins/claude` or `plugins/opencode`.
- `packages/core/src/`: host-independent catalog loading, matching, write
  projection, and feedback. Host-specific behavior belongs in an adapter.
- `plugins/claude/src/hook.ts`: Claude Code hook entrypoint, bundled to
  `dist/hook.mjs`. `hooks/hooks.json` declares one SessionStart and one
  SubagentStart entry per guidance part.
- `plugins/opencode/src/index.ts`: OpenCode V2 composition root, bundled to
  `dist/index.js`.
- `plugins/oxlint/src/`: oxlint rules, one file per rule.

Keep `@ast-grep/napi` out of the plugin bundles, and load it only through
`packages/core/src/ast-grep.ts`. Installed Claude Code plugins have no
`node_modules`, so the hook installs it into the plugin data directory.

Keep the published versions equal; `test/release.test.ts` lists the manifests.

## Verification

```sh
bun run build
bun run check
bun run test
claude plugin validate plugins/claude --strict
claude plugin validate . --strict
```

Pattern changes must preserve the inventory enforced by
`packages/patterns/test/all-patterns-covered.test.ts`. Every guidance document,
skill, and pattern must stay linked from its package README.
