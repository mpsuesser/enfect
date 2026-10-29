import { describe, expect, it } from 'bun:test';

import { commandsDirectory } from '@enfect/commands';
import {
	expandArguments,
	loadCommands,
	parseCommand
} from '../src/commands.ts';

describe('command catalog', () => {
	it('loads every bundled command', async () => {
		const commands = await loadCommands(commandsDirectory);
		expect(commands.map((command) => command.name)).toContain(
			'enfect-hello-world'
		);
		commands.forEach((command) => {
			expect(command.body).toContain('$ARGUMENTS');
		});
	});

	it('rejects commands without a description or prompt', () => {
		expect(() => parseCommand('missing', 'Prompt')).toThrow('description');
		expect(() =>
			parseCommand('empty', '---\ndescription: Empty\n---\n')
		).toThrow('no prompt');
		expect(() =>
			parseCommand('Bad_Name', '---\ndescription: X\n---\nPrompt')
		).toThrow('kebab-case');
	});

	it('substitutes the user input literally', () => {
		expect(expandArguments('Hi $ARGUMENTS and $ARGUMENTS', ' $& $1 ')).toBe(
			'Hi $& $1 and $& $1'
		);
	});
});
