import type { CreateRule } from '@oxlint/plugins';
import { Rule } from 'effect-oxlint';

const rule: CreateRule = Rule.banMember('Effect', 'promise', {
	message:
		'Prefer `Effect.tryPromise` over `Effect.promise`. `tryPromise` captures rejections in the typed error channel via a `catch` handler, while `promise` treats rejections as defects. (EF-22)'
});

export default rule;
