import { createHash } from "node:crypto"
import { readdir, readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"

const baseline = "4.0.6"
const releases = ["4.0.6", "4.0.5", "4.0.4", "4.0.3", "4.0.2", "4.0.1"]
const normalize = (text: string) => text.split("\n").map((line) => line.trimEnd()).join("\n").trim()

// SHA-256 of the complete included release sections from each tagged changelog,
// normalized only for trailing whitespace and section-separating blank lines.
// Generated independently from git show at effect@4.0.6, commit
// 3b28bf686bf26e9700edd39c025aff2744dc5303; tests require no network/source checkout.
const upstreamDigests: Readonly<Record<string, string>> = {
  "packages/ai/anthropic/CHANGELOG.md":
    "16f4beb35252ce0de2f2e7c03c6a7e6e49a81d7538ab87f640409b70a146928a",
  "packages/ai/cloudflare/CHANGELOG.md":
    "5a6c48d60504c671786dc6f9a57827156408232cac130c751d60cd7000061462",
  "packages/ai/openai-compat/CHANGELOG.md":
    "1acfa33347be82b8e23d2ecf0d13de68f51a4ad1b28ae49a6b5c80363a90b547",
  "packages/ai/openai/CHANGELOG.md":
    "901d3b1b2f7b53db619f6b2761774edf4cd69bf407a5ab9237366144009d80ea",
  "packages/ai/openrouter/CHANGELOG.md":
    "a72bab5574cdac2ed951863d2a33fa3e934ed09944ae1645cbd3652b75d0d3e5",
  "packages/ai/typesafe/CHANGELOG.md":
    "787a20226008f9d602f5719712f0b0abe165cd79f5925d60d6f99c8b638204a2",
  "packages/atom/react/CHANGELOG.md":
    "bdacccd09295da392b0dfd3d3ec79a555ae03d28a267a6d5b4e4047b7de52ee6",
  "packages/atom/solid/CHANGELOG.md":
    "b1d9edc3ce6bbc15c4104f09c4417014caccb09272647498b4a3bd4501f3ec29",
  "packages/atom/vue/CHANGELOG.md":
    "1e736c9468233b4b8c242482282c04fc279f3759aeb70f6d64de9bc89d6c71de",
  "packages/effect/CHANGELOG.md":
    "5bacc37e6262bf9dd15b2db0909f81218473f095d3bf2a8a096d980c46a02f48",
  "packages/opentelemetry/CHANGELOG.md":
    "e7d9eaad1c1795c49b764a0fe20cb1dfa09614b83e857c06cd0cbd2aca099bce",
  "packages/platform/browser/CHANGELOG.md":
    "b3e427b54e41ae790beaf45dedadd8dc5dcb1fbf2057869852854f51d8a59714",
  "packages/platform/bun/CHANGELOG.md":
    "2f26a4ddb221abfdba679e9751fc5c6641afd5b789c4df8d8dad74425051554e",
  "packages/platform/deno/CHANGELOG.md":
    "55138791f4da6b82f8701760bf358dee1d2bfdfb5a8fc464ad0dd4aa2f7c1fe6",
  "packages/platform/node-shared/CHANGELOG.md":
    "7dce7208d3a49bf7e1ec54c2cbdb79791fe73d0b6e0630a1a5f0e5f972f50d18",
  "packages/platform/node/CHANGELOG.md":
    "fe06a338ce2fde49c57268f2cc1dc8cf0ff793b0c76b9d17ce51d46866f713d4",
  "packages/sql/clickhouse/CHANGELOG.md":
    "db2003fa785dadcad57bd551caebb0e3ab1597911e9f16281bba31bd203218ab",
  "packages/sql/d1/CHANGELOG.md":
    "082cc8cd52648dcbe6cad279409ed8d2ffded4c4f31b9daa929735d0afc6dd3a",
  "packages/sql/libsql/CHANGELOG.md":
    "bee2f6276c1dbac53028ca637051c7a81ba0f4b895d994ef2ebfa21f0878ca5e",
  "packages/sql/mssql/CHANGELOG.md":
    "95990c351b9c683d2e5973f62d77d9345899554270055b3169da79836d45752f",
  "packages/sql/mysql2/CHANGELOG.md":
    "5eae705f4fb773174267414b11219f17ac7db12dbfa9c3e34dc1e3108edb06d3",
  "packages/sql/pg/CHANGELOG.md":
    "fc585c8c7edfddb0b7664fe81f6e1e65b4ce9e798e4ba545637648315dc4737a",
  "packages/sql/pglite/CHANGELOG.md":
    "5e2c5008c1c0b5778a31eb4b863ea76d83a93f21d2e26e1db0e398750020c66b",
  "packages/sql/sqlite-bun/CHANGELOG.md":
    "e11e8bf930034fcfce1bb3ef427b9d2fdef237c7199f8b6f226c006628e039c2",
  "packages/sql/sqlite-do/CHANGELOG.md":
    "23a8fddc9ac3168abe5fc318c125b4596c7c3ce826abbfea7822d6eb424b960a",
  "packages/sql/sqlite-node/CHANGELOG.md":
    "f805ba5198e564e0636e7362857899413ad871931403321d1f3e63a4ec025422",
  "packages/sql/sqlite-react-native/CHANGELOG.md":
    "6654f595aa44d87c782f708e392980b20f819c23c6586945735f67ed52573608",
  "packages/sql/sqlite-wasm/CHANGELOG.md":
    "80fe90890215870a164e298b25c2aee50b4799bd2b73df4f72304f561545cd55",
  "packages/tools/docgen/CHANGELOG.md":
    "35641a8e3a4b23cfef68b41796cd13ce36ea055619dc36311ab428c65340bb77",
  "packages/tools/doctest/CHANGELOG.md":
    "ac2274fb91f0eac6db1cb0139c0d97b86059654787fb8b7a790797e6816b0503",
  "packages/tools/graphql-generator/CHANGELOG.md":
    "045db139b484377ea4b912701d5c4074ea525ae04ecf058b39bc57343aba8a04",
  "packages/tools/openapi-generator/CHANGELOG.md":
    "c17a132f3a86c73b92f51930a9e2b014c2fef6dda31a998ed20f8c1429efd318",
  "packages/vitest/CHANGELOG.md": "371a61a725ed581034cfa56f3eab32b31bbd4a8eaea27d2a8c2ecbc84aa13f04"
}

describe("Effect release alignment", () => {
  it("accounts for every bundled skill in the migration audit", async () => {
    const audit = await readFile(new URL("../docs/effect-4.0.6.md", import.meta.url), "utf8")
    const entries = await readdir(new URL("../skills/", import.meta.url), { withFileTypes: true })
    const directories = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)
    const inventory = [...audit.matchAll(/^\| ([a-z][a-z0-9-, ]+) \|/gm)]
      .flatMap((match) => (match[1] ?? "").split(", ").map((name) => `effect-${name}`))
    expect(directories).toHaveLength(54)
    expect(inventory).toHaveLength(directories.length)
    expect(inventory).toEqual(expect.arrayContaining(directories))
  })

  it("pins every directly consumed Effect package to the documented baseline", async () => {
    const packageJson = await readFile(new URL("../package.json", import.meta.url), "utf8")
    const dependencies = [...packageJson.matchAll(/"(effect|@effect\/[^"]+)": "([^"]+)"/g)]
    expect(dependencies).toHaveLength(5)
    dependencies.forEach((match) =>
      expect({ package: match[1], version: match[2] }).toEqual({
        package: match[1],
        version: baseline
      })
    )
    for (
      const document of [
        "README.md",
        "guidance/effect-first-development.md",
        "guidance/progressive-disclosure-guidance.md"
      ]
    ) {
      const text = await readFile(new URL(`../${document}`, import.meta.url), "utf8")
      expect(text).toContain(baseline)
      expect(text).toContain(`docs/effect-${baseline}.md`)
    }
  })

  it("retains all 195 upstream sections without rewriting their contents", async () => {
    const text = await readFile(
      new URL("../docs/effect-4.0.6-changelog.md", import.meta.url),
      "utf8"
    )
    const packages = [
      ...text.matchAll(/^# (packages\/[^\n]+\/CHANGELOG\.md)\n([\s\S]*?)(?=^# |$(?![\s\S]))/gm)
    ]
    expect(packages.map((match) => match[1])).toEqual(Object.keys(upstreamDigests))
    let sectionCount = 0
    const coreSections = new Map<string, string>()
    for (const match of packages) {
      const path = match[1] ?? ""
      const body = match[2] ?? ""
      const sections = [...body.matchAll(/^## (4\.0\.\d+)\n([\s\S]*?)(?=^## |$(?![\s\S]))/gm)]
      expect(sections.map((section) => section[1])).toEqual(
        path.includes("graphql-generator") ? releases.slice(0, 3) : releases
      )
      const content = normalize(sections.map((section) => normalize(section[0])).join("\n\n"))
      expect({ path, digest: createHash("sha256").update(content).digest("hex") }).toEqual({
        path,
        digest: upstreamDigests[path]
      })
      sectionCount += sections.length
      if (path === "packages/effect/CHANGELOG.md") {
        sections.forEach((section) =>
          coreSections.set(section[1] ?? "", normalize(section[2] ?? ""))
        )
      }
    }
    expect(sectionCount).toBe(195)
    const official = [
      ...text.matchAll(
        /^# Official GitHub release: effect@(4\.0\.\d+)\n([\s\S]*?)(?=^# |$(?![\s\S]))/gm
      )
    ]
    expect(official.map((match) => match[1])).toEqual(releases)
    official.forEach((match) => {
      const body = match[2] ?? ""
      const notes = body.slice(body.indexOf("### Patch Changes"))
      expect(normalize(notes)).toBe(coreSections.get(match[1] ?? ""))
    })
  })
})
