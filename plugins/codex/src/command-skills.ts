import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { loadCommands, type Command } from '@enfect/core/commands';

/** Codex skills receive caller text, rather than performing template substitution. */
export const commandSkill = (command: Command): string =>
	[
		'---',
		`name: ${command.name}`,
		`description: ${JSON.stringify(command.description)}`,
		'---',
		'',
		'Use the text that follows this skill mention in the invoking user message as the command arguments. If no text follows, the arguments are empty.',
		'',
		command.body.replaceAll(
			'$ARGUMENTS',
			'(the text following this skill mention in the user message, or empty if omitted)'
		),
		''
	].join('\n');

export const stageCommandSkills = async (
	commandsDirectory: string,
	skillsDirectory: string
): Promise<void> => {
	const commands = await loadCommands(commandsDirectory);
	const existing = new Set(await readdir(skillsDirectory));
	for (const command of commands) {
		if (existing.has(command.name))
			throw new Error(
				`Command collides with an Effect skill: ${command.name}`
			);
	}
	for (const command of commands) {
		const directory = path.join(skillsDirectory, command.name);
		await mkdir(path.join(directory, 'agents'), { recursive: true });
		await writeFile(
			path.join(directory, 'SKILL.md'),
			commandSkill(command)
		);
		await writeFile(
			path.join(directory, 'agents/openai.yaml'),
			'policy:\n    allow_implicit_invocation: false\n'
		);
	}
};
