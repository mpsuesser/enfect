import { describe, expect, it } from '@effect/vitest';

import rule from '../../src/rules/use-command-executor-service.ts';
import * as Testing from 'effect-oxlint/testing';

describe('use-command-executor-service', () => {
	it('flags import of node:child_process', () => {
		const errors = Testing.runRule(
			rule,
			'ImportDeclaration',
			Testing.importDecl('node:child_process')
		);
		expect(errors).toHaveLength(1);
		expect(errors[0]?.diagnostic.message).toContain('ChildProcessSpawner');
		expect(errors[0]?.diagnostic.message).toContain('effect/process');
	});

	it('flags import of child_process (without node: prefix)', () => {
		expect(
			Testing.runRule(
				rule,
				'ImportDeclaration',
				Testing.importDecl('child_process')
			)
		).toHaveLength(1);
	});

	it('does not flag unrelated imports', () => {
		expect(
			Testing.runRule(
				rule,
				'ImportDeclaration',
				Testing.importDecl('effect/process')
			)
		).toHaveLength(0);
	});
});
