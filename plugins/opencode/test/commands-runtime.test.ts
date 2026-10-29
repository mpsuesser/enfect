import type { Plugin } from '@opencode/plugin';
import type {
	CommandDefinition,
	CommandInvocation
} from '@opencode/plugin/promise/command';
import { Skill } from '@opencode/plugin';
import { describe, expect, it, mock } from 'bun:test';

import { commandsDirectory } from '@enfect/commands';
import { loadCommands, parseCommand } from '@enfect/core/commands';
import { registerCommands } from '../src/commands.ts';

const fixture = () => {
	const definitions: Array<CommandDefinition> = [];
	const prompt = mock<Plugin.Context['session']['prompt']>();
	const transform: Plugin.Context['command']['transform'] = async (
		callback
	) => {
		callback({
			add: (definition) => {
				definitions.push(definition);
			}
		});
		return { dispose: async () => {} };
	};
	return {
		definitions,
		prompt,
		context: { command: { transform }, session: { prompt } }
	};
};

const invocation = (
	text: string,
	delivery: CommandInvocation['delivery'] = 'steer'
): CommandInvocation => ({
	sessionID: 'session-command-test' as CommandInvocation['sessionID'],
	prompt: { text },
	delivery
});

describe('OpenCode commands', () => {
	it('registers every catalog command with its name and description', async () => {
		const { definitions, context } = fixture();
		const commands = await loadCommands(commandsDirectory);
		await registerCommands(context, commands);
		expect(
			definitions.map(({ name, description }) => ({ name, description }))
		).toEqual(
			commands.map(({ name, description }) => ({ name, description }))
		);
		expect(
			definitions.some(({ name }) => name === 'enfect-hello-world')
		).toBe(true);
	});

	it.each(['steer', 'queue'] as const)(
		'expands input literally and preserves %s delivery and attachments',
		async (delivery) => {
			const { definitions, prompt, context } = fixture();
			const command = parseCommand(
				'greet',
				'---\ndescription: Greet someone\n---\nHello $ARGUMENTS; again $ARGUMENTS'
			);
			await registerCommands(context, [command]);
			const mention = { start: 0, end: 3, text: 'Ada' };
			const input: CommandInvocation = {
				...invocation('Ada $& $ARGUMENTS', delivery),
				prompt: {
					text: 'Ada $& $ARGUMENTS',
					files: [
						{
							uri: 'file:///tmp/recipient.txt',
							name: 'recipient.txt',
							mention
						}
					],
					agents: [{ name: 'build', mention }],
					skills: [{ id: Skill.ID.make('effect-schema-v4'), mention }]
				}
			};
			const definition = definitions[0];
			if (definition === undefined) throw new Error('Missing command');
			await definition.execute(input);
			expect(prompt).toHaveBeenCalledTimes(1);
			expect(prompt).toHaveBeenCalledWith({
				sessionID: input.sessionID,
				text: 'Hello Ada $& $ARGUMENTS; again Ada $& $ARGUMENTS',
				delivery,
				files: [
					{ uri: 'file:///tmp/recipient.txt', name: 'recipient.txt' }
				],
				agents: [{ name: 'build' }],
				skills: [{ id: Skill.ID.make('effect-schema-v4') }]
			});
			expect(input.prompt.files?.[0]?.mention).toEqual(mention);
		}
	);

	it('handles empty arguments without inventing attachments and propagates prompt failures', async () => {
		const { definitions, prompt, context } = fixture();
		await registerCommands(context, [
			parseCommand(
				'greet',
				'---\ndescription: Greet someone\n---\nRecipient: $ARGUMENTS'
			)
		]);
		const definition = definitions[0];
		if (definition === undefined) throw new Error('Missing command');
		const input = invocation('');
		await definition.execute(input);
		expect(prompt).toHaveBeenCalledWith({
			sessionID: input.sessionID,
			text: 'Recipient: ',
			delivery: 'steer'
		});
		prompt.mockRejectedValueOnce(new Error('Session unavailable'));
		expect(definition.execute(input)).rejects.toThrow(
			'Session unavailable'
		);
	});
});
