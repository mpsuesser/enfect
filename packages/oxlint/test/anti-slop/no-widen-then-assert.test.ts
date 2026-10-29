import { RuleTester } from 'oxlint/plugins-dev';

import { noWidenThenAssertRule } from '../../src/rules/no-widen-then-assert.ts';

const tester = new RuleTester({
	languageOptions: { parserOptions: { lang: 'ts' } }
});
const error = { messageId: 'widenThenAssert' };

tester.run('anti-slop/no-widen-then-assert', noWidenThenAssertRule, {
	valid: [
		'let widened: unknown = { id: 1 }; const result = widened as { id: number };',
		'const widened: unknown = load(); const result = widened as User;',
		'const widened: unknown = { id: 1 }; function later() { return widened as User; }',
		'const widened: unknown = { id: 1 }; function other(widened: unknown) { return widened as User; }',
		'const widened: unknown = { id: 1 }; const result = widened as any;',
		'const widened: object = { id: 1 }; const result = widened as string;',
		'const widened: Record<string, unknown> = { id: 1 }; const result = widened as Record<string, unknown>;',
		"const source = { id: 'first' }; const widened: unknown = source;",
		'declare const input: unknown; const parsed = input as { readonly id: string };'
	],
	invalid: [
		{
			code: 'const widened: unknown = { id: 1 }; const result = widened as { id: number };',
			errors: [error]
		},
		{
			code: 'const widened: any = [1]; const result = widened as number[];',
			errors: [error]
		},
		{
			code: 'const widened: object = [1]; const result = widened as number[];',
			errors: [error]
		},
		{
			code: 'const widened: Record<string, unknown> = { id: 1 }; const result = widened as Record<string, number>;',
			errors: [error]
		},
		{
			code: 'const widened = ({ id: 1 } as unknown); const result = widened as User;',
			errors: [error]
		},
		{
			code: 'const source = { id: 1 }; const alias = source; const widened: unknown = alias; const result = <User>widened;',
			errors: [error]
		},
		{
			code: 'const source: User = load(); const widened: unknown = source; const result = widened as User;',
			errors: [error]
		},
		{
			code: "const source = { id: 'second' }; const widened: unknown = source; const parsed = widened as { readonly id: string };",
			errors: [error]
		}
	]
});
