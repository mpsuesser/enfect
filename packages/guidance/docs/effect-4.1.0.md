# Effect 4.0.6 → 4.1.0

## Provenance and release scope

- Previous baseline: `effect@4.0.6`, commit
  `3b28bf686bf26e9700edd39c025aff2744dc5303`.
- Target: **`effect@4.1.0` (stable)**, npm's `latest` dist-tag verified with
  `npm view effect dist-tags --json` on 2026-10-29.
- Exact source: [`effect@4.1.0`](https://github.com/Effect-TS/effect/tree/effect%404.1.0),
  commit `9a91b1926a5fbfaffd302a7a41a94d4d53a1154e`, dated
  2026-10-29T03:41:32Z.
- [Official release](https://github.com/Effect-TS/effect/releases/tag/effect%404.1.0),
  published 2026-10-29T03:45:51Z.
- [Complete source comparison](https://github.com/Effect-TS/effect/compare/effect%404.0.6...effect%404.1.0).
- [Full upstream release notes](effect-4.1.0-changelog.md): **66 complete package
  release sections across 33 packages**, including **31 dependency-only
  sections**, plus both official GitHub release bodies. The interval includes
  4.0.7 and 4.1.0 and excludes 4.0.6. Only trailing whitespace is normalized.
- Previous audit: [4.0.0 → 4.0.6](effect-4.0.6.md).

The audit uses the tagged target and its source diff, not the moving main branch.
Earlier release notes are interpreted against the final 4.1.0 implementation.

## Dependency alignment

All seven directly consumed Effect packages are pinned to **4.1.0** in the
workspace catalog and `bun.lock`: `effect`, `@effect/vitest`,
`@effect/platform-bun`, `@effect/platform-node`, `@effect/platform-node-shared`,
`@effect/ai-openrouter`, and `@effect/ai-typesafe`. The JSR imports map matches.
The explicit node-shared pin keeps documentation compilation on the target.
Older Effect prereleases owned by `@opencode/plugin` remain isolated in its
existing dependency graph; no blanket override changes the host's dependencies.

`effect-oxlint@0.4.0` declares an `effect: ^4.0.0` peer and uses unaffected core
APIs. Its version range remains `^0.4.0`; build, typechecking and all rule tests
verify the installed SDK against 4.1.0. Companion providers and database adapters
shown in skills are reviewed at the same tag without installing every integration.

## Complete audit inventory

The review covers all **54 skill directories**, all **45 pattern definitions**,
all **74 oxlint rules**, and all **four guidance documents**. Every skill is
accounted for below (`effect-` prefix omitted). Baseline pointers now resolve to
the exact target; retained contracts are not rewritten solely to increase diffs.

| Skill directories | Review focus |
| --- | --- |
| ai-chat | Documented the Persistence key-layout migration and unreachable old KVS chat histories; export/restore and tool loops retained. |
| ai-decision-model | Moved images into Decision.Image input fields; added locate, TypeSafe image/Box support, provider capabilities and Locate answers; updated error metadata. |
| ai-language-model | Updated NetworkError metadata and truncation/handler behavior; generation and structured-output contracts retained. |
| ai-prompt | Added model-facing tool-output mapping and text fallback; prompt history and codec contracts retained. |
| ai-provider | Updated transport error context, truncation and Anthropic GA Files/Skills migration pointers; reviewed every provider changelog. |
| ai-streaming | Documented parameter codec service requirements; retained queue bounds and preliminary-result ownership. |
| ai-tool | Added toModelOutput, native versus placeholder provider behavior and setSuccess reset; handler and preliminary-result contracts retained. |
| atom-rpc | Reviewed RPC serialization, refresh, invalidation and service ownership; no independent API migration. |
| atom-state | Updated Atom.Serializable public Schema.Json encoding and AsyncResult interruption narrowing guidance; hydration behavior retained. |
| batching | Documented Persistence key migration; preserved nonempty SQL batches through Array.map and reviewed transaction isolation. |
| cache | Reviewed Cache/ScopedCache/RcMap cleanup, unhandled release failures, abandonment and reentrancy; existing ownership advice retained. |
| cli | Updated canPrompt enforcement, repeated flags, inherited help metadata, formatter modes, Presenter and completion generation. |
| command-executor | Updated CommandLine parsing, Redacted inputs, helper pipe draining, input errors and aggregate services; reviewed process-group cleanup. |
| concurrency-testing | Reviewed matching vitest adapter, cancellation and resource lifetime; existing deterministic coordination contracts retained. |
| config | Added trim/keepEmptyValues and defaults; reviewed ConfigProvider, Record, defaults and encoding boundaries. |
| context-witness | Reviewed Context.makeUnsafe maxDepth overlays and pick; service identity and witness guidance retained. |
| domain-modeling | Corrected direct TaggedUnion fallback narrowing and return-type annotation guidance; constructor/discriminator contracts retained. |
| domain-predicates | Reviewed Schema checks, isAscii and guard semantics; existing domain predicate design retained. |
| error-handling | Reviewed typed recovery/retry against final internal effect implementation, mixed causes, inspection and new ignore log option; existing failure semantics retained. |
| fiber | Reviewed interruption, duplicate reason fixes, ownership and supervision; existing structured concurrency guidance retained. |
| filesystem | Updated readDirectoryEntries requirement and derived shared glob behavior; reviewed metadata, scoped temporary paths and platform errors. |
| graph | Reviewed Graph source diff, algorithms, traversal and stability; no independent API migration. |
| http-api | Updated upgrade payloads/headers/handler and branded mixed responses; added opt-in RFC 9457 Problem Details and deferred response decoding. |
| http-client | Migrated cookie jar to scoped cookie arrays; updated custom methods, streaming-body fallback and reviewed retries/redirect cleanup. |
| http-server | Documented upgradeWith, buffered MaxBodySize enforcement and Bun idleTimeout default; reviewed framing, proxy trust and static preconditions. |
| incremental-migration | Reviewed layer memoization, boundaries and transport changes; retained staged migration and adapter ownership guidance. |
| layer-design | Reviewed memoization identity, sharing and lifetime against final source; no independent construction API migration. |
| managed-runtime | Reviewed disposal/finalization and memoized layer ownership; no independent API migration. |
| mcp-server | Rewrote transport registrations, request dependency/capture model, cache hints and visibility; retained protocol negotiation and stderr ownership. |
| observability | Updated combined OTLP Flusher output, resource parsing and SDK entrypoints; added OtlpProxy and public pool statistics pointers. |
| optics | Reviewed Optic contracts and Schema representation changes; no independent API migration. |
| parallelization | Added Semaphore.takeScoped; reviewed partition fairness, joins and bounded concurrency. |
| path | Moved filesystem migration loader to MigratorFileSystem; retained host-aware path and safe resolution guidance. |
| pattern-matching | Corrected direct TaggedUnion fallback narrowing and output typing; added literal-union dispatch pointers. |
| platform-abstraction | Split SecureRandom/Digest, explicit crypto provision and fixture testing; updated migration loader and aggregate service contracts. |
| platform-layers | Updated explicit crypto families, Terminal.size mock, migration loader and Redis reservation/pool options. |
| pubsub-event-bus | Reviewed final-message backpressure and broadcast completion fixes; existing publication/subscriber ownership retained. |
| react-composition | Reviewed React render-time notification deferral, React 19 peers, hydration and scheduler; no independent API migration. |
| rpc-api | Reviewed schema/service contracts, discard envelope and codecs; existing definition guidance retained. |
| rpc-client | Updated discard acknowledgement contract and pending-entry behavior; documented coordinated SchemaBinary upgrades. |
| rpc-cluster | Updated discard semantics, explicit Digest, migration-free SQL storage, runnerJoinDebounce and shard-lock ownership/replay behavior. |
| rpc-server | Added onDisconnect observation and RpcTest defect policy; reviewed handler isolation and protocol cleanup. |
| scheduling | Added repeated-local-time overlap policy, corrected Fibonacci sequence and exact ISO duration pointers; retry cause semantics retained. |
| schema-composition | Added ISO duration schema and conversion caveats; reviewed transformation, metadata and JSON codec behavior. |
| schema-v4 | Updated fallback narrowing, ASCII/ISO checks, Record restrictions, enum keys and content/status annotations. |
| scope | Reviewed scope cleanup, Pool fairness/statistics and cache release reporting; existing ownership contracts retained. |
| service-implementation | Migrated UUID services to infallible SecureRandom and targeted Node layer; added fnUntraced self binding. |
| socket | Replaced removed WS constructor with NodeWS; documented global WebSocket behavioral differences and Node minimum. |
| sql | Moved fromFileSystem loader, documented nonempty row arrays, empty IN behavior, escaped aliases and public PostgreSQL pool metrics. |
| stream | Documented upstream versus sink failures, buffered output/group completion and Node bounded pulls; added CSV pointer. |
| testing | Replaced TestCrypto with Layer.mock, added buildPerTest and concurrent property checks; reviewed clock and cancellation behavior. |
| typeclass-design | Reviewed equality, reference identity changes to Ref/MutableRef and exported tagged-enum types; existing abstraction guidance retained. |
| wide-events | Reviewed trace/log metadata and ended-span behavior; retained event field design and source-linked article. |
| workflow | Documented deferred-race replay and shutdown fixes; reviewed compensation/resource ownership and idempotency requirements. |

The active guidance documents are `guidance/effect-first-development.md` and
`guidance/progressive-disclosure-guidance.md`; both baseline pointers are updated.
The former also corrects direct TaggedUnion fallback narrowing. The conceptual
`post__effect-and-the-near-inexpressible-majesty-of-layers.md` and
`post__parse-dont-validate.md` remain explanatory essays; review found no new
current-API migration there. Illustrative bad code is not an API prescription.

All pattern frontmatter, examples, recommendations and one-to-one test fixtures
were reviewed. The 45-check detector inventory remains unchanged; the catch-all
Node import mapping now recommends `effect/crypto`. The 74-rule inventory also
remains unchanged. Five rule recommendations now use current v4 entrypoints,
and the removed `effect/Crypto` allowance fixture uses `effect/crypto/SecureRandom`.
Claude/OpenCode sources contain no additional old-version literals to migrate.
Two read-only audit batches covered core/platform/pattern/rule and
AI/HTTP/RPC/persistence/reactivity sources; implementation edits were applied
centrally and checked together.

### Source evidence

Paths are relative to the tagged upstream repository. Review included both
release sections in **every package changelog**, including dependency-only
sections, and relevant `git diff effect@4.0.6 effect@4.1.0 -- packages/...` hunks.

- **Core/modeling:** `packages/effect/src/{Effect,Context,Schema,SchemaGetter,SchemaTransformation,SchemaRepresentation,Match,Duration,Cron,Schedule,Ref,MutableRef,Pool,Semaphore}.ts`,
  `internal/effect.ts`, configuration, cache, scope, stream, and CLI modules.
- **Platform:** `packages/effect/src/{crypto,process,socket}/`, `FileSystem.ts`,
  `Terminal.ts`, all runtime adapters and `packages/platform/node-shared/src/`.
- **Network/storage:** `packages/effect/src/{http,http-api,rpc,cluster,workflow,sql,persistence,eventlog}/`,
  PostgreSQL and every SQL adapter changelog. Review included wire fingerprints,
  storage keys, lock ownership and replay, beyond exported signatures.
- **AI/reactivity:** `packages/effect/src/ai/`, all six provider packages,
  `reactivity/`, and React/Solid/Vue adapter changelogs. Request dependency markers,
  provider capability flags, response codecs and persisted history were checked.
- **Telemetry/testing/tools:** `observability/`, `packages/opentelemetry/`,
  `packages/vitest/`, and docgen/doctest/GraphQL/OpenAPI generator changelogs.
  Generated-client and runtime requirements were reviewed even where this repo
  has no corresponding example to change.

## Compatibility-sensitive changes

### Crypto families and platform ownership

`effect/Crypto` is removed. Import `SecureRandom`, `Digest`, and other families
from `effect/crypto` or individual family entrypoints. UUID methods are `uuidV4()`
and `uuidV7()`, not `randomUUIDv4()` / `randomUUIDv7()`; their default string format
and `{ format: 'bytes' }` remain available. Randomness and digests have no typed
error. `TestCrypto` is removed; mock required methods with `Layer.mock`.

Crypto is no longer in runtime `*Services` bundles. Provide targeted platform
layers such as `NodeCrypto.layerSecureRandom` / `layerDigest`, combined crypto
layers, or core `layerWebCrypto` explicitly. `WebCrypto` is a configurable reference.
Secret/private key byte/format encoding requires `{ allowEncode: true }`.
UUIDv7/ULID ordering is monotonic per service instance below the maximum timestamp.

`SqlMessageStorage` and `SingleRunner` now require `Digest.Digest`.
Encrypted event-log storage takes Digest instead of EventLogEncryption;
`EventLogEncryption.sha256String` becomes `digest.digestHex(Digest.sha256, bytes)`.
Event-log identity/session encryption uses Aead, Digest, Signature and SecureRandom.
Existing workflow/idempotency IDs, identities and encrypted batches keep their
encodings; explicit service provision still needs migration.

### Decisions and MCP requests

4.1.0 **adds** `Decision.Image` and `Decision.locate`; only the old
`DecideOptions.images` is removed. Images live in input fields. Providers receive
reference/path/image records and JSON state with image references. Custom providers
must handle Locate variants and opt into the capability. TypeSafe supports images
and Box questions; locate requires `jev-preview` or `jev-1.14.0`. OpenRouter's
adapter still enables neither capability.

MCP transports take registration layers through `registrations`, before reading
requests. Handler service reads are request requirements supplied through
middleware; capture construction-time services in `Layer.unwrap`. Providing an
ordinary layer does not discharge a request marker. Visibility also runs for list
requests; protocol capabilities and sessionless transport restrictions still apply.

AI NetworkError uses method/url fields and may retain an **unredacted** transport
cause. Old request-details types and request fields were removed. Native tool
model output and provider text/file fallbacks do not change the typed application
result. Provider-generated API changes, including Anthropic GA Files/Skills, need
consumer-specific migration when those low-level clients are used.

### HTTP, RPC and persistence compatibility

HTTP API Upgrade can coexist with ordinary success responses and buffered payloads;
handlers call `upgrade`, 101 headers are typed, and client results are branded.
Problem Details is opt-in and leaves existing default errors unchanged. Cookie jars
are origin-aware arrays; arbitrary received/forwarded methods are strings.
Unsupported Fetch streaming bodies fail unless explicit buffering is selected.
Bun disables the default idle timeout; direct deployments choose an explicit limit.

RPC `discard: true` waits for server acknowledgement, not handler completion.
SchemaBinary peers must upgrade together because the discard envelope changes the
fingerprint. Observe disconnects with `onDisconnect` instead of stealing cleanup
queue entries. Shard lock expiry/session replacement and deferred-race replay fixes
do not provide exactly-once external side effects.

Persistence KVS keys change from concatenation to `<encodedStoreId>:<key>`;
old entries, including stored chats, become unreachable. Redis changes affect
store IDs containing `%` or `:`. Entries are neither migrated nor removed
automatically. Redis PersistedQueue lock formats are incompatible with older
workers on the same prefix: stop old workers and let their locks expire before
starting upgraded workers. KeyValueStore custom implementations now require
`keys`; prefix clear/size/isEmpty are scoped to that prefix.

### Custom services and schema behavior

Full FileSystem implementations need `readDirectoryEntries`; `make` derives glob.
Terminal implementations need scoped `size`. SQL filesystem migration loaders
move to `effect/sql/MigratorFileSystem`; row arrays for insert/updateValues must be
nonempty. Redis custom services need reserve/connect. NodeWS is a separate module;
Node's default WebSocket now has global-implementation buffering/error behavior.
Node stream `chunkSize` bounds chunks per pull; byte read sizing moves to `readSize`.

Both schema tagged-union forms narrow partial-match fallbacks to unhandled variants;
explicit output type parameters are removed. Schema.Record rejects optional value
schemas. Toml.parse now returns Result rather than throwing; final 4.1.0 behavior
supersedes 4.0.7's intermediate throwing-parser notes. Ref/MutableRef compare by
reference. Atom.Serializable exposes Schema.Json at the type level. Stream upstream
failures bypass sink recovery; buffered grouped/rechunked output is preserved.

## New surfaces and stability

Existing skills add scoped guidance for ASCII checks, exact ISO durations and
microseconds, repeated-local-time cron policy, inherited CLI help/Presenter,
fnUntraced self binding, literal matching, scoped semaphore permits, pool statistics,
CSV, shared globs, OTLP proxying, request visibility, and model-facing tool output.
The complete notes retain additions outside current skill scope, including encrypted
remote compaction and experimental circuit breakers, without inventing new skills
or detectors for every export.

Inspect export-level stability: stable package releases contain **unstable** APIs
that can break in minor releases and **experimental** APIs that can break in patch
releases. A short source path is not a stability promise. TypeScript 5.9+ remains
required; Node platform, OpenTelemetry and docgen packages now need Node 22.19.0+.
This repo already requires Node 24+. React integrations retain React 19 peers;
`@effect/vitest` targets Vitest 5, while this repo's plain runner does not use it.

## Verification scope

The documentation compiler validates every core Effect import in TS/TSX fences
and fully compiles marked standalone examples against installed 4.1.0. Unmarked
fragments may rely on surrounding declarations or demonstrate rejected code;
import checks alone do not prove those fragments compile. No compiler gate was
relaxed. Provider adapters, external databases, distributed transports, browser
platforms and interactive terminals are source-reviewed, not live-tested.

`test/effect-release.test.ts` checks seven direct pins, current baseline links,
all 54 skill rows, the exact 33-package/two-release inventory, and independently
regenerated SHA-256 digests for all 66 sections. Digests come from a separate
`git show effect@4.1.0:<path>` extraction, not the generated Markdown. Both official
bodies are compared with their matching core notes, starting at their first
change heading (minor or patch). Tests require no network or source checkout.

Final integration on 2026-10-29:

- `bun install`: installed the seven target packages at 4.1.0.
- `bun run fmt`: passed; later rule edits were formatted before checking.
- `bun run build`: passed for Claude, OpenCode and oxlint.
- `bun run check`: passed formatting, type-aware lint and project typechecking.
- `bun run test`: **931 Bun tests across 57 files**, then **805 oxlint tests
  across 76 Vitest files** passed in the shared checkout.
- Documentation compilation: **289 marked standalone examples and 1,228
  isolated core Effect import declarations** across **105 Markdown documents**;
  zero TypeScript diagnostics.
- `claude plugin validate plugins/claude --strict` and
  `claude plugin validate . --strict`: passed; the plugin has only the existing
  optional-icon warning.
- `git diff --check`: passed. Final current-document scans found only historical
  4.0.6 comparisons/history links; removed crypto and migration-loader entrypoints
  remain solely in historical release documents.

The final test count includes concurrent command-catalog work in the shared
checkout. That work was not changed by this migration. No live AI provider,
external database, distributed transport, browser, or interactive terminal was
exercised. Older audit/changelog artifacts are retained unchanged as history.
