import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'bun:test';

interface Manifest {
	readonly version: string;
	readonly dependencies?: Readonly<Record<string, string>>;
	readonly imports?: Readonly<Record<string, string>>;
	readonly workspaces?: {
		readonly catalog: Readonly<Record<string, string>>;
	};
}

const manifest = async (relative: string): Promise<Manifest> =>
	JSON.parse(
		await readFile(new URL(`../${relative}`, import.meta.url), 'utf8')
	);

describe('release manifests', () => {
	it('release every published package at one version', async () => {
		const manifests = await Promise.all(
			[
				'plugins/claude/package.json',
				'plugins/claude/.claude-plugin/plugin.json',
				'plugins/opencode/package.json',
				'plugins/oxlint/package.json',
				'plugins/oxlint/jsr.json'
			].map(manifest)
		);
		const [claude] = manifests;
		manifests.forEach(({ version }) => {
			expect(version).toBe(claude?.version ?? '');
		});
	});

	it('map the JSR imports to the npm dependency versions', async () => {
		const [root, oxlint, jsr] = await Promise.all([
			manifest('package.json'),
			manifest('plugins/oxlint/package.json'),
			manifest('plugins/oxlint/jsr.json')
		]);
		const effect = root.workspaces?.catalog['effect'] ?? '';
		const expected = Object.fromEntries(
			Object.entries(oxlint.dependencies ?? {}).map(([name, range]) => [
				name,
				`npm:${name}@${range === 'catalog:' ? effect : range}`
			])
		);
		expect<unknown>(jsr.imports).toEqual({
			...expected,
			'effect/': `npm:/effect@${effect}/`
		});
	});
});
