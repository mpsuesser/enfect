import {
	mkdir,
	mkdtemp,
	readdir,
	readFile,
	rm,
	writeFile
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';

import { commandsDirectory } from '@enfect/commands';
import { loadCommands } from '@enfect/core/commands';
import { extractBody, parseFrontmatter } from '@enfect/core/frontmatter';
import { stageCommandSkills } from '../scripts/command-skills.ts';

const temporaryDirectories: Array<string> = [];

afterEach(async () => {
	await Promise.all(
		temporaryDirectories
			.splice(0)
			.map((directory) => rm(directory, { recursive: true, force: true }))
	);
});

const fixture = async () => {
	const root = await mkdtemp(path.join(tmpdir(), 'enfect-command-skills-'));
	temporaryDirectories.push(root);
	const commands = path.join(root, 'commands');
	const skills = path.join(root, 'skills');
	await mkdir(commands);
	await mkdir(skills);
	return { commands, skills };
};

describe('Claude command skills', () => {
	it('generates manual-only skills with native argument placeholders', async () => {
		const { commands, skills } = await fixture();
		await writeFile(
			path.join(commands, 'greet.md'),
			'---\ndescription: "Greet: someone"\nargument-hint: "[name]"\n---\n\nHello, $ARGUMENTS!\n'
		);
		await writeFile(
			path.join(commands, 'plain.md'),
			'---\ndescription: No arguments\n---\nPlain prompt\n'
		);
		await stageCommandSkills(commands, skills);
		const markdown = await readFile(
			path.join(skills, 'greet', 'SKILL.md'),
			'utf8'
		);
		expect(parseFrontmatter(markdown)).toEqual({
			name: 'greet',
			description: 'Greet: someone',
			'argument-hint': '[name]',
			'disable-model-invocation': true
		});
		expect(extractBody(markdown)).toBe('Hello, $ARGUMENTS!');
		expect(
			parseFrontmatter(
				await readFile(path.join(skills, 'plain', 'SKILL.md'), 'utf8')
			)
		).not.toHaveProperty('argument-hint');
		expect(readdir(commands)).rejects.toThrow();
	});

	it.each(['greet', 'reference'])(
		'rejects collisions with a skill directory or declared name (%s)',
		async (directoryName) => {
			const { commands, skills } = await fixture();
			await writeFile(
				path.join(commands, 'greet.md'),
				'---\ndescription: Greet someone\n---\nHello\n'
			);
			await mkdir(path.join(skills, directoryName));
			const original =
				'---\nname: greet\ndescription: Existing skill\n---\nKeep me\n';
			await writeFile(
				path.join(skills, directoryName, 'SKILL.md'),
				original
			);
			expect(stageCommandSkills(commands, skills)).rejects.toThrow(
				'Command greet collides with a bundled skill'
			);
			expect(
				await readFile(
					path.join(skills, directoryName, 'SKILL.md'),
					'utf8'
				)
			).toBe(original);
			expect(await readdir(commands)).toEqual(['greet.md']);
		}
	);

	it('builds every catalog command exactly once alongside the Effect skills', async () => {
		const root = path.resolve(import.meta.dirname, '..');
		const commands = await loadCommands(commandsDirectory);
		for (const command of commands) {
			const markdown = await readFile(
				path.join(root, 'skills', command.name, 'SKILL.md'),
				'utf8'
			);
			expect(parseFrontmatter(markdown)).toEqual({
				name: command.name,
				description: command.description,
				...(command.argumentHint === undefined
					? {}
					: { 'argument-hint': command.argumentHint }),
				'disable-model-invocation': true
			});
			expect(extractBody(markdown)).toBe(command.body);
		}
		const referenceSkills = await readdir(
			path.resolve(root, '../../packages/skills'),
			{ withFileTypes: true }
		);
		expect(await readdir(path.join(root, 'skills'))).toHaveLength(
			referenceSkills.filter((entry) => entry.isDirectory()).length +
				commands.length
		);
		expect(readdir(path.join(root, 'commands'))).rejects.toThrow();
	});
});
