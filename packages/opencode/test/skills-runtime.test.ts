import { describe, expect, it } from 'bun:test';

import { SKILLS_DIRECTORY } from '@enfect/core/testing';

import { loadSkills } from '../src/skills.ts';

describe('loadSkills', () => {
	it('constructs every bundled OpenCode skill', async () => {
		const skills = await loadSkills(SKILLS_DIRECTORY);

		expect(skills).toHaveLength(54);
		expect<unknown>(skills[0]?.id).toBe('effect-ai-chat');
		expect<unknown>(skills.at(-1)?.id).toBe('effect-workflow');
	});
});
