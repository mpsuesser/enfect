import { describe, expect, it } from '@effect/vitest';

import rule from '../../src/rules/avoid-data-tagged-error.ts';
import * as Testing from 'effect-oxlint/testing';

describe('avoid-data-tagged-error', () => {
	it('flags Data.TaggedError', () => {
		expect(
			Testing.runRule(
				rule,
				'MemberExpression',
				Testing.memberExpr('Data', 'TaggedError')
			)
		).toHaveLength(1);
	});
	it('allows Schema.TaggedError', () => {
		expect(
			Testing.runRule(
				rule,
				'MemberExpression',
				Testing.memberExpr('Schema', 'TaggedError')
			)
		).toHaveLength(0);
	});
	it('allows Data.Struct', () => {
		expect(
			Testing.runRule(
				rule,
				'MemberExpression',
				Testing.memberExpr('Data', 'Struct')
			)
		).toHaveLength(0);
	});
});
