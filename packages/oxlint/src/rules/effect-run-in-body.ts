import type { CreateRule } from '@oxlint/plugins';
import { Rule } from 'effect-oxlint';

const rule: CreateRule = Rule.banMember(
	'Effect',
	['runSync', 'runPromise', 'runFork'],
	{
		message:
			'Avoid `Effect.runSync`/`Effect.runPromise`/`Effect.runFork` in library or domain code. Keep runtime execution at the boundary (entrypoint/test harness). Return `Effect` values instead. (EF-21)'
	}
);

export default rule;
