# @enfect/patterns

Post-write checks run by the Enfect agent plugins. Each Markdown file defines one
pattern: frontmatter with its file glob, detector (ast-grep or regex), and level,
followed by the correction advice sent back to the agent. Checks are advisory
and never block a write.

Every pattern has a test in [`test/`](test). Run them with
`bun test packages/patterns`.

## Patterns (45)

### Types, modeling, and collections

- [`avoid-any`](avoid-any.md): Flags assertions to `any` or `unknown` that erase type safety.
- [`casting-awareness`](casting-awareness.md): Reviews type assertions and suggests decoding, guards, or `satisfies`.
- [`avoid-ts-ignore`](avoid-ts-ignore.md): Detects `@ts-ignore` and `@ts-expect-error` suppressions.
- [`avoid-non-null-assertion`](avoid-non-null-assertion.md): Detects TypeScript non-null assertions.
- [`avoid-object-type`](avoid-object-type.md): Rejects imprecise `Object` and `{}` type annotations.
- [`prefer-option-over-null`](prefer-option-over-null.md): Reviews nullable unions that may be better represented by `Option`.
- [`avoid-option-getorthrow`](avoid-option-getorthrow.md): Replaces unsafe `Option.getOrThrow` calls with explicit handling.
- [`avoid-schema-suffix`](avoid-schema-suffix.md): Encourages schema constants named after their domain concepts.
- [`prefer-schema-class`](prefer-schema-class.md): Reviews `Schema.Struct` where decoded values need class identity.
- [`avoid-direct-json`](avoid-direct-json.md): Reviews direct JSON methods in favor of schema JSON codecs.
- [`prefer-match-over-switch`](prefer-match-over-switch.md): Replaces native `switch` statements with exhaustive Effect matching.
- [`avoid-direct-tag-checks`](avoid-direct-tag-checks.md): Replaces direct `_tag` comparisons with exported refinements or predicates.
- [`imperative-loops`](imperative-loops.md): Replaces imperative loops with functional collection transformations.
- [`prefer-arr-sort`](prefer-arr-sort.md): Replaces native array sorting with `Arr.sort` and explicit `Order`.

### Errors and Effect boundaries

- [`avoid-data-tagged-error`](avoid-data-tagged-error.md): Reviews public or serialized `Data.TaggedError` values for schema-backed errors.
- [`avoid-untagged-errors`](avoid-untagged-errors.md): Reviews raw `Error` construction and discrimination in recoverable code.
- [`avoid-try-catch`](avoid-try-catch.md): Replaces `try`/`catch` in Effect code with typed Effect constructors.
- [`throw-in-effect-gen`](throw-in-effect-gen.md): Detects thrown exceptions inside Effect generators and functions.
- [`effect-catchall-default`](effect-catchall-default.md): Reviews broad catch-and-default recovery that may hide failures.
- [`effect-promise-vs-trypromise`](effect-promise-vs-trypromise.md): Uses `Effect.tryPromise` when Promise rejection must enter the error channel.
- [`effect-run-in-body`](effect-run-in-body.md): Keeps `Effect.runSync`, `runPromise`, and `runFork` at runtime boundaries.
- [`prefer-effect-fn`](prefer-effect-fn.md): Wraps service methods with named, traced `Effect.fn` definitions.
- [`avoid-yield-ref`](avoid-yield-ref.md): Replaces direct yielding of Ref, Deferred, Fiber, and Latch with explicit operations.

### Services, concurrency, and time

- [`context-tag-extends`](context-tag-extends.md): Replaces legacy service-tag APIs with `Context.Service`.
- [`avoid-mutable-state`](avoid-mutable-state.md): Reviews mutable `let` state inside Effect services in favor of `Ref`.
- [`yield-in-for-loop`](yield-in-for-loop.md): Replaces effectful loop bodies with Effect or STM collection combinators.
- [`require-effect-concurrency`](require-effect-concurrency.md): Requires explicit concurrency for Effect collection combinators.
- [`prefer-duration-values`](prefer-duration-values.md): Replaces numeric time literals with typed `Duration` values.
- [`use-clock-service`](use-clock-service.md): Replaces JavaScript `Date` operations with testable DateTime or Clock effects.
- [`use-random-service`](use-random-service.md): Replaces `Math.random()` with Effect's testable Random service.
- [`use-console-service`](use-console-service.md): Replaces native console calls with Effect logging or Console services.

### Platform, I/O, and configuration

- [`avoid-native-fetch`](avoid-native-fetch.md): Replaces native `fetch` with Effect HTTP client modules.
- [`use-http-client-service`](use-http-client-service.md): Replaces `node:http` and `node:https` with Effect `HttpClient`.
- [`use-filesystem-service`](use-filesystem-service.md): Replaces Node filesystem imports with Effect `FileSystem`.
- [`avoid-sync-fs`](avoid-sync-fs.md): Detects synchronous filesystem operations.
- [`stream-large-files`](stream-large-files.md): Reviews whole-file reads of likely large or unbounded inputs.
- [`use-path-service`](use-path-service.md): Replaces Node path imports with Effect's `Path` service.
- [`use-temp-file-scoped`](use-temp-file-scoped.md): Requires scoped temporary files and directories with automatic cleanup.
- [`use-command-executor-service`](use-command-executor-service.md): Replaces `node:child_process` with Effect process services.
- [`avoid-node-imports`](avoid-node-imports.md): Catches Node imports not covered by a more specific platform rule.
- [`avoid-platform-coupling`](avoid-platform-coupling.md): Prevents binding packages from hardwiring Bun or Node platform Layers.
- [`avoid-process-env`](avoid-process-env.md): Replaces direct environment access with Effect Config.
- [`prefer-redacted-config`](prefer-redacted-config.md): Requires secret-like configuration values to remain redacted.

### React and testing conventions

- [`avoid-react-hooks`](avoid-react-hooks.md): Reviews React state and effects for Effect Atom alternatives.
- [`avoid-expect-in-if`](avoid-expect-in-if.md): Prevents conditional assertions that allow tests to pass without checking behavior.
