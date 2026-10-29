import type { Plugin } from '@opencode/plugin';

import { type Command, expandArguments } from '@enfect/core/commands';

interface CommandContext {
	readonly command: Pick<Plugin.Context['command'], 'transform'>;
	readonly session: Pick<Plugin.Context['session'], 'prompt'>;
}

/** Register bundled commands and admit their expanded prompts through the host. */
export const registerCommands = async (
	context: CommandContext,
	commands: ReadonlyArray<Command>
): Promise<void> => {
	await context.command.transform((draft) => {
		for (const command of commands) {
			draft.add({
				name: command.name,
				description: command.description,
				execute: async (input) => {
					await context.session.prompt({
						sessionID: input.sessionID,
						text: expandArguments(command.body, input.prompt.text),
						delivery: input.delivery,
						// Template expansion invalidates offsets into the original input.
						...(input.prompt.files === undefined
							? {}
							: {
									files: input.prompt.files.map((file) => ({
										uri: file.uri,
										...(file.name === undefined
											? {}
											: { name: file.name }),
										...(file.description === undefined
											? {}
											: { description: file.description })
									}))
								}),
						...(input.prompt.agents === undefined
							? {}
							: {
									agents: input.prompt.agents.map(
										({ name }) => ({ name })
									)
								}),
						...(input.prompt.skills === undefined
							? {}
							: {
									skills: input.prompt.skills.map(
										({ id }) => ({ id })
									)
								})
					});
				}
			});
		}
	});
};
