import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadPatterns } from '@enfect/core/pattern-catalog';
import { ensureAstGrep } from './dependencies.ts';
import { postToolUseFeedback } from './post-tool-use.ts';
import { buildSessionParts } from './session-context.ts';

const pluginRoot =
	process.env.PLUGIN_ROOT ??
	path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// The shared native-addon loader uses this compatibility variable in either host.
if (process.env.PLUGIN_DATA !== undefined)
	process.env.CLAUDE_PLUGIN_DATA = process.env.PLUGIN_DATA;
const reference = path.join(
	homedir(),
	'.local/share/opencode/repos/github.com/Effect-TS/effect@main'
);

const emit = (hookEventName: string, additionalContext: string): void => {
	process.stdout.write(
		JSON.stringify({
			hookSpecificOutput: { hookEventName, additionalContext }
		})
	);
};
const readStdin = async (): Promise<unknown> => {
	const chunks: Array<Buffer> = [];
	for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
	return JSON.parse(Buffer.concat(chunks).toString('utf8'));
};

try {
	const command = process.argv[2];
	if (command === 'session-start' || command === 'subagent-start') {
		const part = Number(process.argv[3] ?? '1');
		const notices =
			command === 'session-start' && part === 1
				? [
						await ensureAstGrep(),
						existsSync(reference)
							? undefined
							: `Enfect notice: the Effect source reference cited by the guidance is missing. If the user agrees, clone it with \`git clone https://github.com/Effect-TS/effect.git "${reference}"\`.`
					].filter((notice): notice is string => notice !== undefined)
				: [];
		const context = (
			await buildSessionParts(path.join(pluginRoot, 'guidance'), notices)
		)[part - 1];
		if (context !== undefined)
			emit(
				command === 'session-start' ? 'SessionStart' : 'SubagentStart',
				context
			);
	} else if (command === 'post-tool-use') {
		const payload = await readStdin();
		const patterns = await loadPatterns(path.join(pluginRoot, 'patterns'));
		const feedback = await postToolUseFeedback(payload, patterns);
		if (feedback !== undefined) emit('PostToolUse', feedback);
	}
} catch {
	// Advisory hooks: malformed input, missing files, or unavailable dependencies exit 0.
}
