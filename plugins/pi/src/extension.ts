import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import path from 'node:path';

import { loadGuidance } from '@enfect/core/guidance';
import { loadPatterns } from '@enfect/core/pattern-catalog';
import { createPatternEnforcer } from './enforcer.ts';
import { withPiPolicy } from './policy.ts';

/** Register Pi-specific events; skills and prompt templates use the package manifest. */
export const registerEnfect = async (
	pi: Pick<ExtensionAPI, 'on' | 'sendMessage'>,
	packageDirectory: string
): Promise<void> => {
	const [guidance, patterns] = await Promise.all([
		loadGuidance(path.join(packageDirectory, 'guidance')),
		loadPatterns(path.join(packageDirectory, 'patterns'))
	]);
	const policy = withPiPolicy(guidance);
	const enforcer = createPatternEnforcer(patterns);
	pi.on('before_agent_start', (event) => {
		event.systemPromptOptions.sections.enfect = policy;
	});
	pi.on('tool_call', (event, ctx) => enforcer.before(event, ctx.cwd));
	pi.on('tool_result', async (event) => {
		const result = await enforcer.after(event);
		if (result !== undefined && event.parentToolCallId !== undefined) {
			// A codemode/custom parent can discard nested results. Deliver each
			// finding once in the outer model context too, so it can be reviewed now.
			try {
				const feedback = result.content?.at(-1);
				if (feedback?.type === 'text')
					pi.sendMessage(
						{
							customType: 'enfect-review',
							content: feedback.text,
							display: false
						},
						{ triggerTurn: true, deliverAs: 'steer' }
					);
			} catch {
				// Result annotation remains useful if custom-message delivery fails.
			}
		}
		return result;
	});
	pi.on('session_start', () => enforcer.clear());
	pi.on('agent_end', () => enforcer.clear());
	pi.on('session_shutdown', () => enforcer.clear());
};
