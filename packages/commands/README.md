# @enfect/commands

Slash commands bundled by the Enfect agent plugins. Each Markdown file defines
one command; its filename is the command name.

```md
---
description: One line shown in the host's command list
argument-hint: '[optional-argument]'
---

Prompt sent to the model. `$ARGUMENTS` is replaced with everything the user
typed after the command name.
```

Keep the format to `description`, an optional `argument-hint`, and
`$ARGUMENTS`. Hosts disagree on positional arguments, shell interpolation, and
file references, so commands don't use them. Each plugin translates the files
for its host:

| Host        | Shipped as                                       | Invocation                         |
| ----------- | ------------------------------------------------ | ---------------------------------- |
| Claude Code | a user-invoked plugin skill                      | `/enfect:<name>`                   |
| OpenCode    | a command registered by the plugin               | `/<name>`                          |
| Pi          | a prompt template                                | `/<name>`                          |
| Codex       | a skill that the model can't invoke on its own   | `$<name>`, or pick it from `/skills` |

Codex has no plugin slash commands, so the arguments reach the model as the
text that follows the skill mention.

## Commands (1)

- [`enfect-hello-world`](enfect-hello-world.md): Greets someone to verify that
  Enfect commands are installed.
