# Effect 4.0.0 → 4.0.6

## Provenance and release scope

- Previous baseline: `effect@4.0.0`, commit
  `67ba4e46a11ccda0b6761578bfd22c04ae00167d`.
- Target: **`effect@4.0.6` (stable)**, npm's `latest` dist-tag checked on
  2026-10-24. The older `rc` dist-tag is not the upgrade target.
- Exact source: [`effect@4.0.6`](https://github.com/Effect-TS/effect/tree/effect%404.0.6),
  commit `3b28bf686bf26e9700edd39c025aff2744dc5303`, dated
  2026-10-22T02:35:18Z.
- [Official release](https://github.com/Effect-TS/effect/releases/tag/effect%404.0.6),
  published 2026-10-22T03:27:53Z.
- [Complete source comparison](https://github.com/Effect-TS/effect/compare/effect%404.0.0...effect%404.0.6).
- [Full upstream release notes](effect-4.0.6-changelog.md): **195 complete package
  release sections across 33 packages**, including **69 dependency-only
  sections**, plus all six official GitHub release bodies. The interval includes
  4.0.1 through 4.0.6 and excludes 4.0.0. Only trailing whitespace is normalized.
- Previous audit: [rc.116 → 4.0.0](effect-4.0.0.md).

The audit uses tagged source, not the moving main branch. Notes from earlier
patches are interpreted in light of the final 4.0.6 implementation; not every
intermediate behavior survives to this target.

## Dependency alignment

The runtime dependency `effect` and the four directly consumed documentation
adapters (`@effect/ai-openrouter`, `@effect/ai-typesafe`, `@effect/platform-bun`,
and `@effect/platform-node-shared`) are pinned to **4.0.6** in `package.json`
and `bun.lock`. The explicit node-shared pin prevents Bun's transitive caret
range from selecting an adapter from a later release.

Older prerelease dependencies owned by `@opencode/plugin` remain in its isolated
dependency graph; they are not this repository's supported application baseline.
No blanket package override is applied. Companion integrations shown in skills
are reviewed against the same tagged release without making every provider or
database adapter a plugin runtime dependency.

## Complete audit inventory

The review covers all **54 skill directories**, all **45 pattern definitions**,
and all **four guidance documents**. The table accounts for every skill directory
(`effect-` prefix omitted). Unchanged contracts are retained without cosmetic
rewrites; coverage does not imply every file needed an edit.

| Skill directories | Review focus |
| --- | --- |
| schema-v4, schema-composition, domain-modeling, domain-predicates, pattern-matching, optics, typeclass-design, graph, config, cli | Schema parsing, equivalence, tagged unions, representations, transformations, configuration failures and defaults, CLI parsing, terminal capabilities, graph algorithms, and stability. |
| cache, batching, layer-design, scope, service-implementation, context-witness, managed-runtime, incremental-migration, fiber, parallelization, concurrency-testing, pubsub-event-bus, stream, scheduling, error-handling | Abandoned/reentrant lookups, memoization identity, mixed causes, ownership and finalization, stream completion, concurrency and scheduling contracts. |
| http-api, http-client, http-server, rpc-api, rpc-client, rpc-server, rpc-cluster, sql, workflow, socket | HTTP framing, proxy trust, streaming requests, transport liveness, transaction outcomes, persistence compatibility, workflow replay, network and UDP APIs. |
| ai-chat, ai-decision-model, ai-language-model, ai-prompt, ai-provider, ai-streaming, ai-tool, mcp-server | Decision definitions and settled answers, image support, tool validation, provider errors, prompt histories, telemetry, MCP protocols and client/server lifetimes. |
| atom-rpc, atom-state, react-composition, observability, wide-events, testing, filesystem, path, platform-abstraction, platform-layers, command-executor | Reactive refresh/hydration, exporter semantics, TestClock/TestCrypto, filesystem metadata and symlinks, UUID functions, paths, process output, platform layers, and test doubles. |

The active guidance files are `guidance/effect-first-development.md` and
`guidance/progressive-disclosure-guidance.md`. The conceptual essays
`guidance/post__effect-and-the-near-inexpressible-majesty-of-layers.md` and
`guidance/post__parse-dont-validate.md` are also reviewed; illustrative bad code
and historical explanations are not mistaken for current API prescriptions.

Pattern review includes detector metadata, positive and negative examples,
recommended skills, and the matching one-to-one test inventory. The detector
catalog remains 45 checks; no broad new detector is added merely to enforce
release-specific prose. Runtime adapters and the generated Claude bundle are
included in integration verification.

### Source evidence

Each audit group checked the exact tag, its 4.0.0 → 4.0.6 source diff, and every
intervening relevant package changelog. Paths below are relative to the tagged
upstream repository, principally `packages/effect/src/`:

- **Modeling/configuration:** `Schema`, `SchemaGetter`, `SchemaTransformation`,
  `Match`, `Equivalence`, `Order`, `Optic`, `Graph`, `Config`, `ConfigProvider`,
  and `cli/`. Examples include #9245/#9318/#9409 (Schema), #9621 (Config),
  #9088/#9098 (Match), #9721 (Equivalence), and #9666 (CLI).
- **Concurrency/lifecycle:** `Cache`, `ScopedCache`, `RcMap`, `RequestResolver`,
  `Layer`, `Scope`, `Pool`, `ManagedRuntime`, `FiberHandle`, `FiberMap`, `PubSub`,
  `Stream`, `Schedule`, `Cause`, `Exit`, and `internal/effect`. Key fixes include
  #8719/#8837 (abandonment), #9634 (composition memoization), #9334/#9723
  (disposal), #9603 (replacement ownership), and #9516 (mixed causes).
- **HTTP/RPC/persistence:** `http/`, `http-api/`, `rpc/`, `cluster/`, `eventlog/`,
  `sql/`, `reactivity/`, `workflow/`, PostgreSQL, and matching platform/SQL
  adapters. Review covered wire/storage compatibility and transaction cleanup,
  not only exported signatures.
- **AI/MCP:** `ai/{Decision,DecisionModel,LanguageModel,Response,Chat,Prompt,Tool,Toolkit,AiError,Telemetry,McpServer,McpSchema,McpClient}`,
  `packages/effect/MCP.md`, and matching provider adapters. Examples include
  #9124 (structured descriptions), #9422 (metadata), #9437 (settled outcomes),
  #9602 (attachment persistence), and #9674 (toolkit-free response schemas).
- **Platform/reactivity/telemetry/testing:** filesystem/path/crypto services,
  `reactivity/`, platform adapters, telemetry exporters, and
  `packages/vitest/src/`. Examples include #9615 (filesystem), #9522/#9607
  (atoms), #9572 (telemetry), #9238/#9487 (process/socket behavior), and
  #9675/#9384 (testing).
- **Patterns/guidance:** all detector frontmatter and examples, package exports,
  stability annotations, and the source contracts above. All 45 detector
  definitions retain their matching metadata and existing one-to-one fixtures.

An independent read-only review rechecked parent-owned dependency, release-note,
audit, test, and generated-bundle changes and reported no findings.

## Compatibility-sensitive changes

### Error recovery is cause-sensitive

In the final 4.0.6 implementation, typed-error handlers do not recover causes
containing defects; typed failures in such a cause are converted to defects.
**A typed failure combined with interruption but without a defect can still be
recovered**, potentially discarding that interruption. Do not extrapolate an
earlier patch's “preserve every interruption” wording to every typed handler.
Inspect the whole `Cause` when policy depends on all reasons. APIs such as
Config, Arbitrary, and retry have their own cause-handling contracts; consult
their specific implementations rather than treating one rule as universal.

### Shared construction and resource lifetime

Composed layers are memoized by identity, including compositions that contain
fresh dependencies. Reusing one composed layer can therefore share its nested
fresh resource. Use a fresh boundary around the composition when independent
construction is intended, and keep owner scopes explicit.

Cache interruption is abandonment, not a reusable cached result. Shared work
survives while callers remain interested; when all waiters abandon it, a new
caller need not wait for its finalization. Reentrancy and finalizer failure fixes
do not remove the need to scope acquired resources and classify expected errors.

### Custom implementations and platform values

- Call `Crypto.randomUUIDv4()` and `Crypto.randomUUIDv7()`; they are functions,
  not Effect-valued properties. `{ format: "bytes" }` selects a 16-byte result.
- Filesystem metadata counters use `bigint`; keep exact counts and use `ByteSize`
  for byte sizes instead of coercing them to lossy numbers.
- Custom `FileSystem` implementations need `lstat`; custom HTTP responses need
  `HttpClientResponse.upgrade`; custom SQL clients need `SqlClient.driver`.
- Check platform support before relying on `noFollow`, positional file reads,
  TLSA DNS records, or platform-specific networking behavior.

### Network boundaries and stored state

Forwarded headers are not automatically trusted identity. Configure the HTTP
proxy policy explicitly at a trusted deployment boundary. Review body replay,
compression, decompression, request-size limits, and streaming request contracts
instead of adding blanket retry policies.

Event-log storage and wire changes require an explicit migration/compatibility
decision for persisted journals and remotes. ACK changes prohibit mixed-version
replication peers; encrypted batch migration also requires fresh encrypted server
storage. Cluster/workflow fixes affect replay, transaction completion,
termination, and durable reply ordering. Earlier suspended workflow scopes close
with `Exit.void`, not the final run's outcome; abandonment skips durable
finalizers and compensations. A clean typecheck does not establish compatibility
with an existing deployment's data.

SQL COMMIT failures remain typed when cleanup succeeds; combined COMMIT/cleanup
failures surface as defects. Transaction-buffered `afterCommit` callbacks run only
after the outermost successful commit. SQL resolver batches are separated by
transaction connection, not arbitrary caller services: execution and result
decoding use the first entry's context. Tenant/auth context alone is not a
batching isolation boundary.

### AI, telemetry, and schema contracts

Decision providers and manual service implementations must follow the current
decision and settled-answer contracts. Image support is opt-in. Exhaustive AI
error handling must include `AiError.InvalidResponseError`; malformed provider
responses are distinct from model-output validation failures.

AI, HTTP, RPC, SQL, logs, traces, and metrics use revised OpenTelemetry names
and status conventions. Update dashboards and queries along with source code;
header/body capture remains a deliberate sensitive-data decision.

Schema fixes affect equivalence, JSON Schema conversion, repeated decodes,
defaults, and tagged union metadata. The compile-time tag-uniqueness restriction
introduced in 4.0.5 is removed in 4.0.6; do not teach it as a current requirement.

## New surfaces and stability

The interval adds networking/DNS/UDP, GraphQL and its generator, MCP client,
streaming JSON arrays, XML and archive codecs, semantic versions/ranges,
TextDiff, user directories, and deterministic crypto testing. Relevant existing
skills point to additions within their scope; the release does not turn this
repository into an exhaustive API reference or add one skill per new module.

Inspect each export's stability annotation: **stable** follows semver,
**unstable** can break in minor releases, and **experimental** can break even in
patch releases. For example, `SemVer` and `JsonArray` are unstable, while
`TextDiff`, GraphQL, and MCP client are experimental at this tag. Source paths
without an `unstable` segment do not imply stable contracts. Private/internal
paths are not application imports, even when a source file can be located.

TypeScript 5.9 or newer remains required. `@effect/vitest` and `@effect/doctest`
target Vitest 5, while this repository's plain Vitest runner does not use those
adapters. React Atom integrations still require React 19; their scheduler peer
range now permits versions below 0.29. Runtime-specific requirements remain
the responsibility of the consuming application.

## Verification scope

The documentation compiler checks core Effect entrypoints and named imports in
every TypeScript/TSX fence under skills, guidance, and patterns, and fully
typechecks explicitly marked standalone examples against installed 4.0.6.
Unmarked fragments can depend on surrounding declarations or intentionally
demonstrate rejected code; import validation is not full compilation of those
fragments. External providers, databases, browsers, and OS transports are
source-reviewed, not claimed as live-tested integrations.

`test/effect-release.test.ts` checks direct dependency pins and baseline links,
the exact package/version inventory, and independently generated SHA-256 values
for all 195 upstream section bodies. It also checks the six retained official
bodies against their corresponding core release notes. Tests need neither a
network connection nor an upstream source checkout.

Final integration on 2026-10-24:

- `bun run build`: passed; generated Claude bundle refreshed.
- `bun run check`: passed formatting, lint, and project typechecking.
- `bun run test`: **925 tests passed across 55 files**.
- Documentation compilation: **286 marked standalone examples and 1,217
  isolated core Effect import declarations**, across 105 Markdown documents;
  zero TypeScript diagnostics.
- `claude plugin validate . --strict`: passed, with only the missing optional
  plugin-icon warning.
- `git diff --check`: passed. Final current-guidance/pattern scans found no
  stale baseline references or UUID-property calls; historical version mentions
  in skills remain explanatory, not current prescriptions.

Focused deterministic checks covered cache/lifecycle behavior, mixed causes,
schema/configuration/CLI contracts, AI response and attachment processing, paths,
filesystem values, crypto, and metric capture. These are not live integration
tests. React and `@effect/vitest` examples requiring uninstalled companion packages
remain source-reviewed and unmarked; the adapter requires Vitest 5 while this
repository's infrastructure runner remains Vitest 3. No compiler gate was relaxed
to accept those examples. Interactive terminals, generated shell completions,
live providers, external databases, and distributed transports were not exercised.
