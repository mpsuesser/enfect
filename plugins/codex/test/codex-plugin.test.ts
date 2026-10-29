import {
	mkdir,
	mkdtemp,
	readdir,
	readFile,
	rm,
	writeFile
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';

import { commandsDirectory } from '@enfect/commands';
import { loadCommands } from '@enfect/core/commands';
import { parseFrontmatter } from '@enfect/core/frontmatter';
import { isGuidanceDocument } from '@enfect/core/guidance';
import { guidanceDirectory } from '@enfect/guidance';
import { patterns, requirePattern } from '@enfect/patterns/testing';
import { parsePatch, patchSpans } from '../src/apply-patch.ts';
import { commandSkill, stageCommandSkills } from '../src/command-skills.ts';
import { runtimeManifest } from '../src/dependencies.ts';
import {
	buildCodexFeedback,
	postToolUseFeedback
} from '../src/post-tool-use.ts';
import {
	ADDITIONAL_CONTEXT_LIMIT,
	buildSessionParts,
	CONTEXT_LIMIT,
	loadSessionGuidance,
	POLICY,
	splitContext
} from '../src/session-context.ts';
import manifest from '../.codex-plugin/plugin.json';
import packageJson from '../package.json';

const root = path.resolve(import.meta.dirname, '..');
const directories: Array<string> = [];
const temporaryDirectory = async (): Promise<string> => {
	const directory = await mkdtemp(path.join(tmpdir(), 'enfect-codex-test-'));
	directories.push(directory);
	return directory;
};
afterEach(async () => {
	await Promise.all(
		directories
			.splice(0)
			.map((directory) => rm(directory, { recursive: true, force: true }))
	);
});
const patch = (body: string): string =>
	`*** Begin Patch\n${body}\n*** End Patch`;
const spans = (body: string, content: string) => {
	const file = parsePatch(patch(body))[0];
	if (file === undefined) throw new Error('Missing test operation');
	return patchSpans(file, content).map((span) =>
		content.slice(span.start, span.end)
	);
};
const payload = (cwd: string, body: string) => ({
	hook_event_name: 'PostToolUse',
	session_id: '01900000-0000-7000-8000-000000000001',
	turn_id: 'turn-1',
	tool_use_id: 'call-1',
	model: 'example-model',
	permission_mode: 'default',
	cwd,
	tool_name: 'apply_patch',
	tool_input: { command: patch(body) },
	tool_response: 'Success. Updated the following files:\nM app.ts\n'
});

describe('Codex package and hooks', () => {
	it('ships a versioned plugin with all runtime resources', () => {
		expect(packageJson.name).toBe('@enfect/codex');
		expect(manifest.name).toBe('enfect');
		expect(manifest.version).toBe(packageJson.version);
		expect(manifest.skills).toBe('./skills/');
		expect(manifest.hooks).toBe('./hooks/hooks.json');
		for (const entry of [
			'.codex-plugin',
			'hooks',
			'dist',
			'guidance',
			'patterns',
			'skills',
			'commands',
			'docs'
		])
			expect(packageJson.files).toContain(entry);
		expect(JSON.parse(runtimeManifest()).dependencies).toEqual(
			packageJson.dependencies
		);
	});
	it('declares a shell-string handler per guidance part and canonical patch matching', async () => {
		const config = JSON.parse(
			await readFile(path.join(root, 'hooks/hooks.json'), 'utf8')
		);
		const parts = await buildSessionParts(guidanceDirectory);
		for (const [event, command] of [
			['SessionStart', 'session-start'],
			['SubagentStart', 'subagent-start']
		]) {
			const entries = config.hooks[event ?? ''];
			expect(entries).toHaveLength(parts.length);
			for (const [index, entry] of entries.entries()) {
				expect(entry.hooks).toHaveLength(1);
				const handler = entry.hooks[0];
				expect(handler.command).toContain(
					`node "\${PLUGIN_ROOT}/dist/hook.mjs" ${command} ${index + 1}`
				);
				expect(handler.args).toBeUndefined();
				expect(handler.additionalContextLimit).toBe(
					ADDITIONAL_CONTEXT_LIMIT
				);
			}
		}
		expect(config.hooks.PostToolUse[0].matcher).toBe('^apply_patch$');
	});
	it('delivers the complete guidance byte-for-byte within every output limit', async () => {
		const [plain, noticed] = await Promise.all([
			buildSessionParts(guidanceDirectory),
			buildSessionParts(guidanceDirectory, ['notice'])
		]);
		const body = (part: string) => part.replace(/^<!--[^\n]*-->\n\n/, '');
		for (const part of noticed) {
			expect(Buffer.byteLength(part)).toBeLessThanOrEqual(CONTEXT_LIMIT);
			expect(Math.ceil(Buffer.byteLength(part) / 4)).toBeLessThanOrEqual(
				ADDITIONAL_CONTEXT_LIMIT
			);
		}
		expect(body(plain[0] ?? '')).toBe(POLICY);
		expect(plain[0]).toContain('$enfect:effect-schema-v4');
		expect(noticed.slice(1)).toEqual(plain.slice(1));
		const delivered = plain.slice(1).map(body).join('');
		expect(delivered).toBe(await loadSessionGuidance(guidanceDirectory));
		for (const entry of (await readdir(guidanceDirectory)).filter(
			isGuidanceDocument
		))
			expect(delivered).toContain(
				(
					await readFile(path.join(guidanceDirectory, entry), 'utf8')
				).trim()
			);
		expect(
			delivered.startsWith(
				(
					await readFile(
						path.join(
							guidanceDirectory,
							'progressive-disclosure-guidance.md'
						),
						'utf8'
					)
				).trim()
			)
		).toBe(true);
	});
	it('preserves multibyte text and long unbroken lines', () => {
		const text = '😀éx'.repeat(8_000);
		const parts = splitContext(text, 9_000);
		expect(parts.join('')).toBe(text);
		for (const part of parts)
			expect(Buffer.byteLength(part)).toBeLessThanOrEqual(9_000);
	});
	it('fails silently on invalid input and unknown entrypoint commands', async () => {
		for (const command of ['post-tool-use', 'unknown']) {
			const result = Bun.spawn(
				['node', path.join(root, 'dist/hook.mjs'), command],
				{
					stdin: new Blob(['invalid JSON']),
					stdout: 'pipe',
					stderr: 'pipe'
				}
			);
			expect(await result.exited).toBe(0);
			expect(await new Response(result.stdout).text()).toBe('');
			expect(await new Response(result.stderr).text()).toBe('');
		}
	});
	it('emits a Codex hookSpecificOutput envelope from the built Node entrypoint', async () => {
		const result = Bun.spawn(
			['node', path.join(root, 'dist/hook.mjs'), 'subagent-start', '1'],
			{ stdout: 'pipe', stderr: 'pipe' }
		);
		const output = JSON.parse(await new Response(result.stdout).text());
		expect(await result.exited).toBe(0);
		expect(output.hookSpecificOutput.hookEventName).toBe('SubagentStart');
		expect(output.hookSpecificOutput.additionalContext).toContain(POLICY);
	});
	it('shell handlers return zero and no output when Node is absent', async () => {
		const config = JSON.parse(
			await readFile(path.join(root, 'hooks/hooks.json'), 'utf8')
		);
		const result = Bun.spawn(
			['/bin/sh', '-c', config.hooks.SessionStart[0].hooks[0].command],
			{ env: { PATH: '/nonexistent' }, stdout: 'pipe', stderr: 'pipe' }
		);
		expect(await result.exited).toBe(0);
		expect(await new Response(result.stdout).text()).toBe('');
		expect(await new Response(result.stderr).text()).toBe('');
	});
});

describe('apply_patch projection', () => {
	it('parses add/update/delete/move and multiple chunks', () => {
		const files = parsePatch(
			patch(
				'*** Environment ID: local\n*** Add File: a.ts\n+x\n*** Update File: old.ts\n*** Move to: new.ts\n@@ function f() {\n-old\n+new\n@@\n tail\n+end\n*** End of File\n*** Delete File: gone.ts'
			)
		);
		expect(
			files.map((file) => [file.kind, file.path, file.moveTo])
		).toEqual([
			['add', 'a.ts', undefined],
			['update', 'old.ts', 'new.ts'],
			['delete', 'gone.ts', undefined]
		]);
		expect(files[1]?.chunks).toHaveLength(2);
		expect(files[1]?.chunks[1]?.endOfFile).toBe(true);
	});
	it('checks an added file in full and skips a deleted file', () => {
		expect(
			spans('*** Add File: a.ts\n+const a = 1;', 'const a = 1;\n')
		).toEqual(['const a = 1;\n']);
		expect(spans('*** Delete File: a.ts', 'anything')).toEqual([]);
	});
	it('uses anchors to distinguish duplicate lines and excludes retained context', () => {
		const content =
			'function first() {\nconst x = input as any;\n}\nfunction second() {\nconst x = input as any;\n}\n';
		const file = parsePatch(
			patch(
				'*** Update File: a.ts\n@@ function second() {\n-const x = input;\n+const x = input as any;\n }'
			)
		)[0];
		if (file === undefined) throw new Error('missing file');
		const result = patchSpans(file, content);
		expect(result).toEqual([
			{
				start: content.lastIndexOf('const x'),
				end:
					content.lastIndexOf('const x') +
					'const x = input as any;\n'.length
			}
		]);
	});
	it('finds multiple hunks and context-free appended lines', () => {
		expect(
			spans(
				'*** Update File: a.ts\n@@\n start\n-old\n+first\n middle\n@@\n next\n+second\n end',
				'start\nfirst\nmiddle\nnext\nsecond\nend\n'
			)
		).toEqual(['first\n', 'second\n']);
		expect(
			spans('*** Update File: a.ts\n@@\n+same', 'same\nsame\n')
		).toEqual(['same\n']);
	});
	it('honors EOF anchors and trailing newline sentinels', () => {
		expect(
			spans(
				'*** Update File: a.ts\n@@\n-old\n+same\n*** End of File',
				'same\nother\nsame\n'
			)
		).toEqual(['same\n']);
		expect(
			spans(
				'*** Update File: a.ts\n@@\n-old\n+new\n \n*** End of File',
				'new\n'
			)
		).toEqual(['new\n']);
	});
	it('preserves CRLF offsets and matches whitespace-tolerant context', () => {
		expect(
			spans(
				'*** Update File: a.ts\n@@\n header\n-old\n+new',
				'  header\r\nnew\r\n'
			)
		).toEqual(['new\r\n']);
	});
	it('keeps explicit added lines even if identical to removed lines', () => {
		expect(
			spans(
				'*** Update File: a.ts\n@@\n-const x = a as any;\n+const x = a as any;',
				'const x = a as any;\n'
			)
		).toEqual(['const x = a as any;\n']);
	});
	it('ignores removal-only, move-only, and unlocatable hunks', () => {
		expect(
			spans(
				'*** Update File: a.ts\n@@\n header\n-deleted\n tail',
				'header\ntail\n'
			)
		).toEqual([]);
		expect(
			spans('*** Update File: a.ts\n*** Move to: b.ts', 'old\n')
		).toEqual([]);
		expect(
			spans(
				'*** Update File: a.ts\n@@ missing anchor\n-old\n+new',
				'new\n'
			)
		).toEqual([]);
		expect(
			spans('*** Update File: a.ts\n@@\n-old\n+missing', 'old\n')
		).toEqual([]);
	});
	it('accepts the supported heredoc wrapper and rejects malformed patches', () => {
		expect(
			parsePatch(`<<'EOF'\n${patch('*** Add File: a.ts\n+x')}\nEOF`)
		).toHaveLength(1);
		for (const input of [
			'bad',
			patch('+orphan'),
			patch('*** Add File: a.ts\n-invalid'),
			patch('*** Update File: a.ts\ninvalid')
		])
			expect(() => parsePatch(input)).toThrow();
	});
});

describe('post-write reviews', () => {
	it('accepts the live CLI timing envelope and rejects nonzero exits', async () => {
		const directory = await temporaryDirectory();
		await writeFile(
			path.join(directory, 'app.ts'),
			'export const value = input as any;\n'
		);
		const input = payload(
			directory,
			'*** Add File: app.ts\n+export const value = input as any;'
		);
		const wrapped = {
			...input,
			tool_response: `Exit code: 0\nWall time: 0 seconds\nOutput:\n${input.tool_response}`
		};
		expect(await postToolUseFeedback(wrapped, await patterns)).toContain(
			'avoid-any'
		);
		expect(
			await postToolUseFeedback(
				{
					...wrapped,
					tool_response: wrapped.tool_response.replace(
						'Exit code: 0',
						'Exit code: 1'
					)
				},
				await patterns
			)
		).toBeUndefined();
	});

	it('reports newly added violations in realistic multi-file payloads including a move', async () => {
		const directory = await temporaryDirectory();
		await writeFile(
			path.join(directory, 'app.ts'),
			'export const existing = old as any;\nexport const now = Date.now();\n'
		);
		await writeFile(
			path.join(directory, 'moved.ts'),
			'export const value = input as any;\n'
		);
		const feedback = await postToolUseFeedback(
			payload(
				directory,
				'*** Update File: app.ts\n@@\n export const existing = old as any;\n+export const now = Date.now();\n*** Update File: old.ts\n*** Move to: moved.ts\n@@\n-export const value = input;\n+export const value = input as any;\n*** Delete File: gone.ts'
			),
			await patterns
		);
		expect(feedback).toContain('enfect review request:');
		expect(feedback).toContain('File: `app.ts`');
		expect(feedback).toContain('use-clock-service');
		expect(feedback).toContain('File: `moved.ts`');
		expect(feedback).toContain('avoid-any');
	});
	it('does not report preexisting violations or assertions in comments', async () => {
		const directory = await temporaryDirectory();
		await writeFile(
			path.join(directory, 'app.ts'),
			'const existing = old as any;\n// const comment = input as any;\nexport const value = 1;\n'
		);
		expect(
			await postToolUseFeedback(
				payload(
					directory,
					'*** Update File: app.ts\n@@\n const existing = old as any;\n+// const comment = input as any;\n+export const value = 1;'
				),
				await patterns
			)
		).toBeUndefined();
	});
	it('handles absolute paths, additions, and missing files independently', async () => {
		const directory = await temporaryDirectory();
		const absolute = path.join(directory, 'app.ts');
		await writeFile(absolute, 'export const value = input as any;\n');
		expect(
			await postToolUseFeedback(
				payload(
					directory,
					`*** Add File: missing.ts\n+x\n*** Add File: ${absolute}\n+export const value = input as any;`
				),
				await patterns
			)
		).toContain('avoid-any');
	});
	it('ignores failed tools, unrelated calls, missing command and malformed payloads', async () => {
		const directory = await temporaryDirectory();
		await writeFile(
			path.join(directory, 'app.ts'),
			'const value = x as any;\n'
		);
		const valid = payload(
			directory,
			'*** Add File: app.ts\n+const value = x as any;'
		);
		for (const invalid of [
			null,
			{},
			{ ...valid, tool_name: 'Bash' },
			{ ...valid, tool_response: 'Error: failed' },
			{ ...valid, tool_response: {} },
			{ ...valid, tool_input: {} },
			{ ...valid, tool_input: { command: 'malformed' } }
		])
			expect(
				await postToolUseFeedback(invalid, await patterns)
			).toBeUndefined();
	});
	it('bounds multi-file feedback and points to guidance that did not fit', async () => {
		const selected = await Promise.all(
			['avoid-any', 'avoid-node-imports', 'prefer-effect-fn'].map(
				requirePattern
			)
		);
		const feedback = buildCodexFeedback(
			[{ filePath: 'app.ts', patterns: selected }],
			3_000
		);
		expect(Buffer.byteLength(feedback)).toBeLessThanOrEqual(3_000);
		for (const pattern of selected)
			expect(feedback).toContain(pattern.name);
		const large = buildCodexFeedback(
			Array.from({ length: 100 }, () => ({
				filePath: 'app.ts',
				patterns: selected
			}))
		);
		expect(Buffer.byteLength(large)).toBeLessThanOrEqual(CONTEXT_LIMIT);
		expect(large).toContain('further findings did not fit');
	});
});

describe('commands as manual skills', () => {
	it('generates a named skill per command and adapts arguments to caller text', async () => {
		for (const command of await loadCommands(commandsDirectory)) {
			const rendered = commandSkill(command);
			expect(parseFrontmatter(rendered)).toEqual({
				name: command.name,
				description: command.description
			});
			expect(rendered).not.toContain('$ARGUMENTS');
			expect(rendered).toContain('text that follows this skill mention');
			expect(
				await readFile(
					path.join(root, 'skills', command.name, 'SKILL.md'),
					'utf8'
				)
			).toBe(rendered);
			expect(
				await readFile(
					path.join(
						root,
						'skills',
						command.name,
						'agents/openai.yaml'
					),
					'utf8'
				)
			).toBe('policy:\n    allow_implicit_invocation: false\n');
		}
	});
	it('fails before writing any command when a skill name collides', async () => {
		const directory = await temporaryDirectory();
		const skills = path.join(directory, 'skills');
		await mkdir(path.join(skills, 'enfect-hello-world'), {
			recursive: true
		});
		expect(stageCommandSkills(commandsDirectory, skills)).rejects.toThrow(
			'collides with an Effect skill'
		);
		expect(await readdir(path.join(skills, 'enfect-hello-world'))).toEqual(
			[]
		);
	});
});
