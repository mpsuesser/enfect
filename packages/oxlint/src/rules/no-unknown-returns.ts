import * as Effect from 'effect/Effect';
import { Rule, RuleContext, Visitor } from 'effect-oxlint';

import type { ESTree } from '@oxlint/plugins';

import {
	createTypeAliasEnvironment,
	resolvedTypeMatches
} from '../internal/anti-slop/type-alias-resolution.ts';

type FunctionWithReturnType =
	| ESTree.ArrowFunctionExpression
	| ESTree.Function
	| ESTree.TSCallSignatureDeclaration
	| ESTree.TSConstructSignatureDeclaration
	| ESTree.TSConstructorType
	| ESTree.TSFunctionType
	| ESTree.TSMethodSignature;

/** Ban function contracts that return unknown instead of a parsed domain type. */
export const noUnknownReturnsRule = Rule.define({
	name: 'no-unknown-returns',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow functions whose explicit return contract is unknown or Promise<unknown>.'
		},
		messages: {
			unknownReturn:
				'This function exposes `unknown` to its caller. Parse the value at its boundary and return a named domain type.'
		}
	},
	create: function* () {
		const context = yield* RuleContext;
		const environment = createTypeAliasEnvironment(
			context.sourceCode.ast,
			context.sourceCode.visitorKeys
		);

		const resolvesToUnknown = (type: ESTree.TSType): boolean =>
			resolvedTypeMatches(type, environment, (resolved, matches) => {
				if (resolved.type === 'TSUnknownKeyword') return true;
				if (resolved.type === 'TSParenthesizedType') {
					return matches(resolved.typeAnnotation);
				}
				if (resolved.type === 'TSUnionType')
					return resolved.types.some(matches);
				if (
					resolved.type !== 'TSTypeReference' ||
					resolved.typeName.type !== 'Identifier' ||
					(resolved.typeName.name !== 'Promise' &&
						resolved.typeName.name !== 'PromiseLike')
				) {
					return false;
				}
				const value = resolved.typeArguments?.params[0];
				return value !== undefined && matches(value);
			});

		const checkReturnType = Effect.fn('no-unknown-returns.checkReturnType')(
			function* (node: FunctionWithReturnType) {
				const annotation = node.returnType;
				if (annotation === null || annotation === undefined) return;
				if (!resolvesToUnknown(annotation.typeAnnotation)) return;
				yield* context.report({
					node: annotation.typeAnnotation,
					messageId: 'unknownReturn'
				});
			}
		);

		return Visitor.merge(
			Visitor.on('ArrowFunctionExpression', checkReturnType),
			Visitor.on('FunctionDeclaration', checkReturnType),
			Visitor.on('FunctionExpression', checkReturnType),
			Visitor.on('TSCallSignatureDeclaration', checkReturnType),
			Visitor.on('TSConstructSignatureDeclaration', checkReturnType),
			Visitor.on('TSConstructorType', checkReturnType),
			Visitor.on('TSDeclareFunction', checkReturnType),
			Visitor.on('TSEmptyBodyFunctionExpression', checkReturnType),
			Visitor.on('TSFunctionType', checkReturnType),
			Visitor.on('TSMethodSignature', checkReturnType)
		);
	}
});

export default noUnknownReturnsRule;
