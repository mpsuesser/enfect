import type { ESTree } from '@oxlint/plugins';
import * as Effect from 'effect/Effect';
import { Rule, RuleContext, Visitor } from 'effect-oxlint';

import { isGlobalReflectMethodCall } from '../internal/anti-slop/reflect-method.ts';

/** Ban Reflect.apply, which bypasses ordinary typed function calls. */
export const noReflectApplyRule = Rule.define({
	name: 'no-reflect-apply',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow Reflect.apply; call typed functions directly or model dynamic dispatch behind an interface.'
		},
		messages: {
			reflectApply:
				'Replace `Reflect.apply` with a typed function call. Model dynamic dispatch behind a named interface.'
		}
	},
	create: function* () {
		const context = yield* RuleContext;
		return Visitor.on(
			'CallExpression',
			Effect.fn('no-reflect-apply.CallExpression')(function* (
				node: ESTree.CallExpression
			) {
				if (
					node.callee.type === 'Super' ||
					node.callee.type === 'V8IntrinsicExpression'
				)
					return;
				if (
					isGlobalReflectMethodCall(
						context.sourceCode,
						node.callee,
						'apply'
					)
				) {
					yield* context.report({ node, messageId: 'reflectApply' });
				}
			})
		);
	}
});

export default noReflectApplyRule;
