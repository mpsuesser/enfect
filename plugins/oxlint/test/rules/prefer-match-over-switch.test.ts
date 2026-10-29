import { describe, expect, it } from '@effect/vitest';

import rule from '../../src/rules/prefer-match-over-switch.ts';
import * as Testing from 'effect-oxlint/testing';

describe('prefer-match-over-switch', () => {
	it('flags SwitchStatement', () => {
		expect(
			Testing.runRule(rule, 'SwitchStatement', Testing.switchStmt())
		).toHaveLength(1);
	});
});
