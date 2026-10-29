import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadPatterns } from '@enfect/core/pattern-catalog';
import { ensureAstGrep } from './dependencies.ts';
import { postToolUseFeedback } from './post-tool-use.ts';
import { buildSessionParts } from './session-context.ts';

// Claude Code hook entrypoint, bundled to dist/hook.mjs. Hooks are advisory:
// every failure exits 0 without output so a check can never break a session or write.

const pluginRoot =
	process.env.CLAUDE_PLUGIN_ROOT ??
	path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const EFFECT_REFERENCE = path.join(
	homedir(),
	'.local/share/opencode/repos/github.com/Effect-TS/effect@main'
);

const readStdin = async (): Promise<unknown> => {
	const chunks: Array<Buffer> = [];
	for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
	const text = Buffer.concat(chunks).toString('utf8').trim();
	return text.length === 0 ? undefined : JSON.parse(text);
};

const emit = (hookEventName: string, additionalContext: string): void => {
	process.stdout.write(
		JSON.stringify({
			hookSpecificOutput: { hookEventName, additionalContext }
		})
	);
};

const requestedPart = (): number => Number(process.argv[3] ?? '1');

const emitGuidancePart = async (
	hookEventName: string,
	part: number,
	notices: ReadonlyArray<string>
): Promise<void> => {
	const parts = await buildSessionParts(
		path.join(pluginRoot, 'guidance'),
		notices
	);
	const context = parts[part - 1];
	if (context !== undefined) emit(hookEventName, context);
};

// Each SessionStart hook entry emits one guidance part; part 1 also prepares dependencies.
const sessionStart = async (): Promise<void> => {
	const part = requestedPart();
	const notices =
		part !== 1
			? []
			: [
					await ensureAstGrep(),
					existsSync(EFFECT_REFERENCE)
						? undefined
						: [
								'Enfect notice: the Effect source reference cited by the guidance is missing.',
								'If the user agrees, clone it with',
								`\`git clone https://github.com/Effect-TS/effect.git "${EFFECT_REFERENCE}"\`.`
							].join(' ')
				].filter((notice): notice is string => notice !== undefined);
	await emitGuidancePart('SessionStart', part, notices);
};

// SessionStart context never reaches subagents, so each SubagentStart hook entry emits the
// same guidance part. Dependency setup and its notices belong to the parent session.
const subagentStart = (): Promise<void> =>
	emitGuidancePart('SubagentStart', requestedPart(), []);

const postToolUse = async (): Promise<void> => {
	const payload = await readStdin();
	const patterns = await loadPatterns(path.join(pluginRoot, 'patterns'));
	const feedback = await postToolUseFeedback(payload, patterns);
	if (feedback !== undefined) emit('PostToolUse', feedback);
};

const commands: Record<string, () => Promise<void>> = {
	'session-start': sessionStart,
	'subagent-start': subagentStart,
	'post-tool-use': postToolUse
};

const command = commands[process.argv[2] ?? ''];
try {
	if (command !== undefined) await command();
} catch {
	// Advisory hook: swallow failures.
}
