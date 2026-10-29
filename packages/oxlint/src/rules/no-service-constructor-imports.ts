import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Str from 'effect/String';
import { Rule, RuleContext, Visitor } from 'effect-oxlint';

import type { ESTree } from '@oxlint/plugins';

const isServiceConstructorName = Schema.is(
	Schema.String.check(Schema.isPattern(/^make[A-Z]/u))
);
const isTestFilename = Schema.is(
	Schema.String.check(Schema.isPattern(/\.(?:test|spec)\.[cm]?[jt]sx?$/u))
);

function isProjectLocalImport(source: string): boolean {
	return Str.startsWith('./')(source) || Str.startsWith('../')(source);
}

function getImportedName(specifier: ESTree.ImportSpecifier): string {
	if (specifier.imported.type === 'Identifier')
		return specifier.imported.name;
	return specifier.imported.value;
}

/** Keep dependency-bearing Effect service constructors local to their owning capability modules. */
export const noServiceConstructorImportsRule = Rule.define({
	name: 'no-service-constructor-imports',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow project-local make<CapabilityName> imports outside test and spec files.'
		},
		messages: {
			serviceConstructorImport:
				'Do not import Effect service constructor "{{name}}" into runtime code. Import the owning Layer, yield the contextual service, and allow its requirements to propagate to the composition root.'
		}
	},
	create: function* () {
		const context = yield* RuleContext;
		const isTestFile = isTestFilename(
			Str.replaceAll('\\', '/')(context.filename)
		);

		return Visitor.on(
			'ImportDeclaration',
			Effect.fn('no-service-constructor-imports.ImportDeclaration')(
				function* (node: ESTree.ImportDeclaration) {
					if (isTestFile || !isProjectLocalImport(node.source.value))
						return;

					yield* Effect.forEach(
						node.specifiers,
						Effect.fnUntraced(function* (specifier) {
							if (specifier.type !== 'ImportSpecifier') return;

							const importedName = getImportedName(specifier);
							if (!isServiceConstructorName(importedName)) return;

							yield* context.report({
								node: specifier,
								messageId: 'serviceConstructorImport',
								data: { name: importedName }
							});
						}),
						{ concurrency: 1, discard: true }
					);
				}
			)
		);
	}
});

export default noServiceConstructorImportsRule;
