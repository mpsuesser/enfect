import type { CreateRule } from '@oxlint/plugins';
import type { ESTree } from 'effect-oxlint';

import * as Bool from 'effect/Boolean';
import * as Effect from 'effect/Effect';
import * as HashSet from 'effect/HashSet';

import { Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint';

const SUSPECT_OPS = HashSet.make(
	'===',
	'!==',
	'==',
	'!=',
	'>',
	'<',
	'>=',
	'<='
);

const isLengthAccess = (
	n: ESTree.Expression | ESTree.PrivateIdentifier
): boolean =>
	n.type === 'MemberExpression' &&
	n.property.type === 'Identifier' &&
	n.property.name === 'length';

const isZero = (n: ESTree.Expression | ESTree.PrivateIdentifier): boolean =>
	n.type === 'Literal' && n.value === 0;

const lengthAgainstZero = (bin: ESTree.BinaryExpression): boolean => {
	const leftLen = isLengthAccess(bin.left);
	const rightLen = isLengthAccess(bin.right);
	const leftZero = isZero(bin.left);
	const rightZero = isZero(bin.right);
	return (leftLen && rightZero) || (leftZero && rightLen);
};

const rule: CreateRule = Rule.define({
	name: 'no-length-comparison',
	meta: Rule.meta({
		type: 'suggestion',
		description:
			'Disallow `.length === 0` / `.length > 0` — use `Arr.isReadonlyArrayEmpty`, `Arr.isReadonlyArrayNonEmpty`, `Str.isEmpty`, `Str.isNonEmpty`, or `Arr.match` (EF)'
	}),
	create: function* () {
		const ctx = yield* RuleContext;
		return Visitor.on('BinaryExpression', (node) =>
			Bool.match(
				HashSet.has(SUSPECT_OPS, node.operator) &&
					lengthAgainstZero(node),
				{
					onFalse: () => Effect.void,
					onTrue: () =>
						ctx.report(
							Diagnostic.make({
								node,
								message:
									'Avoid `.length` comparisons against `0`. Use `Arr.isReadonlyArrayEmpty(xs)` / `Arr.isReadonlyArrayNonEmpty(xs)` for arrays, `Str.isEmpty(s)` / `Str.isNonEmpty(s)` for strings, or `Arr.match({ onEmpty, onNonEmpty })` for branching. (EF)'
							})
						)
				}
			)
		);
	}
});

export default rule;
