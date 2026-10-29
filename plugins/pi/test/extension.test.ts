import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import type {
	BeforeAgentStartEvent,
	ExtensionAPI,
	ExtensionContext,
	ExtensionHandler,
	NormalizedBuildSystemPromptOptions,
	SessionStartEvent,
	ToolCallEvent,
	ToolResultEvent,
	ToolResultEventResult
} from '@earendil-works/pi-coding-agent';
import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { loadGuidance } from '@enfect/core/guidance';
import { Pattern } from '@enfect/core/pattern';
import { registerEnfect } from '../src/extension.ts';
import { withPiSkillReferences } from '../src/policy.ts';

// The host context contains many unrelated UI/session APIs. Only cwd is consumed
// by this adapter; event fixtures below satisfy the actual Pi 1.4.0 declarations.
const context = (cwd: string): ExtensionContext =>
	({ cwd }) as ExtensionContext;
const options = (cwd: string): NormalizedBuildSystemPromptOptions => ({
	cwd,
	selectedTools: ['write', 'edit'],
	hiddenTools: [],
	toolSnippets: {},
	toolGuidelines: {},
	promptGuidelines: [],
	appendSystemPrompt: '',
	sections: { existing: 'another extension' },
	contextFiles: [],
	skills: []
});

describe('Pi extension wiring', () => {
	let directory: string;
	let handlers: Map<string, unknown>;
	let sendMessage: ReturnType<typeof mock<ExtensionAPI['sendMessage']>>;
	const handler = <E, R = undefined>(
		name: string
	): ExtensionHandler<E, R> => {
		const value = handlers.get(name);
		expect(typeof value).toBe('function');
		return value as ExtensionHandler<E, R>;
	};
	beforeEach(async () => {
		directory = await mkdtemp(path.join(tmpdir(), 'enfect-pi-extension-'));
		handlers = new Map();
		sendMessage = mock(() => {});
		const pi: Pick<ExtensionAPI, 'on' | 'sendMessage'> = {
			on(event, callback) {
				handlers.set(event, callback);
				return () => {};
			},
			sendMessage
		};
		for (const catalog of ['guidance', 'patterns'])
			await symlink(
				path.resolve(import.meta.dirname, '../../../packages', catalog),
				path.join(directory, catalog),
				'dir'
			);
		await registerEnfect(pi, directory);
	});
	afterEach(async () => {
		await rm(directory, { recursive: true, force: true });
	});

	it('injects every complete guidance document for user and custom starts without duplication', async () => {
		const promptOptions = options(directory);
		const start = handler<BeforeAgentStartEvent>('before_agent_start');
		const user = {
			type: 'before_agent_start',
			messageType: 'user',
			prompt: 'write code',
			systemPrompt: 'original prompt',
			systemPromptOptions: promptOptions
		} satisfies BeforeAgentStartEvent;
		await start(user, context(directory));
		const first = promptOptions.sections.enfect ?? '';
		const guidance = await loadGuidance(path.join(directory, 'guidance'));
		expect(first.startsWith(guidance)).toBe(true);
		expect(first.length).toBeGreaterThan(60000);
		expect(first).toContain('Enfect policy:');
		expect(first).toContain('/skill:effect-schema-v4');
		await start(
			{
				type: 'before_agent_start',
				messageType: 'custom',
				message: {
					role: 'custom',
					customType: 'test',
					content: 'continue',
					display: false,
					timestamp: 1
				},
				systemPrompt: first,
				systemPromptOptions: promptOptions
			} satisfies BeforeAgentStartEvent,
			context(directory)
		);
		expect(promptOptions.sections.enfect).toBe(first);
		expect(promptOptions.sections.existing).toBe('another extension');
	});

	const review = async (parentToolCallId?: string) => {
		const nested =
			parentToolCallId === undefined ? {} : { parentToolCallId };
		await handler<ToolCallEvent>('tool_call')(
			{
				type: 'tool_call',
				toolName: 'write',
				toolCallId: 'parent/1',
				...nested,
				input: {
					path: 'example.ts',
					content: 'const value = input as any;'
				}
			} satisfies ToolCallEvent,
			context(directory)
		);
		await writeFile(
			path.join(directory, 'example.ts'),
			'const value = input as any;'
		);
		const event = {
			type: 'tool_result',
			toolName: 'write',
			toolCallId: 'parent/1',
			...nested,
			input: { path: 'example.ts' },
			content: [{ type: 'text', text: 'Successfully wrote file.' }],
			details: undefined,
			isError: false
		} satisfies ToolResultEvent;
		const after = handler<ToolResultEvent, ToolResultEventResult>(
			'tool_result'
		);
		return { event, after, result: await after(event, context(directory)) };
	};

	it('annotates normal tools without sending duplicate custom messages', async () => {
		const { result } = await review();
		expect(JSON.stringify(result)).toContain('avoid-any');
		expect(sendMessage).not.toHaveBeenCalled();
	});

	it('steers nested findings once even when their parent discards child results', async () => {
		const { event, after, result } = await review('parent');
		expect(JSON.stringify(result)).toContain('avoid-any');
		expect(sendMessage).toHaveBeenCalledTimes(1);
		expect(sendMessage).toHaveBeenCalledWith(
			{
				customType: 'enfect-review',
				content: expect.stringContaining('avoid-any'),
				display: false
			},
			{ triggerTurn: true, deliverAs: 'steer' }
		);
		await after(event, context(directory));
		expect(sendMessage).toHaveBeenCalledTimes(1);
	});

	it('preserves advisory results if nested custom-message delivery fails', async () => {
		sendMessage.mockImplementation(() => {
			throw new Error('parent already ended');
		});
		expect(JSON.stringify((await review('parent')).result)).toContain(
			'avoid-any'
		);
	});

	it('clears pending writes on reload, resume, fork, new and startup', async () => {
		for (const reason of [
			'reload',
			'resume',
			'fork',
			'new',
			'startup'
		] as const) {
			const { event, after } = await review();
			await handler<ToolCallEvent>('tool_call')(
				{
					type: 'tool_call',
					toolName: 'write',
					toolCallId: event.toolCallId,
					input: {
						path: 'example.ts',
						content: 'const value = input as any;'
					}
				},
				context(directory)
			);
			await handler<SessionStartEvent>('session_start')(
				{ type: 'session_start', reason },
				context(directory)
			);
			expect(await after(event, context(directory))).toBeUndefined();
		}
	});
});

it('formats remediation skill references using Pi syntax', () => {
	const pattern = new Pattern.Value({
		name: 'example',
		description: '',
		event: 'after',
		toolRegex: 'write',
		level: 'warning',
		glob: undefined,
		ignoreGlob: undefined,
		detector: new Pattern.RegexDetector({
			pattern: 'example',
			matchInComments: false
		}),
		guidance: '',
		suggestedSkills: ['effect-schema-v4'],
		sourcePath: 'example.md'
	});
	expect(withPiSkillReferences('Load `effect-schema-v4`.', [pattern])).toBe(
		'Load `/skill:effect-schema-v4`.'
	);
});
