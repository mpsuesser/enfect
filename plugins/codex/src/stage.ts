import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { stageCommandSkills } from './command-skills.ts';
import {
	ADDITIONAL_CONTEXT_LIMIT,
	buildSessionParts,
	CONTEXT_LIMIT
} from './session-context.ts';

const root = path.resolve(import.meta.dirname, '..');
await stageCommandSkills(
	path.join(root, 'commands'),
	path.join(root, 'skills')
);
const parts = await buildSessionParts(path.join(root, 'guidance'));
if (parts.some((part) => Buffer.byteLength(part) > CONTEXT_LIMIT))
	throw new Error('Guidance exceeds hook output budget');

const handler = (command: string, timeout: number) => ({
	type: 'command',
	// The shell guard covers a missing Node as well as a failed hook. Neither emits stderr.
	command: `if command -v node >/dev/null 2>&1; then node "\${PLUGIN_ROOT}/dist/hook.mjs" ${command} 2>/dev/null || true; fi`,
	timeout,
	additionalContextLimit: ADDITIONAL_CONTEXT_LIMIT
});
const start = (command: string) =>
	parts.map((_, index) => ({
		hooks: [handler(`${command} ${index + 1}`, index === 0 ? 120 : 30)]
	}));
await writeFile(
	path.join(root, 'hooks/hooks.json'),
	`${JSON.stringify(
		{
			description:
				'Inject complete Effect v4 guidance and review apply_patch edits',
			hooks: {
				SessionStart: start('session-start'),
				SubagentStart: start('subagent-start'),
				PostToolUse: [
					{
						matcher: '^apply_patch$',
						hooks: [handler('post-tool-use', 30)]
					}
				]
			}
		},
		null,
		2
	)}\n`
);
