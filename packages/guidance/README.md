# @enfect/guidance

The documents the Enfect agent plugins add to the model's context in every
session. [`@enfect/claude`](../../plugins/claude) and
[`@enfect/opencode`](../../plugins/opencode) copy them into their packages when
they build.

The guidance targets **Effect `4.0.6` (stable)**. See the
[4.0.0 → 4.0.6 migration audit](docs/effect-4.0.6.md) and the
[complete upstream release notes](docs/effect-4.0.6-changelog.md). The previous
[rc.116 → 4.0.0 audit](docs/effect-4.0.0.md) and
[release notes](docs/effect-4.0.0-changelog.md) remain available as history.

## Documents (4)

- [Effect-First Development](effect-first-development.md): Defines the Effect-first operating model, laws, templates, boundaries, and review checklist.
- [Agent Rules](progressive-disclosure-guidance.md): Routes agents to the right skills and authoritative Effect v4 source references.
- [Effect, and the Near-Inexpressible Majesty of Layers](post__effect-and-the-near-inexpressible-majesty-of-layers.md): Explains services, Layers, typed dependencies, and testable implementations.
- [Parse, don't validate](post__parse-dont-validate.md): Shows how refined types preserve validation knowledge and make illegal states unrepresentable.
