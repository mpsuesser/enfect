# Anti-slop syntax analysis

These internal ESTree adapters were derived from
[`dmmulroy/anti-slop`](https://github.com/dmmulroy/anti-slop), revision
`e8c4880471b23ab7f216fba7b27d173a6ef07d4c`. The upstream MIT notice is
preserved in [`licenses/anti-slop.txt`](../../../licenses/anti-slop.txt).

The public rules live in `src/rules/` and use `effect-oxlint`'s `Rule.define`,
`RuleContext`, and `Visitor` combinators. Options are decoded with Effect Schema,
and reporting collections uses sequential `Effect.forEach` because Oxlint's
plugin boundary is synchronous.

These adapters deliberately retain Oxlint's nullable, identity-bearing AST and
scope contracts. Parent traversal and alias substitution operate on those
parser-owned objects without decoding or cloning the cyclic graph. Native
identity collections and iterative parent walks here are AST interoperability
exceptions, not patterns for application domain code. Dynamic child access is
restricted to Oxlint's visitor keys and its assertions carry `SAFETY` comments.

Environments are constructed per rule/file. No module-global AST cache is kept.
Analysis is syntactic and same-file; it is not a TypeScript type checker.
The upstream parser/scope regressions run under Vitest in `test/anti-slop/`;
SDK-level integration checks use `effect-oxlint/testing`.
