# @enfect/codex

Effect v4 guidance, skills, and advisory post-write reviews for **Codex CLI
0.165.0**. The npm package is `@enfect/codex`; its Codex plugin name is `enfect`.

Enfect injects the complete shared guidance into `SessionStart` and
`SubagentStart`, and reviews code added by successful `apply_patch` calls. Valid
findings should be fixed before continuing; intentional exceptions can be
explained. Reviews are advisory and never block edits.

## Enable only in one project

For a project such as CurationSpace, add this exact file at
`.agents/plugins/marketplace.json` (merge the entry if a catalog already exists):

```json
{
  "name": "enfect",
  "interface": { "displayName": "Enfect" },
  "plugins": [
    {
      "name": "enfect",
      "version": "0.9.0",
      "description": "Effect v4 coding guidance and advisory pattern checks",
      "source": {
        "source": "npm",
        "package": "@enfect/codex",
        "version": "0.9.0",
        "registry": "https://registry.npmjs.org"
      },
      "policy": {
        "installation": "AVAILABLE",
        "authentication": "ON_INSTALL"
      },
      "category": "Developer Tools"
    }
  ]
}
```

The npm release must be published before this installation can succeed. Add
`.codex/config.toml` to the same project:

```toml
[plugins."enfect@enfect"]
enabled = true
```

Trust the project so its config is loaded. Materialize the package once before
starting the session. From the project root:

```sh
codex plugin marketplace add "$PWD"
codex plugin add enfect@enfect
```

The first command registers this project's marketplace. The second downloads
the npm package and also writes user-level enablement. **To keep activation
project-only**, immediately set this in `$CODEX_HOME/config.toml` (normally
`~/.codex/config.toml`), merging with existing settings:

```toml
[plugins."enfect@enfect"]
enabled = false
```

Keep `enabled = true` in the project's `.codex/config.toml`. The trusted project
setting overrides that user default. Codex CLI 0.165.0 has no `--scope project`
flag. In live `codex exec` testing, project files alone did not materialize a
fresh local plugin; explicit installation followed by user-default `false`
reliably activated it only in the target project. Installation files and runtime
dependencies remain shared in Codex's cache.

Start Codex from the project, inspect `/plugins`, then open `/hooks` and
review/trust Enfect's hook commands. Start a fresh session after trusting the
hooks to receive startup guidance. Plugin enablement and executable-hook trust
are separate decisions; changed plugin contents require renewed hook trust.
Set the project value to `false` to disable Enfect there.

## Skills and commands

Mention an Effect skill as `$enfect:effect-schema-v4`, or select it in `/skills`.
Every shared command is built as a manual skill with
`policy.allow_implicit_invocation: false`. For the installation probe, send:

```text
$enfect:enfect-hello-world Ada
```

The expected response is `Hello, Ada!`. Command arguments are the text following
the skill mention in your message. Codex interprets that text through the skill
instructions; it does not perform deterministic `$ARGUMENTS` substitution or
register plugin slash commands.

## Runtime requirements

On macOS/Linux, **Node.js 24 or newer must be on the PATH inherited by Codex**.
If Node is missing, the shell handler exits successfully without output. Runtime
errors also exit 0 silently so Enfect cannot break a session. This package does
not currently provide Windows hook commands.

The first session lazily installs `@ast-grep/napi` with `npm` into Codex's
writable `PLUGIN_DATA` directory if the native binding is unavailable. Keep npm
on PATH and allow registry access for this bootstrap. Installation output is
captured, never emitted as hook JSON. Failed bootstrap leaves regex checks
available and adds an availability notice to the startup policy. Nothing is
installed into the trusted plugin bundle. The shared native loader uses Codex's
`CLAUDE_PLUGIN_DATA` compatibility variable, set from `PLUGIN_DATA` by this
adapter. Subagent handlers do not race to install dependencies.

Guidance is divided into labeled outputs below 9,500 UTF-8 bytes each, including
the policy. Codex 0.165.0 estimates one token per four bytes and defaults to a
2,500-token per-output spill limit. Each part has its own hook entry; the build
regenerates the entries for the complete catalog. Dependency notices occupy the
policy part and do not shift document boundaries.

Post-write review reads final files and locates explicit added lines using patch
context anchors, ordered hunks, and EOF markers. It supports additions, updates,
deletions and moves in multi-file patches. Retained context is excluded. With no
pre-edit snapshot, identical repeated hunk contexts can remain ambiguous; the
adapter selects the first ordered match. Unlocatable hunks are skipped. Shell
writes and other tools are outside the `apply_patch` hook's scope. Ordinary fresh
Codex subagents receive guidance; internal/system workers may skip start hooks.

## Local development

From the Enfect checkout, using Bun 1.4.4:

```sh
bun install
bun run --cwd plugins/codex build
bun test plugins/codex
```

To enable the checkout only in Enfect itself, add this local catalog at the
checkout's `.agents/plugins/marketplace.json` and use the project config and
one-time installation steps above:

```json
{
  "name": "enfect",
  "plugins": [
    {
      "name": "enfect",
      "source": { "source": "local", "path": "./plugins/codex" }
    }
  ]
}
```

Paths are relative to the marketplace root (the checkout), rather than the
`.agents/plugins` directory. Local sources must remain inside that root. For
another project, copy the built package into that project, for example at
`vendor/enfect-codex`, and use `"path": "./vendor/enfect-codex"`. Rebuild and
refresh/restart Codex after changes; re-review changed hooks through `/hooks`.
For fully isolated testing, use a temporary `CODEX_HOME` rather than editing
personal plugin state. The `--dangerously-bypass-hook-trust` flag is intended
only for a scratch automation run that has already vetted the hooks.

The build bundles the TypeScript entrypoint into `dist/hook.mjs`, leaving
`@ast-grep/napi` external, then stages guidance, docs, patterns, skills, commands,
and LICENSE from the shared packages. It generates command skills after staging
and fails on a collision with an Effect skill. Edit shared catalogs in
`packages/`, not the generated copies here.

Plugin packaging reference: [official OpenAI documentation](https://developers.openai.com/plugins/build/plugins).
Version-specific behavior is checked against the `rust-v0.165.0` Codex source.
