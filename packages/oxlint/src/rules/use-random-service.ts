import type { CreateRule } from '@oxlint/plugins';
import { Rule } from 'effect-oxlint';

const rule: CreateRule = Rule.banMember('Math', 'random', {
	message:
		'Avoid `Math.random()` in Effect code. Use the `Random` service for testable, deterministic randomness. (EF-9)'
});

export default rule;
