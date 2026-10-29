import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import type {
	ToolCallEvent,
	ToolResultEvent
} from '@earendil-works/pi-coding-agent';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { loadAstGrep } from '@enfect/core/ast-grep';
import { loadPatterns } from '@enfect/core/pattern-catalog';
import { createPatternEnforcer } from '../src/enforcer.ts';
import { normalizeToolPath } from '../src/paths.ts';

const patterns = await loadPatterns(
	path.resolve(import.meta.dirname, '../../../packages/patterns')
);
const call = (
	toolName: 'write' | 'edit',
	filePath: string,
	id = 'call_1'
): ToolCallEvent =>
	toolName === 'write'
		? {
				type: 'tool_call',
				toolName,
				toolCallId: id,
				input: {
					path: filePath,
					content: 'payload is not the final file'
				}
			}
		: {
				type: 'tool_call',
				toolName,
				toolCallId: id,
				input: {
					path: filePath,
					edits: [{ oldText: 'before', newText: 'after' }]
				}
			};

const result = (
	toolName: 'write' | 'edit',
	id = 'call_1',
	isError = false
): ToolResultEvent => ({
	type: 'tool_result',
	toolName,
	toolCallId: id,
	input: { path: 'example.ts' },
	content: [{ type: 'text', text: 'Successfully wrote file.' }],
	details:
		toolName === 'edit'
			? {
					diff: '+after',
					patch: '@@ -1 +1 @@\n-before\n+after',
					firstChangedLine: 1
				}
			: undefined,
	isError
});

describe('Pi post-write reviews', () => {
	let directory: string;
	let enforcer: ReturnType<typeof createPatternEnforcer>;
	beforeEach(async () => {
		directory = await mkdtemp(path.join(tmpdir(), 'enfect-pi-unit-'));
		enforcer = createPatternEnforcer(patterns);
	});
	afterEach(async () => {
		await rm(directory, { recursive: true, force: true });
	});

	it('loads the normal native dependency and reviews actual final write contents', async () => {
		expect(loadAstGrep()).toBeDefined();
		await enforcer.before(call('write', 'example.ts'), directory);
		await writeFile(
			path.join(directory, 'example.ts'),
			'const value = input as any;\n'
		);
		const event = {
			...result('write'),
			structuredContent: { saved: true }
		} satisfies ToolResultEvent;
		const feedback = await enforcer.after(event);
		expect(feedback?.content?.[0]).toEqual(event.content[0]);
		expect(JSON.stringify(feedback?.content)).toContain('avoid-any');
		expect(feedback?.structuredContent).toEqual({ saved: true });
		expect(event.content).toHaveLength(1);
		expect(
			await readFile(path.join(directory, 'example.ts'), 'utf8')
		).toContain('as any');
		expect(await enforcer.after(event)).toBeUndefined();
	});

	it('does not flag preexisting violations outside edited spans', async () => {
		const file = path.join(directory, 'example.ts');
		await writeFile(file, 'const old = input as any;\nconst good = 1;\n');
		await enforcer.before(call('edit', file), directory);
		await writeFile(file, 'const old = input as any;\nconst good = 2;\n');
		expect(await enforcer.after(result('edit'))).toBeUndefined();
	});

	it('checks complete final context around a multi-edit insertion', async () => {
		const file = path.join(directory, 'example.ts');
		await writeFile(file, 'const value = input;\nconst other = 1;\n');
		const event = {
			type: 'tool_call',
			toolName: 'edit',
			toolCallId: 'call_1',
			input: {
				path: file,
				edits: [
					{ oldText: 'input', newText: 'input as any' },
					{ oldText: 'other = 1', newText: 'other = 2' }
				]
			}
		} satisfies ToolCallEvent;
		await enforcer.before(event, directory);
		await writeFile(
			file,
			'const value = input as any;\nconst other = 2;\n'
		);
		expect(JSON.stringify(await enforcer.after(result('edit')))).toContain(
			'avoid-any'
		);
	});

	it('reviews a full write even when the file already contains the same violation', async () => {
		await writeFile(
			path.join(directory, 'example.ts'),
			'const value = input as any;\n'
		);
		await enforcer.before(call('write', 'example.ts'), directory);
		expect(JSON.stringify(await enforcer.after(result('write')))).toContain(
			'avoid-any'
		);
	});

	it('skips failed tools, consumes their snapshots, and clears abandoned calls', async () => {
		await enforcer.before(call('write', 'example.ts'), directory);
		await writeFile(
			path.join(directory, 'example.ts'),
			'const value = input as any;\n'
		);
		expect(
			await enforcer.after(result('write', 'call_1', true))
		).toBeUndefined();
		expect(await enforcer.after(result('write'))).toBeUndefined();
		await enforcer.before(call('write', 'example.ts'), directory);
		enforcer.clear();
		expect(await enforcer.after(result('write'))).toBeUndefined();
	});

	it('keeps parallel call IDs independent and handles Pi path decorations', async () => {
		await Promise.all([
			enforcer.before(
				call('write', '@one\u202fexample.ts', 'a'),
				directory
			),
			enforcer.before(
				call(
					'write',
					pathToFileURL(path.join(directory, 'two.ts')).href,
					'b'
				),
				directory
			)
		]);
		await Promise.all([
			writeFile(
				path.join(directory, 'one example.ts'),
				'const one = input as any;'
			),
			writeFile(
				path.join(directory, 'two.ts'),
				'const two = input as any;'
			)
		]);
		expect(
			JSON.stringify(await enforcer.after(result('write', 'b')))
		).toContain('two.ts');
		expect(
			JSON.stringify(await enforcer.after(result('write', 'a')))
		).toContain('one example.ts');
	});

	it('ignores unchanged edits, comments, unrelated tools and non-code files', async () => {
		await writeFile(
			path.join(directory, 'example.ts'),
			'const value = input as any;'
		);
		await enforcer.before(call('edit', 'example.ts'), directory);
		expect(await enforcer.after(result('edit'))).toBeUndefined();
		await enforcer.before(call('write', 'comment.ts'), directory);
		await writeFile(
			path.join(directory, 'comment.ts'),
			'// input as any\nconst x = 1;'
		);
		expect(await enforcer.after(result('write'))).toBeUndefined();
		await enforcer.before(call('write', 'notes.txt'), directory);
		await writeFile(path.join(directory, 'notes.txt'), 'input as any');
		expect(await enforcer.after(result('write'))).toBeUndefined();
		await enforcer.before(
			{
				type: 'tool_call',
				toolName: 'bash',
				toolCallId: 'call_1',
				input: { command: 'true' }
			},
			directory
		);
		expect(await enforcer.after(result('write'))).toBeUndefined();
	});

	it('does not throw for custom malformed payloads or missing final files', async () => {
		await enforcer.before(
			{
				type: 'tool_call',
				toolName: 'write',
				toolCallId: 'call_1',
				input: { path: 42 }
			},
			directory
		);
		expect(await enforcer.after(result('write'))).toBeUndefined();
		await enforcer.before(call('write', 'missing.ts'), directory);
		expect(await enforcer.after(result('write'))).toBeUndefined();
		const hostile = new Proxy(
			{},
			{
				get() {
					throw new Error('custom input');
				}
			}
		);
		await enforcer.before(
			{
				type: 'tool_call',
				toolName: 'write',
				toolCallId: 'call_1',
				input: hostile
			},
			directory
		);
	});
});

it('normalizes home paths without trimming valid filename whitespace', () => {
	expect(normalizeToolPath('@~/example.ts')).toBe(
		path.join(homedir(), 'example.ts')
	);
	expect(normalizeToolPath('~')).toBe(homedir());
	expect(normalizeToolPath(' file.ts ')).toBe(' file.ts ');
});
