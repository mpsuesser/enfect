# @enfect/oxlint

[![npm](https://img.shields.io/npm/v/@enfect/oxlint)](https://www.npmjs.com/package/@enfect/oxlint)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

An opinionated [oxlint](https://oxc.rs/docs/guide/usage/linter) plugin for [Effect v4](https://effect.website) that drives every module toward Effect services, typed error channels, and functional composition. It flags imperative patterns, raw Node APIs, untyped errors, and other non-idiomatic shapes at the lint layer so they never make it into review.

The plugin ships **74 rules** namespaced under `effect/`, including all 16 rules from [`dmmulroy/anti-slop`](https://github.com/dmmulroy/anti-slop). Rules are implemented with the [`effect-oxlint`](https://github.com/mpsuesser/effect-oxlint) SDK and run as standard oxlint custom rules.

The runtime and recommendations target **Effect 4.0.6 (stable)**. Area imports use
`effect/http`, `effect/http-api`, `effect/process`, etc.; the old `unstable` paths
are removed. APIs marked `@stability unstable` can still change in minor releases.
Keep directly used Effect-family packages on the same release version.

The published plugin is checked with oxlint 1.85. It is part of
[Enfect](https://github.com/mpsuesser/enfect), which also publishes Effect
plugins for Claude Code and OpenCode.

## Installation

```sh
npm install --save-dev oxlint @enfect/oxlint
# or
bun add -D oxlint @enfect/oxlint
```

The TypeScript sources are also published to JSR as
[`@enfect/oxlint`](https://jsr.io/@enfect/oxlint).

Use the generated recommended config from `oxlint.config.ts`:

```ts
import { defineConfig } from 'oxlint';
import effect from '@enfect/oxlint';

export default defineConfig({
	extends: [effect.configs.recommended]
});
```

`configs.recommended` registers the package through oxlint's `jsPlugins` field and enables all 74 rules at `error` severity. `configs.all` also includes every rule.

To override an individual rule, add a `rules` entry after the `extends` block:

```ts
import { defineConfig } from 'oxlint';
import effect from '@enfect/oxlint';

export default defineConfig({
	extends: [effect.configs.recommended],
	rules: {
		'effect/avoid-native-object-helpers': 'off',
		'effect/avoid-direct-json': 'warn'
	}
});
```

If you use `.oxlintrc.json`, oxlint cannot import a package config object. Configure the JS plugin and any rules you want explicitly:

```jsonc
{
	"jsPlugins": ["@enfect/oxlint"],
	"rules": {
		"effect/avoid-direct-json": "error"
	}
}
```

Use `oxlint.config.ts` when you want the full generated recommended config.

## Rules at a glance

### Anti-slop rules

These rules apply to JavaScript and TypeScript independently of Effect imports,
except for the architecture policy expressed by `no-service-constructor-imports`.
They are part of the same `effect/` namespace and both generated presets.

| Rule | What it catches / exceptions |
| --- | --- |
| `no-chained-type-assertions` | Nested `as` or angle-bracket assertions, including parenthesized chains. Chains made only of `as const` are allowed. |
| `no-conditional-empty-object-spread` | Object spreads with a conditional empty-object branch. No autofix: omitting a property is different from assigning `undefined`. |
| `no-known-value-widening` | Known expressions flowing into explicit `unknown`, `object`, anonymous-object, or open-dictionary targets, including known arguments passed to local `unknown` type predicates. Empty dictionary accumulators and finite-key `Record` targets are allowed. |
| `no-module-mocking` | Vitest/Jest `mock`, `doMock`, and `unstable_mockModule` calls, including aliased imports and computed method names. Locally shadowed framework names are allowed. |
| `no-object-parameters` | `object` inputs, unions containing it, and scoped/transparent generic aliases resolving to it. |
| `no-reflect-apply` | Global `Reflect.apply`, including computed access. Locally shadowed `Reflect` bindings are allowed. |
| `no-reflect-get` | Global `Reflect.get`, including computed access. Locally shadowed `Reflect` bindings are allowed. |
| `no-runtime-typeof` | Runtime `typeof` narrowing. Comparisons with the string `"undefined"` are allowed; type-guard checks can be enabled with an option. Type-level `typeof` is unaffected. |
| `no-service-constructor-imports` | Named `make<CapitalizedName>` imports from `./` or `../` modules outside `*.test.*` and `*.spec.*`. Package/path-alias imports, default imports, and static constructors are outside its scope. |
| `no-shape-in-symbol-names` | Case-insensitive `shape` in locally owned identifiers, including private and JSX names. Static member access such as `schema.shape` is allowed. |
| `no-unknown-parameters` | Explicit `unknown` parameters and unions containing it. The parameter named `cause` and the exact subject of a type predicate are allowed. |
| `no-unknown-returns` | Explicit return contracts resolving to `unknown`, `Promise<unknown>`, or `PromiseLike<unknown>`, including scoped/transparent generic aliases. |
| `no-unknown-type-aliases` | Scoped/transparent generic aliases resolving to `unknown`. |
| `no-unsafe-dictionary-type` | Dictionary values based on `unknown`, `any`, `object`, `{}`, or semantic equivalents. Generic constraints such as `T extends Record<string, unknown>` are allowed. |
| `no-widen-then-assert` | Immutable local flows that widen known evidence to `unknown`, `any`, `object`, or a broad record, then assert it back to a narrower type. |
| `require-safety-comment-for-type-assertion` | Non-const assertions without a preceding, non-empty invariant justification. The default marker is `SAFETY:`. |

The analysis uses Oxlint's ESTree and lexical scopes, not a TypeScript type
checker. Same-file aliases, forward references, lexical shadowing, and
transparent generic aliases are resolved where documented. Imported types and
cross-file call signatures are not inferred. `no-widen-then-assert` deliberately
limits its value-flow analysis to immutable bindings within a function boundary.

### Replacing an anti-slop installation

Remove the old `anti-slop` and `anti-slop-effect` registrations from `jsPlugins`.
Replace both rule-name prefixes with `effect/`, keeping existing severity and
option values. Register `@enfect/oxlint` once, or use the
recommended config above to enable the entire personal ruleset. There is no
runtime dependency on anti-slop and no separate Effect entrypoint to register.

For example, an existing customized configuration becomes:

```ts
import { defineConfig } from 'oxlint';
import effect from '@enfect/oxlint';

export default defineConfig({
	extends: [effect.configs.recommended],
	rules: {
		'effect/no-runtime-typeof': ['error', { allowInTypeGuards: true }],
		'effect/require-safety-comment-for-type-assertion': [
			'error',
			{ markers: ['INVARIANT', 'SAFETY'] }
		]
	}
});
```

`allowInTypeGuards` defaults to `false` and permits checks directly within type
predicate/assertion functions, not nested ordinary functions. `markers`
defaults to `['SAFETY']`; markers are literal strings (regex punctuation is
escaped), trimmed before matching, and must be followed by `:` and a non-empty
justification. Comments before exported declarations are recognized; comments
after an assertion do not justify it.

```ts
// Rejected: assertions fabricate evidence in two steps.
const user = input as unknown as User;

// Rejected: the known "start" key is erased.
const handlers: Record<string, Handler> = { start: startHandler };

// Preserve known keys while checking their values.
const preciseHandlers = { start: startHandler } satisfies Record<string, Handler>;

// Accepted by require-safety-comment-for-type-assertion:
// SAFETY: parseUserId checked the identifier before branding it.
const userId = parsedId as UserId;
```

Some existing rules are intentionally stricter or overlap. `casting-awareness`
still reports assertions even with a safety comment; turn it off if justified
assertions are your chosen policy. `prefer-effect-is` can still report `typeof`
inside guards even when `no-runtime-typeof` allows them. `avoid-any` overlaps
with chained assertions, and `avoid-object-type` addresses `Object`/`{}` rather
than the lowercase `object` parameter contract. Configure each independently.

### Effect-first rules

| Rule                                                                                                  | What it catches                                                                  |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [`avoid-any`](#avoid-any)                                                                             | `as any` and `as unknown as T` casts                                             |
| [`avoid-data-tagged-error`](#avoid-data-tagged-error)                                                 | `Data.TaggedError` — use `Schema.TaggedError`                                    |
| [`avoid-direct-json`](#avoid-direct-json)                                                             | `JSON.parse` / `JSON.stringify` — use `Schema.fromJsonString`                    |
| [`avoid-direct-tag-checks`](#avoid-direct-tag-checks)                                                 | `x._tag === "..."` checks — use `$is` / `$match` / `Match`                       |
| [`avoid-expect-in-if`](#avoid-expect-in-if)                                                           | `expect(...)` nested inside `if` blocks in tests                                 |
| [`avoid-mutable-state`](#avoid-mutable-state)                                                         | `let` bindings inside service / layer factories                                  |
| [`avoid-native-fetch`](#avoid-native-fetch)                                                           | Native `fetch()` — use Effect `HttpClient`                                       |
| [`avoid-native-object-helpers`](#avoid-native-object-helpers)                                         | `Object.keys` / `Object.entries` / `Object.fromEntries` etc.                     |
| [`avoid-node-imports`](#avoid-node-imports)                                                           | Bare `node:*` imports in platform-agnostic code                                  |
| [`avoid-non-null-assertion`](#avoid-non-null-assertion)                                               | The `!` non-null assertion operator                                              |
| [`avoid-object-type`](#avoid-object-type)                                                             | `Object` and `{}` as types                                                       |
| [`avoid-option-getorthrow`](#avoid-option-getorthrow)                                                 | `.getOrThrow` on `Option` / `Either` / `Result`                                  |
| [`avoid-platform-coupling`](#avoid-platform-coupling)                                                 | `@effect/platform-bun` imports in binding packages                               |
| [`avoid-process-env`](#avoid-process-env)                                                             | `process.env` — use a `Config` service                                           |
| [`avoid-react-hooks`](#avoid-react-hooks)                                                             | `useState` / `useEffect` / `useReducer` — use Effect Atom VMs                    |
| [`avoid-schema-suffix`](#avoid-schema-suffix)                                                         | Schema constants suffixed with `Schema`                                          |
| [`avoid-sync-fs`](#avoid-sync-fs)                                                                     | `fs.readFileSync` and other synchronous `fs` calls                               |
| [`avoid-try-catch`](#avoid-try-catch)                                                                 | `try` / `catch` in Effect code                                                   |
| [`avoid-ts-ignore`](#avoid-ts-ignore)                                                                 | `@ts-ignore` / `@ts-expect-error` comments                                       |
| [`avoid-untagged-errors`](#avoid-untagged-errors)                                                     | `new Error(...)` and `instanceof Error` for recoverable failures                 |
| [`avoid-yield-ref`](#avoid-yield-ref)                                                                 | `yield* ref` / `yield* deferred` / `yield* fiber` (removed in v4)                |
| [`casting-awareness`](#casting-awareness)                                                             | `as T` assertions (excluding `as const` / `as never`)                            |
| [`context-tag-extends`](#context-tag-extends)                                                         | `Context.Tag` / `Context.GenericTag` / `Effect.Service` / legacy `ServiceMap.*`  |
| [`effect-catchall-default`](#effect-catchall-default)                                                 | Blanket `Effect.catch` / `catchCause` swallowing all errors                      |
| [`effect-promise-vs-trypromise`](#effect-promise-vs-trypromise)                                       | `Effect.promise` — prefer `Effect.tryPromise`                                    |
| [`effect-run-in-body`](#effect-run-in-body)                                                           | `Effect.runSync` / `runPromise` / `runFork` outside entrypoints                  |
| [`imperative-loops`](#imperative-loops)                                                               | `for` / `while` / `do…while` in domain code                                      |
| [`maybe-prefix-requires-option`](#maybe-prefix-requires-option)                                       | `maybe*` named field that is not an `Option<T>`                                  |
| [`no-barrel-imports`](#no-barrel-imports)                                                             | Named imports from the `effect` barrel package                                   |
| [`no-cause-in-http-response`](#no-cause-in-http-response)                                             | `Cause.pretty`/`Cause.squash`/caught cause or error flowing into a response body |
| [`no-effect-ignore-then-as`](#no-effect-ignore-then-as)                                               | Redundant `Effect.ignore` before `Effect.as`, or on known infallible primitives  |
| [`no-length-comparison`](#no-length-comparison)                                                       | `.length === 0` and friends — use named string/array predicates                  |
| [`no-opaque-instance-fields`](#no-opaque-instance-fields)                                             | Instance members on `Schema.Opaque` classes                                      |
| [`prefer-arr-match`](#prefer-arr-match)                                                               | Manual empty / non-empty branching — use `Arr.match`                             |
| [`prefer-arr-sort`](#prefer-arr-sort)                                                                 | `Array.prototype.sort` — use `Arr.sort` with an `Order`                          |
| [`prefer-array-fromoption-over-option-match-empty`](#prefer-array-fromoption-over-option-match-empty) | `Option.match` that produces `[]` / `[v]`                                        |
| [`prefer-duration-constructors`](#prefer-duration-constructors)                                       | Raw millisecond numbers passed to Effect timing APIs                             |
| [`prefer-effect-fn`](#prefer-effect-fn)                                                               | `Effect.gen` bound to a const or used in a service method                        |
| [`prefer-effect-is`](#prefer-effect-is)                                                               | `typeof x === "string"` — use `P.isString` and friends                           |
| [`prefer-match-over-switch`](#prefer-match-over-switch)                                               | `switch` statements — use `Match.value`                                          |
| [`prefer-namespace-imports`](#prefer-namespace-imports)                                               | Named imports from Effect submodules — use namespace imports                     |
| [`prefer-option-over-null`](#prefer-option-over-null)                                                 | `T \| null` / `T \| undefined` union types                                       |
| [`prefer-redacted-config`](#prefer-redacted-config)                                                   | `Config.String("apiKey")` etc. for secret-looking keys                           |
| [`require-effect-concurrency`](#require-effect-concurrency)                                           | `Effect.all` / `forEach` / `validate` without explicit `concurrency`             |
| [`require-filter-metadata`](#require-filter-metadata)                                                 | `Schema.makeFilter` / `makeFilterGroup` missing identifier / title / description |
| [`require-is-prefix-for-boolean-schema-field`](#require-is-prefix-for-boolean-schema-field)           | `Schema.Boolean` fields without a boolean predicate prefix                       |
| [`require-schema-type-alias`](#require-schema-type-alias)                                             | Exported schema constant without a matching `export type` alias                  |
| [`throw-in-effect-gen`](#throw-in-effect-gen)                                                         | `throw` inside `Effect.gen` / `Effect.fn` / `Effect.fnUntraced`                  |
| [`use-clock-service`](#use-clock-service)                                                             | `new Date()` / `Date.now()` / `Date.UTC()` — use `Clock` / `DateTime`            |
| [`use-command-executor-service`](#use-command-executor-service)                                       | `child_process` / `node:child_process` imports                                   |
| [`use-console-service`](#use-console-service)                                                         | `console.*` — use `Effect.log*` / `Console`                                      |
| [`use-filesystem-service`](#use-filesystem-service)                                                   | `fs` / `node:fs` / `fs/promises` imports                                         |
| [`use-http-client-service`](#use-http-client-service)                                                 | `http` / `https` / `node:http` / `node:https` imports                            |
| [`use-path-service`](#use-path-service)                                                               | `path` / `node:path` imports                                                     |
| [`use-random-service`](#use-random-service)                                                           | `Math.random()` — use the `Random` service                                       |
| [`use-temp-file-scoped`](#use-temp-file-scoped)                                                       | `os.tmpdir()` / unscoped `makeTempFile` / `makeTempDirectory`                    |
| [`vm-in-wrong-file`](#vm-in-wrong-file)                                                               | View Model interfaces and layers outside `.vm.ts` files                          |
| [`yield-in-for-loop`](#yield-in-for-loop)                                                             | `yield*` inside `for` loops — use `Effect.forEach`                               |

---

### `avoid-any`

`as any` and `as unknown as T` casts erase type safety. Validate unknown data with `Schema.decodeUnknown*`, preserve types with generics, or fix the upstream type.

```ts
// ❌
const user = data as any;
const config = JSON.parse(raw) as unknown as Config;

// ✅
const user = yield* Schema.decodeUnknownEffect(User)(data);
const config = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(AppConfig))(raw);
```

### `avoid-data-tagged-error`

`Data.TaggedError` does not integrate with the Schema encode / decode pipeline. Use `Schema.TaggedError` for public errors that need decoding, encoding, or RPC transport.

```ts
// ❌
class NotFound extends Data.TaggedError('NotFound')<{ id: string }> {}
```

<!-- typecheck -->
```ts
import * as Schema from 'effect/Schema';

class NotFound extends Schema.TaggedError<NotFound>()(
	'NotFound',
	{ id: Schema.String }
) {}
```

### `avoid-direct-json`

`JSON.parse` produces `any`; `JSON.stringify` does not validate a domain contract. Use `Schema.fromJsonString(MySchema)` at typed boundaries or `Schema.fromJsonString(Schema.Unknown)` for unknown payloads.

```ts
// ❌
const user: User = JSON.parse(raw);
const body = JSON.stringify(payload);
```

<!-- typecheck -->
```ts
import * as Schema from 'effect/Schema';

class User extends Schema.Class<User>('User')({ id: Schema.String }) {}
const decodeUser = Schema.decodeUnknownEffect(Schema.fromJsonString(User));
const encodeUser = Schema.encodeEffect(Schema.fromJsonString(User));
const decodeUnknownJson = Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.Unknown));
```

### `avoid-direct-tag-checks`

Reading `_tag` directly couples call sites to the discriminant string. Use the auto-generated `$is` / `$match` helpers or `Match.value` so renaming a variant is a typed refactor.

```ts
// ❌
if (result._tag === 'Success') return result.value;
switch (msg._tag) {
	case 'Loaded':
		/* ... */
}

// ✅
if (Result.isSuccess(result)) return result.success;
return Match.value(msg).pipe(
	Match.tag('Loaded', (m) => /* ... */),
	Match.exhaustive
);
```

### `avoid-expect-in-if`

`expect(...)` nested inside an `if` block silently passes when the condition is false. Narrow first, then assert.

```ts
// ❌
if (result) {
	expect(result.id).toBe('abc');
}

// ✅
expect(result).toBeDefined();
expect(result.id).toBe('abc');
```

### `avoid-mutable-state`

`let` bindings inside service or layer factories hide fiber-visible state and lifecycle behavior. Use `Ref`, `SynchronizedRef`, or `Effect.cached` so concurrent access is explicit. `let` inside pure helpers and narrow scopes is fine.

```ts
// ❌
export const CounterLive = Layer.effect(
	Counter,
	Effect.gen(function* () {
		let count = 0;
		return Counter.of({ inc: () => Effect.sync(() => count++) });
	})
);

// ✅
export const CounterLive = Layer.effect(
	Counter,
	Effect.gen(function* () {
		const count = yield* Ref.make(0);
		return Counter.of({ inc: () => Ref.update(count, (n) => n + 1) });
	})
);
```

### `avoid-native-fetch`

Native `fetch()` returns a `Promise<Response>` with untyped errors. Effect's `HttpClient` gives you typed errors, request / response schemas, and testable layer substitution.

```ts
// ❌
const res = await fetch('/api/users');
const users = await res.json();

// ✅
const client = yield* HttpClient.HttpClient;
const users =
	yield* client
		.get('/api/users')
		.pipe(Effect.flatMap(HttpClientResponse.schemaBodyJson(UserList)));
```

### `avoid-native-object-helpers`

`Object.keys` returns `string[]` (not `keyof T`); `Object.entries` loses value types. Use the `effect/Record` helpers for type-safe equivalents.

```ts
// ❌
const keys = Object.keys(user);
const entries = Object.entries(config);
const obj = Object.fromEntries(pairs);

// ✅
import * as R from 'effect/Record';
const keys = R.keys(user);
const entries = R.toEntries(config);
const obj = R.fromEntries(pairs);
```

### `avoid-node-imports`

`node:*` imports tie domain code to a single runtime. Use abstract services from `effect` and provide a platform implementation at the runtime boundary. Dedicated rules cover the most common cases (`use-filesystem-service`, `use-path-service`, `use-command-executor-service`, `use-http-client-service`); this rule is the catch-all.

```ts
// ❌
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';

// ✅  Provide the platform layer at the runtime boundary
import * as Crypto from 'effect/Crypto';
import * as Stream from 'effect/Stream';
```

### `avoid-non-null-assertion`

`!` tells the compiler "trust me" and crashes at runtime when wrong. Model absence with `Option`, decode unknown shapes via `Schema.decodeUnknown*`, or guard at the boundary with `?.` / `??` / `Option.fromNullishOr`.

```ts
// ❌
const name = user!.profile!.displayName!;

// ✅
const name = Option.fromNullishOr(user).pipe(
	Option.flatMapNullishOr((u) => u.profile?.displayName),
	Option.getOrElse(() => 'Anonymous')
);
```

### `avoid-object-type`

`Object` provides no type safety, and `{}` matches any non-nullish value (including `42` and `"hi"`). Use a specific interface, `Record<string, unknown>`, or a `Schema.Class`.

```ts
// ❌
function merge(a: object, b: {}): object { ... }

// ✅
function merge<A extends Record<string, unknown>>(a: A, b: Partial<A>): A { ... }
```

### `avoid-option-getorthrow`

`.getOrThrow` defeats the point of `Option` / `Either` / `Result` by throwing where the type promised a total handler. Use `match`, `getOrElse`, or `map`.

```ts
// ❌
const value = Option.getOrThrow(maybeUser);

// ✅
const value = Option.match(maybeUser, {
	onNone: () => defaultUser,
	onSome: (u) => u
});
```

### `avoid-platform-coupling`

Packages under `packages/*/binding/` wrap external systems using abstract services. This rule rejects concrete Bun platform imports there; provide platform layers at the application's runtime entry point.

```ts
// ❌  packages/myapp/binding/index.ts
import { BunHttpServer } from '@effect/platform-bun';

// ✅  packages/myapp/src/main.ts
import { BunHttpServer } from '@effect/platform-bun';
```

### `avoid-process-env`

`process.env` is untyped, untested, and global. `Config.*` builds typed, layered, redactable configuration with default values and validation.

```ts
// ❌
const apiKey = process.env.API_KEY!;
const port = parseInt(process.env.PORT ?? '3000');

// ✅
const apiKey = yield* Config.Redacted('API_KEY');
const port = yield* Config.Int('PORT').pipe(Config.withDefault(3000));
```

### `avoid-react-hooks`

React hooks scatter state, effects, and rendering across a single component. VMs with Effect Atom keep state in atoms, effects in actions, and components as pure renderers.

```ts
// ❌
function Profile({ id }: Props) {
	const [user, setUser] = useState<User>();
	useEffect(() => { fetchUser(id).then(setUser); }, [id]);
	return <div>{user?.name}</div>;
}

// ✅
// profile.vm.ts
export const userAtom = Atom.family((id: string) =>
	Atom.fn(Effect.fn('fetchUser')(function* () { ... }))
);

// profile.tsx
function Profile({ id }: Props) {
	const user = useAtomValue(userAtom(id));
	return <div>{user.name}</div>;
}
```

### `avoid-schema-suffix`

Schema constants represent a domain type, not "a schema for a type." Name them after the concept (`User`) rather than the construction (`UserSchema`) — this matches how `Schema.Class` is named and keeps types and instances grep-symmetric.

```ts
// ❌
const UserSchema = Schema.Struct({ id: Schema.String });

// ✅
const User = Schema.Struct({ id: Schema.String });
export type User = typeof User.Type;
```

### `avoid-sync-fs`

Synchronous `fs` calls block the event loop. Use `FileSystem` from `effect/FileSystem` for async, composable, testable file I/O.

```ts
// ❌
const text = fs.readFileSync(path, 'utf8');
fs.writeFileSync(path, data);

// ✅
const fs = yield* FileSystem.FileSystem;
const text = yield* fs.readFileString(path);
yield* fs.writeFileString(path, data);
```

### `avoid-try-catch`

`try` / `catch` does not expose failures in a function's return type. Use `Effect.try` or `Effect.tryPromise` with `Schema.TaggedError` to keep expected errors in the typed channel.

```ts
// ❌
try {
	return JSON.parse(raw);
} catch (e) {
	return null;
}

// ✅
return (
	yield* Effect.try({
		try: () => externalParser(raw),
		catch: (cause) => new ParseFailed({ cause })
	})
);
```

### `avoid-ts-ignore`

`@ts-ignore` and `@ts-expect-error` mask real bugs and silently rot when the underlying type changes. Fix the type at the source instead.

```ts
// ❌
// @ts-ignore
const result = someApi.experimental.method();

// ✅
// Augment the third-party type or wrap in a typed adapter
declare module 'some-api' {
	interface ExperimentalApi {
		method(): Result;
	}
}
```

### `avoid-untagged-errors`

`Schema.TaggedError` gives each domain failure mode a tag that `catchTag` / `catchTags` can discriminate at the type level. Use `Schema.isSchemaError` for decoder failures; schema constructors such as `makeEffect` fail directly with `SchemaIssue.Issue`.

```ts
// ❌
throw new Error('User not found');
if (err instanceof Error) return null;

// ✅
class UserNotFound extends Schema.TaggedError<UserNotFound>()(
	'UserNotFound', { id: Schema.String }
) {}

yield* Effect.fail(new UserNotFound({ id }));
yield* effect.pipe(Effect.catchTag('UserNotFound', () => Effect.succeed(null)));
```

### `avoid-yield-ref`

Direct `yield* ref` / `yield* deferred` / `yield* fiber` / `yield* latch` was removed in Effect v4. Use the explicit method calls.

```ts
// ❌
const value = yield* counter;
const result = yield* deferred;

// ✅
const value = yield* Ref.get(counter);
const result = yield* Deferred.await(deferred);
const exit = yield* Fiber.join(fiber);
yield* Latch.await(latch);
```

### `casting-awareness`

Every `as T` assertion is a checkpoint: is the cast redundant? Can generics or `Schema.decodeUnknownEffect` replace it? Does the upstream type need fixing? The rule exempts `as const` and `as never`; that exemption does not make an unchecked assertion sound.

```ts
// ❌
const items = (data as Array<User>).filter((u) => u.active);

// ✅
const items =
	yield* Schema.decodeUnknownEffect(Schema.Array(User))(data).pipe(
		Effect.map(Arr.filter((u) => u.active))
	);

// ✅  as const is fine
const STATUSES = ['Pending', 'Active', 'Closed'] as const;
```

### `context-tag-extends`

`class FooTag extends Context.Tag(...)`, `Context.GenericTag`, `Effect.Service`, and the legacy `ServiceMap.*` aliases were all removed or superseded in Effect v4. Define services with `Context.Service` and name them directly — no `*Tag` suffix.

```ts
// ❌
class UserRepoTag extends Context.Tag('UserRepo')<UserRepoTag, Service>() {}
const UserRepo = Context.GenericTag<Service>('UserRepo');
class UserRepo extends Effect.Service<Service>()('UserRepo', { ... }) {}

// ✅
class UserRepo extends Context.Service<UserRepo, Service>()('UserRepo') {}
```

### `effect-catchall-default`

Blanket `Effect.catch` / `Effect.catchCause` returning a default value silently swallows every failure mode — including ones you didn't know about. Use `catchTag` / `catchTags` for targeted recovery.

```ts
// ❌
effect.pipe(Effect.catch(() => Effect.succeed(defaultUser)));

// ✅
effect.pipe(
	Effect.catchTags({
		UserNotFound: () => Effect.succeed(defaultUser),
		NetworkError: (e) => Effect.fail(e) // re-raise the rest
	})
);
```

### `effect-promise-vs-trypromise`

`Effect.promise` treats rejections as defects outside the typed error channel. Defect/cause handlers can still observe them. Use `Effect.tryPromise` for expected rejections so callers can handle typed failures with `catchTag`.

```ts
// ❌
const user = yield* Effect.promise(() => fetchUser(id));

// ✅
const user =
	yield* Effect.tryPromise({
		try: () => fetchUser(id),
		catch: (cause) => new FetchFailed({ cause })
	});
```

### `effect-run-in-body`

`Effect.runSync` / `runPromise` / `runFork` collapse the program down to a concrete value. Keep them at the boundary (`main.ts`, the test harness, the HTTP route handler) and return `Effect` values everywhere else.

```ts
// ❌  inside a service method
const get = (id: string) => {
	const user = Effect.runSync(fetchUser(id));
	return user;
};

// ✅
const get = (id: string) => fetchUser(id);
```

### `imperative-loops`

`for`, `while`, and `do…while` over collections obscure the intent of the transformation. Use `Arr.map`, `Arr.filter`, `Arr.filterMap`, `Arr.reduce`, or `Effect.forEach` so the operation is on the page.

```ts
// ❌
const names: Array<string> = [];
for (const user of users) {
	if (user.active) names.push(user.name);
}
```

<!-- typecheck -->
```ts
import * as Arr from 'effect/Array';
import * as Result from 'effect/Result';

declare const users: ReadonlyArray<{ readonly active: boolean; readonly name: string }>;
const names = Arr.filterMap(users, (u) =>
	u.active ? Result.succeed(u.name) : Result.fail(undefined)
);
```

### `no-barrel-imports`

This stricter import policy makes each dependency's owning module explicit. Import namespaces from submodules; root function exports such as `pipe` and `flow` belong to `effect/Function`. This is a style policy, not a claim that named imports inherently disable tree-shaking.

```ts
// ❌
import { Effect, Array as Arr, Option } from 'effect';

// ✅
import * as Effect from 'effect/Effect';
import * as Arr from 'effect/Array';
import * as Option from 'effect/Option';
```

### `no-opaque-instance-fields`

`Schema.Opaque` classes are pure type-level wrappers — they have no runtime identity beyond the underlying schema. Adding instance methods or fields turns them into something the type system can no longer treat as opaque.

```ts
// ❌
class UserId extends Schema.Opaque<UserId>()(Schema.String) {
	greet() {
		return `Hello ${this.toString()}`;
	}
}

// ✅
class UserId extends Schema.Opaque<UserId>()(Schema.String) {}
const greet = (id: UserId) => `Hello ${id}`;
```

### `prefer-arr-match`

Manual `.length === 0` / `.length > 0` branching obscures the empty vs non-empty intent. `Arr.match` makes both branches explicit and gives you the non-empty array witness in the body.

```ts
// ❌
if (items.length === 0) return placeholder;
return list(items);

// ✅
return Arr.match(items, {
	onEmpty: () => placeholder,
	onNonEmpty: (xs) => list(xs)
});
```

### `prefer-arr-sort`

`Array.prototype.sort` mutates in place, sorts lexicographically by default, and has no notion of an `Order`. `Arr.sort` is immutable and composes with `Order` combinators.

```ts
// ❌
const sorted = [...users].sort((a, b) => a.age - b.age);

// ✅
const sorted = Arr.sort(
	users,
	Order.mapInput(Order.Number, (u: User) => u.age)
);
```

### `prefer-duration-constructors`

Raw millisecond literals passed to `Effect.sleep`, `Schedule.spaced`, etc. read poorly. `Duration.seconds`, `Duration.minutes`, `Duration.millis` keep units at the call site.

```ts
// ❌
yield* Effect.sleep(5000);
const sched = Schedule.spaced(60_000);

// ✅
yield* Effect.sleep(Duration.seconds(5));
const sched = Schedule.spaced(Duration.minutes(1));
```

### `prefer-effect-fn`

`Effect.gen(function*() { ... })` assigned to a `const`, or used as a service method, lacks an attached span name. `Effect.fn("name")(function*() { ... })` adds automatic tracing.

```ts
// ❌
const getUser = (id: string) => Effect.gen(function* () { ... });

const make = Effect.gen(function* () {
	return UserRepo.of({
		get: (id) => Effect.gen(function* () { ... })
	});
});

// ✅
const getUser = Effect.fn('getUser')(function* (id: string) { ... });

const make = Effect.gen(function* () {
	return UserRepo.of({
		get: Effect.fn('UserRepo.get')(function* (id) { ... })
	});
});
```

### `prefer-effect-is`

`typeof x === "string"` is non-composable and doesn't narrow union types as cleanly as Effect's `Predicate` helpers.

```ts
// ❌
if (typeof value === 'string') return value;
if (typeof n === 'number' && n > 0) return n;

// ✅
import * as P from 'effect/Predicate';
if (P.isString(value)) return value;
if (P.isNumber(n) && n > 0) return n;
```

### `prefer-match-over-switch`

`switch` is not exhaustive (TypeScript can't prove every case is handled) and doesn't compose with pipe. `Match.value` is exhaustive, expression-level, and pipe-friendly.

```ts
// ❌
switch (status) {
	case 'Pending':
		return spinner();
	case 'Active':
		return view();
	case 'Closed':
		return summary();
}

// ✅
return Match.value(status).pipe(
	Match.when('Pending', () => spinner()),
	Match.when('Active', () => view()),
	Match.when('Closed', () => summary()),
	Match.exhaustive
);
```

### `prefer-namespace-imports`

Use namespace imports for helper modules with the canonical alias (`Arr` for `effect/Array`, `Option`, `R` for `effect/Record`, etc.). Named area imports such as `import { HttpClient } from 'effect/http'` remain valid.

```ts
// ❌
import { map, filter } from 'effect/Array';
import { Array } from 'effect';

// ✅
import * as Arr from 'effect/Array';
import * as Effect from 'effect/Effect';
```

### `prefer-option-over-null`

`T | null` / `T | undefined` doesn't compose: every caller has to repeat the null check. `Option<T>` ships `map`, `flatMap`, `match`, `getOrElse`, and friends.

```ts
// ❌
function find(id: string): User | null { ... }

// ✅
function find(id: string): Option.Option<User> { ... }
```

### `prefer-redacted-config`

Configuration keys whose name conventionally identifies a secret (`apiKey`, `authToken`, `password`, `privateKey`, `dsn`, etc.) should use `Config.Redacted(...)` or `Schema.Redacted` inside `Config.schema`. For `Config.NonEmptyString`, retain the constraint with `Config.schema(Schema.Redacted(Schema.NonEmptyString), key)`. Legacy lowercase loaders are also detected. Redaction masks logging and inspection; it does not prevent intentional unwrapping or all encoding.

```ts
// ❌
const apiKey = yield* Config.String('apiKey');
const cfg =
	yield* Config.schema(
		Schema.Struct({
			apiKey: Schema.String
		})
	);
```

<!-- typecheck -->
```ts
import * as Config from 'effect/Config';
import * as Schema from 'effect/Schema';

const apiKey = Config.Redacted('apiKey');
const nonEmptyToken = Config.schema(Schema.Redacted(Schema.NonEmptyString), 'TOKEN');
const cfg = Config.schema(
	Schema.Struct({
		apiKey: Schema.Redacted(Schema.String)
	})
);
```

### `require-effect-concurrency`

`Effect.all`, `Effect.forEach`, `Effect.validate`, and friends silently default to sequential execution. Sequential is sometimes correct — but it's a concurrency decision, so it should be reviewable at the call site.

```ts
// ❌
yield* Effect.forEach(ids, fetchUser);

// ✅
yield* Effect.forEach(ids, fetchUser, { concurrency: 'unbounded' });
yield* Effect.forEach(ids, fetchUser, { concurrency: 4 });
yield* Effect.forEach(ids, fetchUser, { concurrency: 1 }); // explicit sequential
```

### `require-filter-metadata`

`Schema.makeFilter` and `Schema.makeFilterGroup` produce reusable validators. Without `identifier`, `title`, and `description` they show up in error messages and OpenAPI docs as opaque blobs.

```ts
// ❌
const PositiveInt = Schema.makeFilter((n: number) => n > 0);

// ✅
const PositiveInt = Schema.makeFilter((n: number) => n > 0, {
	identifier: 'PositiveInt',
	title: 'Positive integer',
	description: 'A whole number strictly greater than zero.'
});
```

### `require-schema-type-alias`

Exported `Schema.Struct` / `Schema.TaggedStruct` / `Schema.Literals` constants don't carry a TypeScript type at the value name. Pair them with `export type Foo = typeof Foo.Type` so importers can refer to the inferred type.

Guards, checks (`Schema.isIncluding`, `Schema.isBetweenLength`, etc.), filters,
equivalences, and formatters are not schema values and do not need this alias.

```ts
// ❌
export const User = Schema.Struct({ id: Schema.String });

// ✅
export const User = Schema.Struct({ id: Schema.String });
export type User = typeof User.Type;
```

### `throw-in-effect-gen`

`throw` inside `Effect.gen` / `Effect.fn` / `Effect.fnUntraced` becomes a defect outside the typed error channel. Use `yield* Effect.fail(new MyError(...))` (or `yield* new MyTaggedError({ ... })`) for expected failures. Direct thunks and the `try:` arm of `Effect.tryPromise` / `Effect.try` are excluded because those boundaries capture throws.

```ts
// ❌
Effect.gen(function* () {
	if (!user) throw new Error('User missing');
	return user;
});

// ✅
Effect.gen(function* () {
	if (!user) return yield* Effect.fail(new UserMissing({ id }));
	return user;
});
```

### `use-clock-service`

`new Date()` / `Date.now()` / `Date.UTC()` are non-deterministic and untestable. Use the `Clock` service or the `DateTime` module so tests can freeze time.

```ts
// ❌
const now = new Date();
const ms = Date.now();

// ✅
const now = yield* DateTime.now;
const ms = yield* Clock.currentTimeMillis;
```

### `use-command-executor-service`

`child_process` / `node:child_process` ties code to Node's process model and yields untyped errors. Use `ChildProcessSpawner` + `ChildProcess` from `effect/process` for typed, scoped, composable process spawning. Provide the platform spawner layer at the runtime boundary.

```ts
// ❌
import { spawn } from 'node:child_process';
const proc = spawn('git', ['status']);
```

<!-- typecheck -->
```ts
import * as Effect from 'effect/Effect';
import { ChildProcess, ChildProcessSpawner } from 'effect/process';

const status = Effect.gen(function* () {
	const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
	return yield* spawner.string(ChildProcess.make('git', ['status']));
});
```

### `use-console-service`

`console.*` writes to stdout / stderr without spans, structured fields, or test capture. Use `Effect.logInfo` / `logError` / `logWarning` / `logDebug` (preferred), or the `Console` service.

```ts
// ❌
console.log('Fetched user', user.id);
console.error('Failed', err);

// ✅
yield* Effect.logInfo('Fetched user').pipe(
	Effect.annotateLogs('userId', user.id)
);
yield* Effect.logError('Failed').pipe(Effect.annotateLogs('cause', err));
```

### `use-filesystem-service`

`fs`, `node:fs`, and `fs/promises` tie code to Node's runtime. The `FileSystem` service from `effect/FileSystem` is portable, layer-substitutable, and integrates with `Stream`, `Scope`, and the rest of Effect.

```ts
// ❌
import * as fs from 'node:fs/promises';
const text = await fs.readFile(path, 'utf8');

// ✅
import * as FileSystem from 'effect/FileSystem';
const fs = yield* FileSystem.FileSystem;
const text = yield* fs.readFileString(path);
```

### `use-http-client-service`

Direct `http` / `https` imports expose low-level transport handling. Use `HttpClient`, `HttpClientRequest`, and `HttpClientResponse` from `effect/http` for typed responses and testable layer substitution. Add retries explicitly, and only for proven-idempotent operations.

```ts
// ❌
import * as https from 'node:https';
https.get(url, (res) => { ... });

// ✅
const client = yield* HttpClient.HttpClient;
const json = yield* client.get(url).pipe(
	Effect.flatMap(HttpClientResponse.schemaBodyJson(Payload))
);
```

### `use-path-service`

`node:path` is Posix-or-Windows-flavored depending on the runtime. The `Path` service from `effect/Path` is explicit about which variant you're using and is testable / mockable.

```ts
// ❌
import * as path from 'node:path';
const full = path.join(dir, name);

// ✅
import * as Path from 'effect/Path';
const path_ = yield* Path.Path;
const full = path_.join(dir, name);
```

### `use-random-service`

`Math.random()` bypasses Effect's random service. Use `Random.withSeed` for repeatable sequences. `Random.nextIntBetween(min, max)` includes both endpoints by default; use `{ halfOpen: true }` to exclude the upper bound.

```ts
// ❌
const n = Math.floor(Math.random() * 100);
```

<!-- typecheck -->
```ts
import * as Random from 'effect/Random';

const n = Random.nextIntBetween(0, 100, { halfOpen: true }).pipe(
	Random.withSeed('example')
);
```

### `use-temp-file-scoped`

`os.tmpdir()` and unscoped `FileSystem.makeTempFile` / `makeTempDirectory` leak temp files when the program crashes. Use `FileSystem.makeTempFileScoped` / `makeTempDirectoryScoped` so cleanup is tied to the `Scope`.

```ts
// ❌
import { tmpdir } from 'node:os';
const dir = path.join(tmpdir(), 'work');

// ✅
const fs = yield* FileSystem.FileSystem;
const dir = yield* fs.makeTempDirectoryScoped();
```

### `vm-in-wrong-file`

View Model interfaces and their layers belong in `.vm.ts` files. Co-locating them with the component flattens the seam between rendering and state management — and the seam is the whole point of the VM pattern.

```ts
// ❌  profile.tsx
export interface ProfileVM { ... }
export const ProfileVMLive = Layer.effect(...);

// ✅  profile.vm.ts
export interface ProfileVM { ... }
export const ProfileVMLive = Layer.effect(...);
```

### `yield-in-for-loop`

`yield*` inside a `for` loop forces sequential execution and hides the iteration intent. `Effect.forEach` is declarative and parallelizable.

```ts
// ❌
for (const id of ids) {
	yield* fetchUser(id);
}

// ✅
yield* Effect.forEach(ids, fetchUser, { concurrency: 'unbounded' });
```

---

### `maybe-prefix-requires-option`

A field named `maybeX` promises an `Option<X>`. Using the prefix with a plain `T | null`, `T | undefined`, or a Schema optional/nullable field breaks reader expectations.

`maybe*` names should be typed as `Option<T>` in TypeScript and as `Schema.Option(...)` / `Schema.OptionFromNullishOr(...)` in Schema structs. If the value really is nullable rather than optional, rename it to `nullableX`.

### `no-effect-ignore-then-as`

`Effect.ignore` discards both the success value and the error channel. When it appears immediately before `Effect.as(...)`, the `as` already discards the success value, so `ignore` only erases failures silently.

The rule also flags `Effect.ignore` on known infallible primitives where there is no error channel to ignore.

### `no-length-comparison`

Manual `.length === 0`, `.length > 0`, and related checks hide whether the value is a string or an array. Prefer named predicates such as `Str.isEmpty`, `Str.isNonEmpty`, `Arr.isReadonlyArrayEmpty`, `Arr.isReadonlyArrayNonEmpty`, or branch with `Arr.match`.

### `prefer-array-fromoption-over-option-match-empty`

`Option<A>` to `ReadonlyArray<A>` is `Array.fromOption`. Spelling that as `Option.match({ onNone: () => [], onSome: (v) => [v] })` obscures the intent.

### `require-is-prefix-for-boolean-schema-field`

Boolean Schema fields should read as predicates at call sites. Use prefixes such as `is*`, `has*`, `can*`, `should*`, `was*`, or `will*` for `Schema.Boolean` fields.

### `no-cause-in-http-response`

`Cause.pretty`/`Cause.squash` render full failure detail — defect stack traces, decode internals — as text. Rendering that (or a caught cause/error binding, directly, via `.message`, `String(...)`, or template interpolation) into an HTTP response body turns an internal failure into an information disclosure. Log the cause server-side and return a generic body instead.

```ts
// ❌
const failureResponse = (cause: Cause.Cause<unknown>) =>
	HttpServerResponse.text(Cause.pretty(cause), { status: 500 });

// ✅
const failureResponse = (cause: Cause.Cause<unknown>) =>
	Effect.logError(`Request failed: ${Cause.pretty(cause)}`).pipe(
		Effect.as(HttpServerResponse.text('Internal error.', { status: 500 }))
	);
```

## Suppression

All rules respect oxlint's standard disable directives:

```ts
// oxlint-disable-next-line effect/<rule-name> -- reason

/* oxlint-disable effect/<rule-name> -- reason */
// ... block ...
/* oxlint-enable effect/<rule-name> */
```

A trailing `-- <reason>` comment is encouraged for any suppression that lives longer than a single PR review.

## Development

From the repository root:

```sh
bun install
bun run --filter @enfect/oxlint test   # Vitest on Node; oxlint's RuleTester refuses Bun
bun run check                          # format, lint, and typecheck
```

Each rule lives in `src/rules/<rule-name>.ts` with a sibling test in `test/rules/<rule-name>.test.ts`. The rule SDK is documented at [`effect-oxlint`](https://github.com/mpsuesser/effect-oxlint).

Many rules have an ast-grep counterpart in
[`@enfect/patterns`](../../packages/patterns), which the agent plugins run after
each write.

## License

MIT. Anti-slop-derived rules and fixtures retain their upstream MIT notice in
[`licenses/anti-slop.txt`](./licenses/anti-slop.txt); see
[`licenses/README.md`](./licenses/README.md) for provenance.
