import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { extractBody, parseFrontmatter } from './frontmatter.ts';

/** A host-neutral slash command loaded from the commands catalog. */
export interface Command {
	/** Command name, taken from the filename. */
	readonly name: string;
	readonly description: string;
	readonly argumentHint: string | undefined;
	/** Prompt template; `$ARGUMENTS` stands for the user's input. */
	readonly body: string;
}

const COMMAND_NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/** Whether a commands directory entry is a command rather than its README. */
export const isCommandDocument = (entry: string): boolean =>
	entry.endsWith('.md') && entry !== 'README.md';

/** Parse one command file; throws on an invalid catalog entry. */
export const parseCommand = (name: string, content: string): Command => {
	if (!COMMAND_NAME.test(name))
		throw new Error(`Command name must be kebab-case: ${name}`);
	const { description, 'argument-hint': argumentHint } =
		parseFrontmatter(content);
	if (typeof description !== 'string' || description.trim().length === 0)
		throw new Error(`Command ${name} needs a description`);
	if (argumentHint !== undefined && typeof argumentHint !== 'string')
		throw new Error(`Command ${name} has a non-string argument-hint`);
	const body = extractBody(content);
	if (body.length === 0) throw new Error(`Command ${name} has no prompt`);
	return { name, description: description.trim(), argumentHint, body };
};

/** Load every command in deterministic name order. */
export const loadCommands = async (
	commandsDirectory: string
): Promise<ReadonlyArray<Command>> => {
	const entries = (await readdir(commandsDirectory))
		.filter(isCommandDocument)
		.toSorted();
	return Promise.all(
		entries.map(async (entry) =>
			parseCommand(
				path.basename(entry, '.md'),
				await readFile(path.join(commandsDirectory, entry), 'utf8')
			)
		)
	);
};

/** Replace every `$ARGUMENTS` with the user's input, taken literally. */
export const expandArguments = (body: string, input: string): string =>
	body.replaceAll('$ARGUMENTS', () => input.trim());
