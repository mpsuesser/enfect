# Contributing to oxlint-plugin-effect

Thanks for your interest in contributing. This guide covers everything you need to get started.

## Prerequisites

- [Bun](https://bun.sh) 1.4.0
- Node.js 24.11 or newer in the 24.x line (used by Vite+ and Vitest 5)

## Setup

```sh
git clone https://github.com/mpsuesser/oxlint-plugin-effect.git
cd oxlint-plugin-effect
bun install
```

## Development Workflow

```sh
bun run check       # lint + format (auto-fix)
bun run test        # run all tests
bun run typecheck   # tsgo type-check only
```

Run a single test file or by name:

```sh
bunx vitest run test/Rule.test.ts
bunx vitest run -t "reports for matching"
```

## Submitting a Pull Request

1. Fork the repo and create a branch from `main`.
2. Add or update tests for any changed behavior.
3. Make sure all three checks pass:
    ```sh
    bun run check && bun run test && bun run typecheck
    ```
4. Open a pull request with a clear description of the change.

## Code Style

- Tabs, single quotes, semicolons, no trailing commas
- Rules are defined with the [`effect-oxlint`](https://github.com/mpsuesser/effect-oxlint) SDK
- JSDoc with `@since` on every export
- `readonly` on all fields and parameters

## Editor Setup

The `.vscode/` directory is gitignored. If you use VS Code, create `.vscode/settings.json` with:

```json
{
	"typescript.tsdk": "node_modules/typescript/lib",
	"typescript.enablePromptUseWorkspaceTsdk": true,
	"typescript.experimental.useTsgo": true
}
```

This enables the workspace TypeScript SDK and tsgo for native type-checking.

## Releases

Bump `package.json` and `jsr.json` together and update `CHANGELOG.md`. Pushes to
`main` run lint, format, tests, and typechecking, then publish unpublished npm
versions with provenance. Existing npm versions are skipped; registry errors
fail the workflow.

Create a GitHub release with the matching tag (for example `v0.6.0`) to publish
to JSR as well. Release and manual runs share the npm verification job, and JSR
publishing waits for it. Publishing runs are serialized to prevent duplicate
uploads from push and release events.

## Reporting Issues

Use the [GitHub issue templates](https://github.com/mpsuesser/oxlint-plugin-effect/issues/new/choose) for bug reports and feature requests.
