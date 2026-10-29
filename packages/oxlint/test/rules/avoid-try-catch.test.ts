import { describe, expect, it } from '@effect/vitest';

import rule from '../../src/rules/avoid-try-catch.ts';
import * as Testing from 'effect-oxlint/testing';

describe('avoid-try-catch', () => {
	it('flags TryStatement', () => {
		expect(
			Testing.runRule(rule, 'TryStatement', Testing.tryStmt())
		).toHaveLength(1);
	});
});
