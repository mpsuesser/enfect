import * as Effect from 'effect/Effect';
import * as Arr from 'effect/Array';
import * as Schema from 'effect/Schema';
import * as Str from 'effect/String';
import { Rule, RuleContext, Visitor } from 'effect-oxlint';

import type { ESTree, SourceCode } from '@oxlint/plugins';

type TypeAssertion = ESTree.TSAsExpression | ESTree.TSTypeAssertion;

const DEFAULT_SAFETY_MARKERS = ['SAFETY'] as const;

class SafetyCommentOptions extends Schema.Class<SafetyCommentOptions>(
	'SafetyCommentOptions'
)({
	markers: Schema.Array(Schema.String).pipe(
		Schema.withDecodingDefaultKey(Effect.succeed(DEFAULT_SAFETY_MARKERS))
	)
}) {}

const commentOwnerKinds = new Set([
	'ExpressionStatement',
	'PropertyDefinition',
	'ReturnStatement',
	'ThrowStatement',
	'VariableDeclaration'
]);

function isConstAssertion(node: TypeAssertion): boolean {
	return (
		node.typeAnnotation.type === 'TSTypeReference' &&
		node.typeAnnotation.typeName.type === 'Identifier' &&
		node.typeAnnotation.typeName.name === 'const'
	);
}

function markerPattern(markers: readonly string[]): RegExp {
	const alternation = Arr.join(
		Arr.map(
			markers,
			Str.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`)
		),
		'|'
	);
	return new RegExp(
		String.raw`(?:^|[^\p{L}\p{N}_])(?:${alternation})\s*:\s*\S`,
		'u'
	);
}

function hasSafetyJustificationBefore(
	sourceCode: SourceCode,
	owner: ESTree.Node,
	assertion: TypeAssertion,
	pattern: RegExp
): boolean {
	return sourceCode
		.getCommentsBefore(owner)
		.some(
			(comment) =>
				comment.end <= assertion.start && pattern.test(comment.value)
		);
}

function hasSafetyComment(
	sourceCode: SourceCode,
	node: TypeAssertion,
	pattern: RegExp
): boolean {
	let current: ESTree.Node = node;
	while (true) {
		if (hasSafetyJustificationBefore(sourceCode, current, node, pattern))
			return true;
		if (commentOwnerKinds.has(current.type)) {
			const exportDeclaration = current.parent;
			return (
				exportDeclaration.type === 'ExportNamedDeclaration' &&
				exportDeclaration.declaration === current &&
				hasSafetyJustificationBefore(
					sourceCode,
					exportDeclaration,
					node,
					pattern
				)
			);
		}
		if (current.parent.type === 'Program') return false;
		current = current.parent;
	}
}

/** Require every non-const type assertion to state the invariant TypeScript cannot express. */
export const requireSafetyCommentForTypeAssertionRule = Rule.define({
	name: 'require-safety-comment-for-type-assertion',
	options: SafetyCommentOptions.pipe(
		Schema.withDecodingDefault(Effect.succeed({}))
	),
	meta: {
		type: 'problem',
		docs: {
			description:
				'Require a nearby SAFETY comment for every TypeScript type assertion except const assertions.'
		},
		messages: {
			missingSafetyComment:
				'This type assertion has no `{{marker}}:` justification. State the checked invariant immediately before the assertion or its containing statement.'
		},
		schema: [
			{
				type: 'object',
				properties: {
					markers: {
						type: 'array',
						items: { type: 'string', minLength: 1 },
						minItems: 1,
						uniqueItems: true
					}
				},
				additionalProperties: false
			}
		],
		defaultOptions: [{ markers: ['SAFETY'] }]
	},
	create: function* (options) {
		const context = yield* RuleContext;
		const markers = Arr.match(
			Arr.filter(Arr.map(options.markers, Str.trim), Str.isNonEmpty),
			{
				onEmpty: () => DEFAULT_SAFETY_MARKERS,
				onNonEmpty: (values) => values
			}
		);
		const pattern = markerPattern(markers);

		const checkAssertion = Effect.fn(
			'require-safety-comment-for-type-assertion.checkAssertion'
		)(function* (node: TypeAssertion) {
			if (isConstAssertion(node)) return;
			if (hasSafetyComment(context.sourceCode, node, pattern)) return;
			yield* context.report({
				node,
				messageId: 'missingSafetyComment',
				data: { marker: markers[0] }
			});
		});

		return Visitor.merge(
			Visitor.on('TSAsExpression', checkAssertion),
			Visitor.on('TSTypeAssertion', checkAssertion)
		);
	}
});

export default requireSafetyCommentForTypeAssertionRule;
