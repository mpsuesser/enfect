import { expect, it } from 'bun:test';
import { mkdtemp, mkdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

it('keeps regex reviews working in Node when the native addon is unavailable', async () => {
	const directory = await mkdtemp(
		path.join(tmpdir(), 'enfect-pi-no-native-')
	);
	try {
		await mkdir(path.join(directory, 'dist'));
		for (const catalog of ['guidance', 'patterns'])
			await symlink(
				path.resolve(import.meta.dirname, '../../../packages', catalog),
				path.join(directory, catalog),
				'dir'
			);
		const build = await Bun.build({
			entrypoints: [path.resolve(import.meta.dirname, '../src/index.ts')],
			target: 'node',
			format: 'esm',
			external: ['@ast-grep/napi', '@earendil-works/pi-*'],
			outdir: path.join(directory, 'dist')
		});
		expect(build.success).toBe(true);
		const script = `
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const bundle = pathToFileURL(process.cwd() + '/dist/index.js');
assert.throws(() => createRequire(bundle)('@ast-grep/napi'));
const { default: enfect } = await import(bundle.href);
const handlers = new Map();
await enfect({ on(name, handler) { handlers.set(name, handler); } });
const input = { path: 'example.ts', content: '// @ts-ignore\\nconst value = input as any;' };
await handlers.get('tool_call')({ type: 'tool_call', toolName: 'write', toolCallId: 'w', input }, { cwd: process.cwd() });
await writeFile(input.path, input.content);
const result = await handlers.get('tool_result')({ type: 'tool_result', toolName: 'write', toolCallId: 'w', input, content: [], isError: false, details: undefined });
const text = JSON.stringify(result);
assert(text.includes('avoid-ts-ignore'));
assert(!text.includes('- avoid-any [warning]'));
console.log('native unavailable; regex review passed; AST review skipped');
`;
		const process = Bun.spawn(
			['node', '--input-type=module', '-e', script],
			{
				cwd: directory,
				stdout: 'pipe',
				stderr: 'pipe'
			}
		);
		const [stdout, stderr, status] = await Promise.all([
			new Response(process.stdout).text(),
			new Response(process.stderr).text(),
			process.exited
		]);
		expect(stderr).toBe('');
		expect(status).toBe(0);
		expect(stdout).toContain('regex review passed');
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});
