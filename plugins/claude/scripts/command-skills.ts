import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { loadCommands } from '@enfect/core/commands';
import { parseFrontmatter } from '@enfect/core/frontmatter';

/** Generate manual-only Claude skills after the shared catalogs have been staged. */
export const stageCommandSkills = async (
	commandsDirectory: string,
	skillsDirectory: string
): Promise<void> => {
	const commands = await loadCommands(commandsDirectory);
	const entries = await readdir(skillsDirectory, { withFileTypes: true });
	const skillNames = new Set<string>();
	for (const entry of entries) {
		if (!entry.isDirectory()) continue;
		skillNames.add(entry.name);
		const { name } = parseFrontmatter(
			await readFile(
				path.join(skillsDirectory, entry.name, 'SKILL.md'),
				'utf8'
			)
		);
		if (typeof name === 'string') skillNames.add(name);
	}
	for (const command of commands) {
		if (skillNames.has(command.name))
			throw new Error(
				`Command ${command.name} collides with a bundled skill`
			);
	}
	for (const command of commands) {
		const directory = path.join(skillsDirectory, command.name);
		const frontmatter = [
			'---',
			`name: ${command.name}`,
			`description: ${JSON.stringify(command.description)}`,
			...(command.argumentHint === undefined
				? []
				: [`argument-hint: ${JSON.stringify(command.argumentHint)}`]),
			'disable-model-invocation: true',
			'---'
		].join('\n');
		await mkdir(directory);
		await writeFile(
			path.join(directory, 'SKILL.md'),
			`${frontmatter}\n\n${command.body}\n`
		);
	}
	// Claude scans both directories; ship only the generated skill for each command.
	await rm(commandsDirectory, { recursive: true });
};

if (import.meta.main) {
	const root = path.resolve(import.meta.dirname, '..');
	await stageCommandSkills(
		path.join(root, 'commands'),
		path.join(root, 'skills')
	);
}
