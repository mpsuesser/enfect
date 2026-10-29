---
action: context
tool: (edit|write)
event: after
name: avoid-mutable-state
description: Prefer Ref over let bindings for mutable state in Effect services
glob: '**/*.ts'
detector: ast
rule:
    pattern: let $$$DECLS
    inside:
        pattern: Layer.effect($$$)
        stopBy: end
level: info
---

# Prefer `Ref` Over `let` for Mutable State

```haskell
-- Transformation
let x = v; x = v'       :: mutable binding   -- not fiber-safe
Ref.make(v) >>= Ref.set :: Ref a -> Effect a -- fiber-safe, composable
```

```haskell
-- Pattern
bad :: Mutable let
bad = let counter = 0
bad = counter += 1

good :: Ref
good = const counterRef = yield* Ref.make(0)
good = yield* Ref.update(counterRef, (n) => n + 1)
```

Shared mutable `let` bindings in Effect services are suspicious because they can hide fiber-visible state and lifecycle behavior. Prefer `Ref`, `SynchronizedRef`, or `Effect.cached` for state that is read or written through your service API.

## When `let` Is Acceptable

- Loop counters in non-effectful pure functions
- Local temporaries in synchronous helpers
- Destructuring reassignment in narrow scopes

The `info` level reflects that `let` has legitimate uses — this pattern surfaces it for review, not as an error.

## Scoped Mutable Collections Can Be Fine

Small mutable collections inside `Layer.effect` or `InstanceState.make` are acceptable when all of the following are true:

- the collection is private to the service implementation
- its lifetime is tied to the layer or instance scope
- callers only observe it through effectful service methods
- cleanup/finalization is handled explicitly

Examples include private `Map` values for registries, PubSub channel lookup tables, or runner maps inside a dedicated coordinator service.

## When `Effect.cached` Replaces `let`

Use `Effect.cached` for fields whose contract is result memoization or sharing an in-flight lookup (`task?: Promise<T>`, `result?: T`), rather than rebinding a mutable cache:

```ts
// Before: mutable dedup tracking
let task: Promise<Result> | undefined;
const getResult = () => (task ??= computeExpensive());

// After: Effect.cached inside service make block
const cachedResult = yield* Effect.cached(computeExpensive());
```

For invalidatable caches, use `Effect.cachedInvalidateWithTTL(effect, Duration.infinity)` instead of rebinding a `let`.

Concurrent callers share the pending computation and completed successes or failures are cached. If all waiters leave, the unfinished run is interrupted; interruptions are never cached, so later access starts again. Invalidation detaches an existing run without cancelling its waiters, and prevents that run from overwriting a replacement.

A cache is not a background-job coordinator or a resource scope. Work that must outlive its waiters needs an explicit owner; use scoped fiber supervision for jobs and scoped caches or `RcMap` for resources with finalizers, rather than mechanically replacing every `Fiber` field with `Effect.cached`.
