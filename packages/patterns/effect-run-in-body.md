---
action: context
tool: (edit|write)
event: after
name: effect-run-in-body
description: Effect.runSync/runPromise/runFork should only be at entry points
glob: '**/*.{ts,tsx}'
detector: ast
pattern:
    - Effect.runSync
    - Effect.runPromise
    - Effect.runFork
level: warning
suggestSkills:
    - effect-managed-runtime
---

# Effect.runSync / runPromise / runFork Only at Entry Points

```haskell
-- Transformation
runSync    :: Effect a E R → a         -- escapes Effect, loses composition
runPromise :: Effect a E R → Promise a -- same problem
runFork    :: Effect a E R → Fiber a   -- same problem, async variant

-- Instead: compose until boundary
compose :: Effect a E R → Effect b E R → Effect (a, b) E R
yield*  :: Effect a E R → a           -- inside Effect.gen only
```

```haskell
-- Pattern
bad :: Effect () R
bad = do
  result ← pure $ Effect.runSync someEffect   -- breaks composition!
  doSomething result
  -- can't retry, race, timeout the inner effect

good :: Effect () R
good = do
  result ← someEffect                         -- still composable
  doSomething result
  -- can wrap entire program with retry, race, timeout

-- Entry points only
main :: IO ()
main = BunRuntime.runMain program          -- ✓ application boundary (@effect/platform-bun)

handler :: Request → IO Response
handler req = Effect.runPromise (handle req)  -- ✓ API boundary

test :: Spec
test = Effect.runPromise (testProgram)        -- ✓ test boundary
```

Running effects mid-logic breaks composition. Keep effects as values until entry points (main, handlers, tests).

`Effect.runFork` is just as much a runtime escape as `runSync` / `runPromise`: it materialises a root `Fiber` instead of composing with an Effect-native fork. Prefer `Effect.forkChild` for parent-owned work (interrupted when the parent completes), or `forkScoped` / `forkIn` for scope-owned work. `forkDetach` stays inside Effect but deliberately escapes structured lifetime management; it needs explicit shutdown and failure observation. Reserve runtime runners for the entrypoint / test harness boundary.
