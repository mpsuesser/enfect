import * as Effect from 'effect/Effect';
import { Rule, RuleContext, Visitor } from 'effect-oxlint';

import type { ESTree } from '@oxlint/plugins';

import {
	createTypeAliasEnvironment,
	resolvedTypeMatches
} from '../internal/anti-slop/type-alias-resolution.ts';

/** Ban named aliases that merely conceal TypeScript's unknown top type. */
export const noUnknownTypeAliasesRule = Rule.define({
	name: 'no-unknown-type-aliases',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow type aliases whose resolved type is unknown; unknown must remain visible at an allowed boundary.'
		},
		messages: {
			unknownAlias:
				'Type alias `{{alias}}` hides `unknown`. Keep `unknown` explicit at the parsing boundary or on an allowed `cause` field; otherwise use the parsed owner type.'
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
				return (
					resolved.type === 'TSUnionType' &&
					resolved.types.some(matches)
				);
			});

		return Visitor.on(
			'TSTypeAliasDeclaration',
			Effect.fn('no-unknown-type-aliases.TSTypeAliasDeclaration')(
				function* (node: ESTree.TSTypeAliasDeclaration) {
					if (!resolvesToUnknown(node.typeAnnotation)) return;
					yield* context.report({
						node: node.id,
						messageId: 'unknownAlias',
						data: { alias: node.id.name }
					});
				}
			)
		);
	}
});

export default noUnknownTypeAliasesRule;
