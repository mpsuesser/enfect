import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { Rule, RuleContext, Visitor } from 'effect-oxlint';

import type { ESTree } from '@oxlint/plugins';

type RuntimeFunction = ESTree.ArrowFunctionExpression | ESTree.Function;

class TypeofOptions extends Schema.Class<TypeofOptions>('TypeofOptions')({
	allowInTypeGuards: Schema.Boolean.pipe(
		Schema.withDecodingDefaultKey(Effect.succeed(false))
	)
}) {}

function isRuntimeFunction(node: ESTree.Node): node is RuntimeFunction {
	return (
		node.type === 'ArrowFunctionExpression' ||
		node.type === 'FunctionDeclaration' ||
		node.type === 'FunctionExpression'
	);
}

function isInsideTypeGuard(node: ESTree.Node): boolean {
	let current: ESTree.Node | null = node.parent;
	while (current !== null && current.type !== 'Program') {
		if (isRuntimeFunction(current)) {
			return (
				current.returnType?.typeAnnotation.type === 'TSTypePredicate'
			);
		}
		current = current.parent;
	}
	return false;
}

/** Return whether typeof safely probes for the existence of a possibly absent binding. */
function isExistenceProbe(node: ESTree.UnaryExpression): boolean {
	const parent = node.parent;
	if (parent.type !== 'BinaryExpression') return false;
	if (!['===', '!==', '==', '!='].includes(parent.operator)) return false;
	const other = parent.left === node ? parent.right : parent.left;
	return other.type === 'Literal' && other.value === 'undefined';
}

/** Disallow runtime typeof checks that narrow unparsed values instead of decoding them. */
export const noRuntimeTypeofRule = Rule.define({
	name: 'no-runtime-typeof',
	options: TypeofOptions.pipe(Schema.withDecodingDefault(Effect.succeed({}))),
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow runtime typeof checks; external values must be decoded into meaningful types at their I/O boundary.'
		},
		messages: {
			runtimeTypeof:
				'A `typeof` check narrows a representation without establishing its contract. Parse input at its I/O boundary, then branch on the domain value.'
		},
		schema: [
			{
				type: 'object',
				properties: {
					allowInTypeGuards: { type: 'boolean' }
				},
				additionalProperties: false
			}
		],
		defaultOptions: [{ allowInTypeGuards: false }]
	},
	create: function* ({ allowInTypeGuards }) {
		const context = yield* RuleContext;
		return Visitor.on(
			'UnaryExpression',
			Effect.fn('no-runtime-typeof.UnaryExpression')(function* (
				node: ESTree.UnaryExpression
			) {
				if (
					node.operator === 'typeof' &&
					!isExistenceProbe(node) &&
					(!allowInTypeGuards || !isInsideTypeGuard(node))
				) {
					yield* context.report({ node, messageId: 'runtimeTypeof' });
				}
			})
		);
	}
});

export default noRuntimeTypeofRule;
