import type { ESTree } from '@oxlint/plugins';
import * as Effect from 'effect/Effect';
import { Rule, RuleContext, Visitor } from 'effect-oxlint';

import { isGlobalReflectMethodCall } from '../internal/anti-slop/reflect-method.ts';

/** Ban Reflect.get, which bypasses ordinary property access and useful type evidence. */
export const noReflectGetRule = Rule.define({
	name: 'no-reflect-get',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow Reflect.get; use typed property access or parse dynamic input into a domain type.'
		},
		messages: {
			reflectGet:
				'Replace `Reflect.get` with typed property access. Parse dynamic input into a named domain type before reading it.'
		}
	},
	create: function* () {
		const context = yield* RuleContext;
		return Visitor.on(
			'CallExpression',
			Effect.fn('no-reflect-get.CallExpression')(function* (
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
						'get'
					)
				) {
					yield* context.report({ node, messageId: 'reflectGet' });
				}
			})
		);
	}
});

export default noReflectGetRule;
