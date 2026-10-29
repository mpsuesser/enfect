import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'bun:test';

interface Manifest {
	readonly version: string;
	readonly dependencies?: Readonly<Record<string, string>>;
	readonly imports?: Readonly<Record<string, string>>;
	readonly plugins?: ReadonlyArray<{
		readonly version?: string;
		readonly source?: {
			readonly package?: string;
			readonly version?: string;
		};
	}>;
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
				'plugins/codex/package.json',
				'plugins/codex/.codex-plugin/plugin.json',
				'plugins/opencode/package.json',
				'plugins/oxlint/package.json',
				'plugins/oxlint/jsr.json',
				'plugins/pi/package.json'
			].map(manifest)
		);
		const [claude] = manifests;
		manifests.forEach(({ version }) => {
			expect(version).toBe(claude?.version ?? '');
		});
	});

	it('pin the Codex marketplace to the package version', async () => {
		const [marketplace, codex] = await Promise.all([
			manifest('.agents/plugins/marketplace.json'),
			manifest('plugins/codex/package.json')
		]);
		expect(
			marketplace.plugins?.find(
				(entry) => entry.source?.package === '@enfect/codex'
			)
		).toMatchObject({
			version: codex.version,
			source: { version: codex.version }
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
