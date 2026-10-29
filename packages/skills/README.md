# @enfect/skills

Effect skills bundled by the Enfect agent plugins. Each directory holds a
`SKILL.md` that the agent loads when a task needs that API.
[`@enfect/claude`](../../plugins/claude) and
[`@enfect/opencode`](../../plugins/opencode) copy them into their packages when
they build.

## Skills (54)

### Modeling and core APIs

- [`effect-error-handling`](effect-error-handling/SKILL.md): Model typed failures, inspect causes, report errors, and recover precisely.
- [`effect-schema-v4`](effect-schema-v4/SKILL.md): Use current Effect Schema v4 APIs and migrate away from v3 patterns.
- [`effect-schema-composition`](effect-schema-composition/SKILL.md): Compose schemas with transformations, filters, validation, and `Schema.decodeTo`.
- [`effect-domain-modeling`](effect-domain-modeling/SKILL.md): Build schema-backed domain entities, ADTs, guards, orders, and matchers.
- [`effect-domain-predicates`](effect-domain-predicates/SKILL.md): Derive reusable predicates and orderings for domain types.
- [`effect-pattern-matching`](effect-pattern-matching/SKILL.md): Match discriminated unions and Effect results exhaustively.
- [`effect-optics`](effect-optics/SKILL.md): Read and immutably update nested data with lenses, prisms, and traversals.
- [`effect-typeclass-design`](effect-typeclass-design/SKILL.md): Design typeclasses with curried signatures and dual data-first/data-last APIs.
- [`effect-graph`](effect-graph/SKILL.md): Construct, traverse, analyze, and render immutable graphs.

### Services, lifecycle, and concurrency

- [`effect-context-witness`](effect-context-witness/SKILL.md): Choose between service witnesses and capability-based dependency injection.
- [`effect-service-implementation`](effect-service-implementation/SKILL.md): Implement focused Effect services without monolithic interfaces.
- [`effect-layer-design`](effect-layer-design/SKILL.md): Design and compose Layers with explicit dependency wiring.
- [`effect-scope`](effect-scope/SKILL.md): Manage resource acquisition, finalization, and scope ownership safely.
- [`effect-fiber`](effect-fiber/SKILL.md): Fork, supervise, interrupt, and coordinate fibers and keyed fiber collections.
- [`effect-parallelization`](effect-parallelization/SKILL.md): Run, race, gate, and concurrency-limit Effect computations.
- [`effect-scheduling`](effect-scheduling/SKILL.md): Define retries, repeats, polling, backoff, pacing, and timeouts with `Schedule`.
- [`effect-cache`](effect-cache/SKILL.md): Cache effectful lookups with TTL, invalidation, deduplication, and scoped entries.
- [`effect-batching`](effect-batching/SKILL.md): Batch and deduplicate requests with `Request`, `RequestResolver`, and `SqlResolver`.
- [`effect-stream`](effect-stream/SKILL.md): Build resource-safe streaming pipelines with transformations, concurrency, and codecs.
- [`effect-pubsub-event-bus`](effect-pubsub-event-bus/SKILL.md): Implement typed publish/subscribe event buses with PubSub and Stream.
- [`effect-workflow`](effect-workflow/SKILL.md): Build durable workflows, activities, queues, clocks, and compensating transactions.

### Platform and runtime integration

- [`effect-platform-abstraction`](effect-platform-abstraction/SKILL.md): Keep filesystem, process, HTTP, crypto, and terminal code portable.
- [`effect-platform-layers`](effect-platform-layers/SKILL.md): Provide platform implementations cleanly at application boundaries.
- [`effect-managed-runtime`](effect-managed-runtime/SKILL.md): Run Effect services inside frameworks and runtimes Effect does not own.
- [`effect-filesystem`](effect-filesystem/SKILL.md): Perform platform-independent file I/O through Effect's `FileSystem`.
- [`effect-path`](effect-path/SKILL.md): Join, resolve, normalize, and convert paths through Effect's `Path` service.
- [`effect-command-executor`](effect-command-executor/SKILL.md): Spawn, stream, pipe, and safely manage child processes.
- [`effect-socket`](effect-socket/SKILL.md): Build TCP, Unix-domain, and WebSocket clients, servers, and framed transports.
- [`effect-cli`](effect-cli/SKILL.md): Build type-safe command-line interfaces with arguments, options, commands, and Layers.

### HTTP, RPC, and persistence

- [`effect-http-api`](effect-http-api/SKILL.md): Define typed HTTP APIs with schemas, security, handlers, clients, and OpenAPI.
- [`effect-http-client`](effect-http-client/SKILL.md): Make typed outgoing HTTP requests with decoding, retries, streaming, and test transports.
- [`effect-http-server`](effect-http-server/SKILL.md): Serve routes, middleware, uploads, static files, streams, and WebSockets.
- [`effect-rpc-api`](effect-rpc-api/SKILL.md): Define shared typed RPC contracts, middleware, errors, and streaming procedures.
- [`effect-rpc-client`](effect-rpc-client/SKILL.md): Consume RPC contracts over HTTP, WebSocket, TCP, workers, or in-memory transports.
- [`effect-rpc-server`](effect-rpc-server/SKILL.md): Implement and serve RPC handlers with middleware, streaming, and interruption support.
- [`effect-rpc-cluster`](effect-rpc-cluster/SKILL.md): Build clustered RPC entities, sharding, singletons, cron jobs, and workflows.
- [`effect-sql`](effect-sql/SKILL.md): Query databases and build schemas, models, resolvers, repositories, and migrations.

### AI and MCP

- [`effect-ai-language-model`](effect-ai-language-model/SKILL.md): Generate text, structured output, streams, and tool calls through `LanguageModel`.
- [`effect-ai-decision-model`](effect-ai-decision-model/SKILL.md): Use System One models such as Jev through typed decisions, provider layers, and validated answers; includes an [OpenRouter adapter reference](effect-ai-decision-model/openrouter.md).
- [`effect-ai-prompt`](effect-ai-prompt/SKILL.md): Construct and compose prompts from messages and multimodal parts.
- [`effect-ai-tool`](effect-ai-tool/SKILL.md): Define type-safe AI tools, toolkits, schemas, and handlers.
- [`effect-ai-provider`](effect-ai-provider/SKILL.md): Configure provider Layers, models, runtime overrides, and fallback execution plans.
- [`effect-ai-streaming`](effect-ai-streaming/SKILL.md): Consume AI start/delta/end streams with safe accumulation and history updates.
- [`effect-ai-chat`](effect-ai-chat/SKILL.md): Build persistent multi-turn chats and agentic tool-calling loops.
- [`effect-mcp-server`](effect-mcp-server/SKILL.md): Expose MCP tools, resources, and prompts over stdio or HTTP.

### Frontend state and composition

- [`effect-atom-state`](effect-atom-state/SKILL.md): Manage reactive React state with Effect Atom.
- [`effect-atom-rpc`](effect-atom-rpc/SKILL.md): Build cached, invalidating, SSR-aware RPC atoms for React clients.
- [`effect-react-composition`](effect-react-composition/SKILL.md): Compose React components around explicit Effect Atom state and behavior.

### Configuration, operations, and testing

- [`effect-config`](effect-config/SKILL.md): Load, validate, compose, and test typed configuration sources.
- [`effect-observability`](effect-observability/SKILL.md): Add structured logs, traces, metrics, and OTLP or Prometheus export.
- [`effect-wide-events`](effect-wide-events/SKILL.md): Design information-rich canonical log events for observability.
- [`effect-testing`](effect-testing/SKILL.md): Test Effect programs, services, Layers, time, errors, and properties.
- [`effect-concurrency-testing`](effect-concurrency-testing/SKILL.md): Test fibers, PubSub, Deferred, Latch, SubscriptionRef, and concurrent streams.
- [`effect-incremental-migration`](effect-incremental-migration/SKILL.md): Migrate Promise-based modules incrementally while preserving required compatibility.
