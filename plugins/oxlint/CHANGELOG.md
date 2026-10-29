# Changelog

## 0.9.0

### Changed

- Target Effect 4.1.0. The plugin now depends on `effect@4.1.0`.
- Rule messages point to `FileSystem` and `Path` from `effect`, `SecureRandom`
  and `Digest` from `effect/crypto`, and `ChildProcessSpawner` from
  `effect/process`, replacing references to `effect/Crypto` and
  `@effect/platform`.
- Published to JSR again, as [`@enfect/oxlint`](https://jsr.io/@enfect/oxlint).

## 0.8.0

Renamed from `@mpsuesser/oxlint-plugin-effect` and moved into the
[Enfect](https://github.com/mpsuesser/enfect) monorepo. Publishing to JSR has
stopped; install from npm.

### Changed

- Target Effect 4.0.6. The plugin now depends on `effect@4.0.6`.
- Build with `bun build` and `tsgo`. The package now ships only `dist/`.

### Added

- `no-cause-in-http-response`: flag `Cause.pretty`/`Cause.squash`, or a caught `catch`/`catchAll`/`catchCause`/`catchAllCause` cause/error binding (directly, via `.message`, `String(...)`, or template interpolation), flowing into an HTTP response body built with `HttpServerResponse.text`/`json`/`html`/`raw`/`unsafeJson` or `new Response(...)`. Motivated by a real bug where a BetterAuth failure handler rendered `Cause.pretty(cause)` straight into a 500 response body. Server-side logging such as `Effect.logError(Cause.pretty(cause))` is untouched. Both generated presets now enable all 74 rules.

## 0.6.0 - Stable Effect 4.0.0

### Changed

- Target stable `effect@4.0.0` and align `@effect/vitest` to 4.0.0. Upgrade the compatible test stack to Vitest 5 / Vite+ 1.0, the rule SDK to `effect-oxlint@0.4.0`, and oxlint to 1.85.
- Remove the unused `effect-oxlint@0.1.0` patch; the published SDK already uses `Context.Service` and needs no patch.
- Update diagnostics and README examples to `Schema.TaggedError`, `Schema.decodeUnknownEffect` / `encodeEffect`, PascalCase Config constructors, stable area import paths, `ChildProcessSpawner`, and current collection / random APIs.
- Publish unpublished npm versions automatically on main pushes, with verification and provenance. Serialize publishing, validate npm/JSR version agreement and release tags, and retain release-triggered JSR publication.

### Fixed

- Detect `Config.String` and `Config.NonEmptyString` secrets as well as legacy lowercase spellings. Recommend a redacted schema for non-empty secrets so validation is retained.
- Avoid requiring schema type aliases for current schema checks, filters, equivalences, and formatters.
- Preserve local aliases in barrel-import diagnostics and direct `pipe`, `flow`, and other function exports to `effect/Function` instead of nonexistent submodules.
- Clarify defects versus typed failures, platform boundary placement, and import-style policy; remove obsolete API recommendations.

### Verification

- Retain all 73 rules and both generated presets. Add rule regressions and compile marked README examples and Effect imports against the installed stable release.
- Pass all 789 tests across 75 files, lint, formatting, typechecking, and the build with the published `effect-oxlint@0.4.0`. Verify updated Config, schema-check, and import diagnostics through the built plugin in the real oxlint CLI.
- Audit the rule API references against the installed 4.0.0 source and the stable migration findings from `opencode-effect-enforcer@0.3.0`. Lifecycle, partition-order, and transport changes require no runtime migration in this AST-only plugin.

## 0.5.0 - Anti-slop rules

### Added

- Ported all 15 generic anti-slop rules plus `no-service-constructor-imports` from `dmmulroy/anti-slop` at `e8c4880471b23ab7f216fba7b27d173a6ef07d4c` into the `effect/` namespace using `effect-oxlint` rule/visitor APIs and Schema-decoded options.
- Both generated presets now enable all 73 rules. Existing anti-slop severity and option settings can be retained by replacing their namespace prefix with `effect/`.
- Retained all 298 upstream parser/scope regression cases and added SDK integration and value-flow/option regressions.
- Included the upstream MIT license in npm and JSR packages and documented migration, options, analysis boundaries, and overlapping policies.
- Added `bun run lint` as a standalone lint command.

## 0.4.3 - README generator formatting

### Fixed

- Corrected all README examples to use the canonical `yield*` operator formatting and fixed the formatter exclusion that had rewritten them.

## 0.4.2 - Remove stream-large-files

### Changed

- Removed the `stream-large-files` rule from the plugin and recommended configuration.

## 0.4.1 - Schema predicate detection

### Fixed

- Excluded predicates created with `Schema.is(...)` from `require-schema-type-alias`; these values are type guards rather than schemas and do not need matching type aliases.

## 0.4.0 - Effect beta.100 compatibility

### Changed

- Updated Effect tooling to `effect@4.0.0-beta.100`, `effect-oxlint@0.3.3`, and current supporting tool versions.
- Removed `prefer-schema-class`; `Schema.Struct` remains appropriate for named structural schemas.
- Updated `throw-in-effect-gen` to allow throws captured by direct `Effect.try` and `Effect.tryPromise` thunks.
- Aligned rule diagnostics and recognized API names with Effect beta.100, including `Schema.isSchemaError` and the current timeout APIs.

### Fixed

- Corrected documentation to reference `Effect.validate` and the current total of 58 rules.
- Synchronized the npm and JSR package versions.

## 0.3.0 — Rule migration from Foldkit

### Added

- Added five Effect-generic rules moved from `@mpsuesser/oxlint-plugin-foldkit`: `prefer-array-fromoption-over-option-match-empty`, `no-length-comparison`, `no-effect-ignore-then-as`, `require-is-prefix-for-boolean-schema-field`, and `maybe-prefix-requires-option`.

## 0.2.3 — Effect 4.0.0-beta.78

### Changed

- Updated `effect` (and `@effect/vitest`) to `4.0.0-beta.78` and `effect-oxlint` to `^0.3.2`.
- Switched the npm publish workflow to OIDC trusted publishing (no `NPM_TOKEN`): Node 24 plus `npm@latest` for npm >= 11.5.1.

## 0.2.2 — JSR default export docs

### Fixed

- Attached JSR symbol documentation to the exported plugin value so the generated docs no longer show the default export as undocumented.

## 0.2.1 — JSR score improvements

### Changed

- Removed JSR slow-type diagnostics by giving each rule module an explicit `CreateRule` export boundary.
- Documented the default plugin export for generated JSR symbol docs.
- Updated the JSR publish workflow to pass fast-check and rely on GitHub Actions provenance without `--allow-slow-types`.

## 0.2.0 — Generated config presets

### Changed

- Published package exports now point at built `dist/` files instead of raw TypeScript source, so oxlint can load the plugin from `node_modules` without Node type-stripping failures.
- Added a generated `configs.recommended` config for `oxlint.config.ts`; importing the plugin and extending this config now registers the JS plugin and enables all 54 rules at `error` severity.
- Replaced the old native-plugin-style `plugins` / `categories.recommended` documentation with oxlint JS plugin configuration using `jsPlugins` and explicit rule IDs.
- Updated to `effect-oxlint@0.3.0`, Effect `4.0.0-beta.70`, Bun `1.3.14`, and current supporting tool versions.

## 0.1.0 — Initial Release

Opinionated oxlint plugin enforcing Effect-first development conventions.

54 rules covering statement bans, import bans, member expression bans, call expression rules, type-level rules, complex contextual rules, and pattern enforcement rules. All rules ship in the generated `configs.recommended` config for `oxlint.config.ts`.

See the [README](./README.md) for the full rule list with examples.
