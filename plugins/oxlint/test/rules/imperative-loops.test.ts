import { describe, expect, it } from '@effect/vitest';

import rule from '../../src/rules/imperative-loops.ts';
import * as Testing from 'effect-oxlint/testing';

describe('imperative-loops', () => {
	it('flags ForStatement', () => {
		expect(
			Testing.runRule(rule, 'ForStatement', Testing.forStmt())
		).toHaveLength(1);
	});
	it('flags ForInStatement', () => {
		expect(
			Testing.runRule(rule, 'ForInStatement', Testing.forInStmt())
		).toHaveLength(1);
	});
	it('flags ForOfStatement', () => {
		expect(
			Testing.runRule(rule, 'ForOfStatement', Testing.forOfStmt())
		).toHaveLength(1);
	});
});
