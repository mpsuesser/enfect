import * as Effect from 'effect/Effect';
import * as Arr from 'effect/Array';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import { Rule, RuleContext, Scope, Visitor } from 'effect-oxlint';

import type { ESTree, SourceCode } from '@oxlint/plugins';

const isModuleMockMethod = Schema.is(
	Schema.Literals(['doMock', 'mock', 'unstable_mockModule'])
);

function importedName(node: ESTree.Node): string | null {
	if (node.type !== 'ImportSpecifier') return null;
	return node.imported.type === 'Identifier'
		? node.imported.name
		: node.imported.value;
}

function isTestFrameworkObject(
	sourceCode: SourceCode,
	expression: ESTree.Expression
): expression is ESTree.IdentifierReference {
	if (expression.type !== 'Identifier') return false;
	if (
		(expression.name === 'vi' || expression.name === 'jest') &&
		sourceCode.isGlobalReference(expression)
	) {
		return true;
	}

	return Option.match(
		Scope.findVariableUp(sourceCode.getScope(expression), expression.name),
		{
			onNone: () =>
				expression.name === 'vi' || expression.name === 'jest',
			onSome: (variable) =>
				Arr.match(variable.defs, {
					onEmpty: () =>
						expression.name === 'vi' || expression.name === 'jest',
					onNonEmpty: (definitions) =>
						Arr.some(definitions, (definition) => {
							if (
								definition.type !== 'ImportBinding' ||
								definition.parent?.type !== 'ImportDeclaration'
							) {
								return false;
							}
							const source = definition.parent.source.value;
							const name = importedName(definition.node);
							return (
								(source === 'vitest' && name === 'vi') ||
								(source === '@jest/globals' && name === 'jest')
							);
						})
				})
		}
	);
}

function moduleMockCall(
	sourceCode: SourceCode,
	callee: ESTree.Expression
): boolean {
	if (
		!('property' in callee) ||
		!('object' in callee) ||
		!('computed' in callee)
	)
		return false;
	if (!isTestFrameworkObject(sourceCode, callee.object)) return false;
	const property = callee.property;
	const method = callee.computed
		? property.type === 'Literal' && isModuleMockMethod(property.value)
			? property.value
			: null
		: property.type === 'Identifier'
			? property.name
			: null;
	return isModuleMockMethod(method);
}

/** Ban test framework module mocking in favor of real dependency seams. */
export const noModuleMockingRule = Rule.define({
	name: 'no-module-mocking',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow Vitest and Jest module mocking; tests must replace dependencies through real interfaces.'
		},
		messages: {
			moduleMock:
				'Replace module mocking with dependency injection through a real interface, service layer, or faithful test implementation.'
		}
	},
	create: function* () {
		const context = yield* RuleContext;
		return Visitor.on(
			'CallExpression',
			Effect.fn('no-module-mocking.CallExpression')(function* (
				node: ESTree.CallExpression
			) {
				if (
					node.callee.type === 'Super' ||
					node.callee.type === 'V8IntrinsicExpression'
				)
					return;
				if (moduleMockCall(context.sourceCode, node.callee)) {
					yield* context.report({ node, messageId: 'moduleMock' });
				}
			})
		);
	}
});

export default noModuleMockingRule;
