import * as Effect from 'effect/Effect';
import { Rule, RuleContext, Visitor } from 'effect-oxlint';

import {
	classifyUnsafeDictionary,
	classifyUnsafeDictionaryValue,
	createTypeEnvironment,
	type TypeEnvironment
} from '../internal/anti-slop/dictionary-types.ts';
import { visibleTypeAlias } from '../internal/anti-slop/type-alias-resolution.ts';

import type { ESTree } from '@oxlint/plugins';

const typeNodeKinds: ReadonlySet<string> = new Set([
	'JSDocNonNullableType',
	'JSDocNullableType',
	'JSDocUnknownType',
	'TSAnyKeyword',
	'TSArrayType',
	'TSBigIntKeyword',
	'TSBooleanKeyword',
	'TSConditionalType',
	'TSConstructorType',
	'TSFunctionType',
	'TSImportType',
	'TSIndexedAccessType',
	'TSInferType',
	'TSIntersectionType',
	'TSIntrinsicKeyword',
	'TSLiteralType',
	'TSMappedType',
	'TSNamedTupleMember',
	'TSNeverKeyword',
	'TSNullKeyword',
	'TSNumberKeyword',
	'TSObjectKeyword',
	'TSParenthesizedType',
	'TSStringKeyword',
	'TSSymbolKeyword',
	'TSTemplateLiteralType',
	'TSThisType',
	'TSTupleType',
	'TSTypeLiteral',
	'TSTypeOperator',
	'TSTypePredicate',
	'TSTypeQuery',
	'TSTypeReference',
	'TSUndefinedKeyword',
	'TSUnionType',
	'TSUnknownKeyword',
	'TSVoidKeyword'
]);

function isTypeNode(node: ESTree.Node): node is ESTree.TSType {
	return typeNodeKinds.has(node.type);
}

function typeReferenceName(type: ESTree.TSTypeReference): string | null {
	return type.typeName.type === 'Identifier' ? type.typeName.name : null;
}

function isInsideTypeAliasDeclaration(node: ESTree.Node): boolean {
	let current: ESTree.Node | null = node.parent;
	while (current !== null && current.type !== 'Program') {
		if (current.type === 'TSTypeAliasDeclaration') return true;
		current = current.parent;
	}
	return false;
}

function isPlainAliasConsumerUse(
	node: ESTree.TSType,
	environment: TypeEnvironment
): boolean {
	if (node.type !== 'TSTypeReference' || node.typeArguments?.params.length)
		return false;
	const name = typeReferenceName(node);
	return (
		name !== null &&
		visibleTypeAlias(name, node, environment.typeAliases) !== null &&
		!isInsideTypeAliasDeclaration(node)
	);
}

function isInsideTypeParameterConstraint(node: ESTree.TSType): boolean {
	let child: ESTree.Node = node;
	let parent: ESTree.Node | null = child.parent;
	while (parent !== null && parent.type !== 'Program') {
		if (parent.type === 'TSTypeParameter' && parent.constraint === child)
			return true;
		child = parent;
		parent = child.parent;
	}
	return false;
}

function shouldReportType(
	node: ESTree.TSType,
	environment: TypeEnvironment
): boolean {
	if (isInsideTypeParameterConstraint(node)) return false;
	if (isPlainAliasConsumerUse(node, environment)) return false;
	if (classifyUnsafeDictionary(node, environment) === null) return false;
	let current: ESTree.Node | null = node.parent;
	while (current !== null && current.type !== 'Program') {
		if (
			isTypeNode(current) &&
			classifyUnsafeDictionary(current, environment) !== null
		)
			return false;
		current = current.parent;
	}
	return true;
}

/** Disallow object-dictionary contracts whose direct value type is an unsafe escape hatch. */
export const noUnsafeDictionaryTypeRule = Rule.define({
	name: 'no-unsafe-dictionary-type',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow object-dictionary contracts whose direct value type is unknown, any, object, {}, or a union/alias containing one of those escape hatches.'
		},
		messages: {
			unsafeDictionary:
				"This dictionary's {{value}} value type gives callers no concrete value contract. Use an owner/schema-derived value type; parse external payloads before insertion."
		}
	},
	create: function* () {
		const context = yield* RuleContext;
		const environment = createTypeEnvironment(
			context.sourceCode.ast,
			context.sourceCode.visitorKeys
		);
		const report = Effect.fn('no-unsafe-dictionary-type.report')(function* (
			node: ESTree.Node,
			value: string
		) {
			yield* context.report({
				node,
				messageId: 'unsafeDictionary',
				data: { value }
			});
		});
		const reportIfUnsafe = Effect.fn(
			'no-unsafe-dictionary-type.reportIfUnsafe'
		)(function* (node: ESTree.TSType) {
			if (!shouldReportType(node, environment)) return;
			const unsafe = classifyUnsafeDictionary(node, environment);
			if (unsafe === null) return;
			yield* report(node, unsafe.unsafeValue);
		});

		return Visitor.merge(
			Visitor.on('TSTypeReference', reportIfUnsafe),
			Visitor.on('TSTypeLiteral', reportIfUnsafe),
			Visitor.on('TSMappedType', reportIfUnsafe),
			Visitor.on(
				'TSIndexSignature',
				Effect.fn('no-unsafe-dictionary-type.TSIndexSignature')(
					function* (node: ESTree.TSIndexSignature) {
						if (
							node.typeAnnotation === null ||
							node.parent.type === 'TSTypeLiteral'
						)
							return;
						const unsafe = classifyUnsafeDictionaryValue(
							node.typeAnnotation.typeAnnotation,
							environment
						);
						if (unsafe !== null)
							yield* report(node, unsafe.unsafeValue);
					}
				)
			)
		);
	}
});

export default noUnsafeDictionaryTypeRule;
