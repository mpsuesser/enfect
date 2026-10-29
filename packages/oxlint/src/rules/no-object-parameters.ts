import * as Effect from 'effect/Effect';
import { Rule, RuleContext, Visitor } from 'effect-oxlint';

import type { ESTree } from '@oxlint/plugins';

import {
	functionParameterBindingName,
	functionParameterTypeAnnotation
} from '../internal/anti-slop/function-parameters.ts';
import {
	createTypeAliasEnvironment,
	resolvedTypeMatches
} from '../internal/anti-slop/type-alias-resolution.ts';
type ParameterOwner =
	| ESTree.ArrowFunctionExpression
	| ESTree.Function
	| ESTree.TSCallSignatureDeclaration
	| ESTree.TSConstructSignatureDeclaration
	| ESTree.TSConstructorType
	| ESTree.TSFunctionType
	| ESTree.TSMethodSignature;

/** Ban the broad object type on function inputs, including local aliases to object. */
export const noObjectParametersRule = Rule.define({
	name: 'no-object-parameters',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow object function parameters; inputs must use an owner-provided type and be parsed at their boundary.'
		},
		messages: {
			objectParameter:
				'Parameter `{{parameter}}` uses the broad `object` type. Accept a named owner type; parse external input at its boundary before calling this function.'
		}
	},
	create: function* () {
		const context = yield* RuleContext;
		const environment = createTypeAliasEnvironment(
			context.sourceCode.ast,
			context.sourceCode.visitorKeys
		);

		const resolvesToObject = (type: ESTree.TSType): boolean =>
			resolvedTypeMatches(type, environment, (resolved, matches) => {
				if (resolved.type === 'TSObjectKeyword') return true;
				if (resolved.type === 'TSParenthesizedType') {
					return matches(resolved.typeAnnotation);
				}
				return (
					resolved.type === 'TSUnionType' &&
					resolved.types.some(matches)
				);
			});

		const checkParameters = Effect.fn(
			'no-object-parameters.checkParameters'
		)(function* (node: ParameterOwner) {
			yield* Effect.forEach(
				node.params,
				Effect.fnUntraced(function* (parameter) {
					const annotation =
						functionParameterTypeAnnotation(parameter);
					if (annotation === null || annotation === undefined) return;
					if (!resolvesToObject(annotation.typeAnnotation)) return;
					yield* context.report({
						node: annotation.typeAnnotation,
						messageId: 'objectParameter',
						data: {
							parameter: functionParameterBindingName(
								parameter,
								context.sourceCode
							)
						}
					});
				}),
				{ concurrency: 1, discard: true }
			);
		});

		return Visitor.merge(
			Visitor.on('ArrowFunctionExpression', checkParameters),
			Visitor.on('FunctionDeclaration', checkParameters),
			Visitor.on('FunctionExpression', checkParameters),
			Visitor.on('TSCallSignatureDeclaration', checkParameters),
			Visitor.on('TSConstructSignatureDeclaration', checkParameters),
			Visitor.on('TSConstructorType', checkParameters),
			Visitor.on('TSDeclareFunction', checkParameters),
			Visitor.on('TSEmptyBodyFunctionExpression', checkParameters),
			Visitor.on('TSFunctionType', checkParameters),
			Visitor.on('TSMethodSignature', checkParameters)
		);
	}
});

export default noObjectParametersRule;
