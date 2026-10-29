import { describe, expect, it } from 'bun:test';

import { skillsDirectory } from '@enfect/skills';

import { loadSkills } from '../src/skills.ts';

describe('loadSkills', () => {
	it('constructs every bundled OpenCode skill', async () => {
		const skills = await loadSkills(skillsDirectory);

		expect(skills).toHaveLength(54);
		expect<unknown>(skills[0]?.id).toBe('effect-ai-chat');
		expect<unknown>(skills.at(-1)?.id).toBe('effect-workflow');
	});
});
