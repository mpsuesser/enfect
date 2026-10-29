import type { CreateRule } from '@oxlint/plugins';
import { Rule } from 'effect-oxlint';

const rule: CreateRule = Rule.banStatement('SwitchStatement', {
	message:
		'Avoid `switch` statements in Effect code. Use `Match.value(...).pipe(Match.when(...), ..., Match.exhaustive)` for exhaustive, type-safe branching. (EF-7)'
});

export default rule;
