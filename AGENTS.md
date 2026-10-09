# opencode-effect-enforcer

This is a single-package Bun repository that serves the same Effect guidance,
skills, and patterns to two hosts. It is an OpenCode V2 plugin (the npm package
export) and a Claude Code plugin and marketplace (the repository root). It ports
the source context and pattern policy from `pi-effect-harness` without Pi's
Effect Mode or persistence architecture.

## Source Of Truth

- `skills/`: bundled OpenCode skills
- `guidance/`: privileged model guidance
- `patterns/`: pattern definitions
- `test/<pattern>.test.ts`: one-to-one detector cases
- `src/core/`: host-independent catalog loading, matching, projection, and feedback
- `src/opencode/index.ts`: OpenCode V2 composition root (the package export)
- `src/opencode/enforcer.ts`: OpenCode tool-hook adapter
- `src/claude/hook.ts`: Claude Code hook entrypoint for `session-start <part>` and `post-tool-use`
- `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`: Claude Code manifests
- `hooks/hooks.json`: Claude Code hook registrations, with one SessionStart entry per guidance part

Host-specific behavior belongs in an adapter. Never fork guidance, skills, or
patterns per host.

Do not introduce another workspace package. The one generated file is
`dist/claude-hook.mjs`. Claude Code runs it with Node from installed plugin copies,
which have no `node_modules`. Run `bun run build` after changing anything under
`src/` and commit the result. The tests fail when the bundle is stale. Keep
`@ast-grep/napi` out of the bundle, and load it only through
`src/core/ast-grep.ts`.

Keep the versions in `package.json` and `.claude-plugin/plugin.json` equal.

## Verification

```sh
bun run build
bun run check
bun run test
claude plugin validate . --strict
```

Run both before considering a change complete. Pattern changes must preserve the
bidirectional inventory enforced by `test/all-patterns-covered.test.ts`.

Every bundled skill, pattern, and guidance source must remain linked from
`README.md`; the tests enforce this catalog coverage.

## Releases

Pushes to `main` verify and publish unpublished package versions to npm with
provenance. Bump `package.json` before pushing a release; already-published
versions are skipped. Publishing is serialized across push and release events.

GitHub releases also trigger this workflow. The release tag must exactly match
the package version, such as `v0.3.0` for `"version": "0.3.0"`.
