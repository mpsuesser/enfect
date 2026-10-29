import type { CreateRule } from '@oxlint/plugins';
import { Rule } from 'effect-oxlint';

const rule: CreateRule = Rule.banStatement('TryStatement', {
	message:
		'Avoid try-catch in Effect code. Use `Effect.try` or `Effect.tryPromise` with `Schema.TaggedError` for typed, composable error handling. (EF-1)'
});

export default rule;
