import * as Effect from 'effect/Effect';
import { Rule, RuleContext, Visitor } from 'effect-oxlint';
import type { ESTree } from '@oxlint/plugins';

function unwrapParentheses(node: ESTree.Expression): ESTree.Expression {
	let current = node;
	while (current.type === 'ParenthesizedExpression') {
		current = current.expression;
	}
	return current;
}

function isEmptyObjectExpression(node: ESTree.Expression): boolean {
	return node.type === 'ObjectExpression' && node.properties.length === 0;
}

function isConditionalEmptyObjectSpread(node: ESTree.Expression): boolean {
	const conditional = unwrapParentheses(node);
	return (
		conditional.type === 'ConditionalExpression' &&
		(isEmptyObjectExpression(conditional.consequent) ||
			isEmptyObjectExpression(conditional.alternate))
	);
}

/** Ban conditional empty-object spreads without changing their omission semantics. */
export const noConditionalEmptyObjectSpreadRule = Rule.define({
	name: 'no-conditional-empty-object-spread',
	meta: {
		type: 'suggestion',
		docs: {
			description:
				'Disallow object spreads that conditionally spread an empty object to omit fields.'
		},
		messages: {
			avoid: 'This conditional spread hides property omission behind an empty object. Build the object in separate statements and add the property only when present.'
		}
	},
	create: function* () {
		const context = yield* RuleContext;
		return Visitor.on(
			'SpreadElement',
			Effect.fn('no-conditional-empty-object-spread.SpreadElement')(
				function* (node: ESTree.SpreadElement) {
					if (node.parent.type !== 'ObjectExpression') return;

					if (isConditionalEmptyObjectSpread(node.argument)) {
						yield* context.report({ node, messageId: 'avoid' });
					}
				}
			)
		);
	}
});

export default noConditionalEmptyObjectSpreadRule;
