---
action: context
tool: (edit|write)
event: after
name: stream-large-files
description: Review whole-file reads when the path appears large or unbounded
glob: '**/*.{ts,tsx}'
detector: ast
rule:
    any:
        - pattern: fs.readFile($PATH)
        - pattern: fs.readFileString($PATH)
constraints:
    PATH:
        any:
            - regex: '(large|huge|dump|archive|dataset|backup|export|log|logs|jsonl|ndjson|csv)'
            - pattern: $DIR + $FILE
            - pattern: path.join($$$)
            - pattern: path.resolve($$$)
            - pattern: $FILES[$I]
            - pattern: $ITEM.path
level: info
suggestSkills:
    - effect-stream
---

# Consider Streaming Large Files

```haskell
-- Transformation
readFile       :: FilePath → Effect String FileSystem   -- entire file in memory
stream         :: FilePath → Stream Chunk FileSystem    -- incremental chunks

-- For large files
fs.stream path { chunkSize: 64 * 1024 }
  |> decodeText { encoding: "utf-8" }
  |> splitLines
  |> runForEach processLine             -- processLine returns an Effect
```

```haskell
-- Pattern
bad :: FilePath → Effect String FileSystem
bad path = readFileString path          -- OOM on gigabyte files

good :: FilePath → Effect () FileSystem
good path = pipe
  (fs.stream path { chunkSize: 65536 })
  $ Stream.decodeText { encoding: "utf-8" }
  $ Stream.splitLines
  $ Stream.runForEach processLine       -- executes each effectful handler

-- When to stream
shouldStream :: FileSize → Bool
shouldStream size
  | size > megabytes 100 = True         -- definitely stream
  | lineByLine needed    = True         -- stream for efficiency
  | otherwise            = False        -- readFile is fine
```

`readFile` loads entire file into memory. Use `fs.stream` for large files or line-by-line processing to avoid OOM errors.

Streaming bounds chunk buffering, not the size of a single line: `splitLines` retains an unfinished line, so unbounded records still need a size policy. Use `Stream.map` only for pure handlers; effectful handlers need `Stream.mapEffect` or a sink such as `Stream.runForEach`.
