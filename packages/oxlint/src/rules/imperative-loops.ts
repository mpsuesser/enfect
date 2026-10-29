import type { CreateRule } from '@oxlint/plugins';
import { Rule } from 'effect-oxlint';

const rule: CreateRule = Rule.banMultiple(
	{
		statements: [
			'ForStatement',
			'ForInStatement',
			'ForOfStatement',
			'WhileStatement',
			'DoWhileStatement'
		]
	},
	{
		name: 'imperative-loops',
		message:
			'Avoid imperative loops in domain code. Use `Arr.map`, `Arr.filter`, `Arr.filterMap`, `Arr.reduce`, or `Effect.forEach` for functional, composable transformations. (EF-5)'
	}
);

export default rule;
