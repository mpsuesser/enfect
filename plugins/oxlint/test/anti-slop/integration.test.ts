import { describe, expect, test } from '@effect/vitest';
import * as Testing from 'effect-oxlint/testing';

import plugin from '../../src/index.ts';
import noServiceConstructorImports from '../../src/rules/no-service-constructor-imports.ts';
import noRuntimeTypeof from '../../src/rules/no-runtime-typeof.ts';

const migratedRules = [
	'no-chained-type-assertions',
	'no-conditional-empty-object-spread',
	'no-known-value-widening',
	'no-module-mocking',
	'no-object-parameters',
	'no-reflect-apply',
	'no-reflect-get',
	'no-runtime-typeof',
	'no-service-constructor-imports',
	'no-shape-in-symbol-names',
	'no-unknown-parameters',
	'no-unknown-returns',
	'no-unknown-type-aliases',
	'no-unsafe-dictionary-type',
	'no-widen-then-assert',
	'require-safety-comment-for-type-assertion'
];

describe('anti-slop plugin integration', () => {
	test.each(migratedRules)(
		'exports and enables effect/%s in both presets',
		(name) => {
			expect(plugin.rules[name]?.create).toBeTypeOf('function');
			expect(plugin.configs.recommended.rules?.[`effect/${name}`]).toBe(
				'error'
			);
			expect(plugin.configs.all.rules?.[`effect/${name}`]).toBe('error');
		}
	);

	test('reports every matching import with its original imported name', () => {
		const node = Testing.importDeclWithSpecifiers('./services.ts', [
			Testing.importSpecifier('makeBilling', 'billing'),
			Testing.importSpecifier('layer'),
			Testing.importSpecifier('makeUsers', 'users')
		]);
		const diagnostics = Testing.runRule(
			noServiceConstructorImports,
			'ImportDeclaration',
			node
		);
		Testing.expectDiagnostics(diagnostics, [
			{ messageId: 'serviceConstructorImport' },
			{ messageId: 'serviceConstructorImport' }
		]);
		expect(diagnostics[0]?.diagnostic.data).toEqual({
			name: 'makeBilling'
		});
		expect(diagnostics[1]?.diagnostic.data).toEqual({ name: 'makeUsers' });
	});

	test.each([
		'/app/service.test.ts',
		'/app/service.spec.mts',
		'C:\\app\\service.test.tsx'
	])(
		'does not leak the test-file exemption from %s into the next runtime file',
		(filename) => {
			const node = Testing.importDeclWithSpecifiers('./service.ts', [
				Testing.importSpecifier('makeService')
			]);
			Testing.expectNoDiagnostics(
				Testing.runRule(
					noServiceConstructorImports,
					'ImportDeclaration',
					node,
					{ filename }
				)
			);
			Testing.expectDiagnostics(
				Testing.runRule(
					noServiceConstructorImports,
					'ImportDeclaration',
					node,
					{ filename: '/app/main.ts' }
				),
				[{ messageId: 'serviceConstructorImport' }]
			);
		}
	);

	test('decodes omitted and empty typeof options to the same default', () => {
		const node = {
			...Testing.unaryExpr('typeof', Testing.id('input')),
			parent: Testing.exprStmt(Testing.id('input'))
		};
		Testing.expectDiagnostics(
			Testing.runRule(noRuntimeTypeof, 'UnaryExpression', node),
			[{ messageId: 'runtimeTypeof' }]
		);
		Testing.expectDiagnostics(
			Testing.runRule(noRuntimeTypeof, 'UnaryExpression', node, {
				options: [{}]
			}),
			[{ messageId: 'runtimeTypeof' }]
		);
	});
});
