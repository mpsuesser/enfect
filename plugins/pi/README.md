# @enfect/pi

Effect v4 guidance, skills, and advisory post-write reviews for
[Pi](https://github.com/earendil-works/pi). Tested against
`@earendil-works/pi-coding-agent` **1.4.0** on Node.js 22.19 or newer.

## Install for one repository

Run from the repository root:

```sh
pi install --local npm:@enfect/pi
pi
```

Pi records the package in `.pi/settings.json`. Review that declaration and grant
project trust when Pi asks. Project packages, extensions, skills, and templates
load only in trusted projects. For an explicitly trusted noninteractive run,
use `pi --approve --print "your request"`; approval applies to that process.
Keep Enfect out of personal settings when it should apply only to this repository.

For all repositories instead:

```sh
pi install npm:@enfect/pi
```

## Commands and skills

The shared command catalog ships unchanged as Pi prompt templates:

```text
/enfect-hello-world Ada
```

This replies `Hello, Ada!`. Command arguments use Pi's native template expansion.
The same package exposes the bundled `effect-*` skills in Pi's skill list; load
one explicitly with `/skill:effect-schema-v4`, for example. Pi lists skill
descriptions in the system prompt and reads their full instructions on demand.
Use `/reload` after updating local resources.

## Behavior

Before every user or custom-message agent run, the extension adds the **complete**
bundled guidance and Enfect policy to the `enfect` system-prompt section. The
section remains available through subsequent tool turns and is replaced on the
next run, rather than accumulating duplicate guidance.

Successful built-in `write` and `edit` calls receive model-visible review feedback
when the shared pattern catalog finds an issue. Writes check the complete final
file; edits check inserted or changed spans in the actual resulting file. Checks
are advisory and never block tools or turn a successful write into a failure.
The native `@ast-grep/napi` dependency enables AST checks. If it cannot load,
regex checks continue and AST checks are skipped.

Nested `ctx.executeTool()` calls also receive result annotations. Their findings
are additionally delivered as a hidden steering message to the outer model,
because a parent tool can discard a nested result.

Pi 1.4.0 has no universal subagent lifecycle hook or per-agent opt-out setting.
Its example subagents launch separate Pi processes: each child must load this
package, retain skills, and use a trusted project with the appropriate cwd.
Children started with `--no-extensions` or custom SDK resource loaders do not
automatically inherit the parent's extension. Configure such tools to pass
Enfect's extension and skills explicitly.

Local filesystem snapshots cannot review remote filesystem overrides or writes
through `bash` and arbitrary custom tools. Concurrent modifications of the same
file can affect attribution; separate call IDs isolate writes to different files.

## Disable

Use `pi config --local` to turn resources off for a repository. To disable all
Enfect resources explicitly, replace its package declaration in the chosen
settings scope with:

```json
{
  "packages": [
    {
      "source": "npm:@enfect/pi",
      "extensions": [],
      "skills": [],
      "prompts": []
    }
  ]
}
```

Preserve the exact source string for a version-pinned or local-path installation.
Disabling just `extensions` turns off guidance and review while retaining skills
and commands. `pi remove --local npm:@enfect/pi` removes the project declaration.

## Develop from the checkout

From the Enfect checkout, with Bun 1.4.4:

```sh
bun install
bun run --filter @enfect/pi build
bun test plugins/pi
```

Then, from a consuming repository:

```sh
pi install --local /absolute/path/to/enfect/plugins/pi
pi
```

Local packages are used in place. Pi does not install their dependencies, so run
`bun install` in Enfect first and rebuild after source/catalog changes. Rebuild
then `/reload` to refresh an existing Pi session. The monorepo root is not itself
a Pi package; install `plugins/pi` or the published npm package.

The build bundles the shared TypeScript for Node, leaves Pi host modules and
`@ast-grep/napi` external, and stages guidance, documentation, patterns, skills,
commands, and LICENSE. Edit shared catalogs under `packages/`, never their staged
copies here. Pi's host package is a `*` peer per its extension conventions; local
typing is pinned to 1.4.0, and future host compatibility needs verification.
