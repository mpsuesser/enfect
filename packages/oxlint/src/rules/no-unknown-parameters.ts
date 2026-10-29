import * as Effect from 'effect/Effect';
import { Rule, RuleContext, Visitor } from 'effect-oxlint';
import type { ESTree } from '@oxlint/plugins';

import {
	containsUnknownType,
	functionParameterBindingName,
	functionParameterTypeAnnotation
} from '../internal/anti-slop/function-parameters.ts';
type ParameterOwner =
	| ESTree.ArrowFunctionExpression
	| ESTree.Function
	| ESTree.TSCallSignatureDeclaration
	| ESTree.TSConstructSignatureDeclaration
	| ESTree.TSConstructorType
	| ESTree.TSFunctionType
	| ESTree.TSMethodSignature;

function isTypePredicateSubject(
	owner: ParameterOwner,
	parameterName: string
): boolean {
	const predicate = owner.returnType?.typeAnnotation;
	return (
		predicate?.type === 'TSTypePredicate' &&
		predicate.parameterName.type === 'Identifier' &&
		predicate.parameterName.name === parameterName
	);
}

/** Disallow unknown inputs except explicitly named error-cause enrichment. */
export const noUnknownParametersRule = Rule.define({
	name: 'no-unknown-parameters',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow explicitly unknown function parameters except `cause` and type-predicate subjects; decode unknown input at its I/O boundary instead.'
		},
		messages: {
			unknownParameter:
				'Parameter `{{parameter}}` leaves input unparsed. Accept a named domain type; run the expected schema or parser at the I/O boundary before calling this function.'
		}
	},
	create: function* () {
		const context = yield* RuleContext;
		const checkParameters = Effect.fn(
			'no-unknown-parameters.checkParameters'
		)(function* (node: ParameterOwner) {
			yield* Effect.forEach(
				node.params,
				Effect.fnUntraced(function* (parameter) {
					const annotation =
						functionParameterTypeAnnotation(parameter);
					if (annotation === null || annotation === undefined) return;
					if (!containsUnknownType(annotation.typeAnnotation)) return;
					const name = functionParameterBindingName(
						parameter,
						context.sourceCode
					);
					if (name === 'cause' || isTypePredicateSubject(node, name))
						return;
					yield* context.report({
						node: annotation.typeAnnotation,
						messageId: 'unknownParameter',
						data: { parameter: name }
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

export default noUnknownParametersRule;
