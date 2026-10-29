import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'bun:test';

import { commandsDirectory } from '../packages/commands/index.ts';
import { guidanceDirectory } from '../packages/guidance/index.ts';
import { patternsDirectory } from '../packages/patterns/index.ts';
import { skillsDirectory } from '../packages/skills/index.ts';

const isDocument = (name: string): boolean =>
	name.endsWith('.md') && name !== 'README.md';

const catalogs = [
	{
		name: 'commands',
		directory: commandsDirectory,
		count: 1,
		links: async (directory: string) =>
			(await readdir(directory)).filter(isDocument)
	},
	{
		name: 'guidance',
		directory: guidanceDirectory,
		count: 4,
		links: async (directory: string) =>
			(await readdir(directory)).filter(isDocument)
	},
	{
		name: 'patterns',
		directory: patternsDirectory,
		count: 45,
		links: async (directory: string) =>
			(await readdir(directory)).filter(isDocument)
	},
	{
		name: 'skills',
		directory: skillsDirectory,
		count: 54,
		links: async (directory: string) =>
			(await readdir(directory, { withFileTypes: true }))
				.filter(
					(entry) =>
						entry.isDirectory() && entry.name !== 'node_modules'
				)
				.map((entry) => `${entry.name}/SKILL.md`)
	}
];

describe('catalog READMEs', () => {
	it.each(catalogs)(
		'$name links every document exactly once',
		async ({ directory, count, links }) => {
			const [readme, paths] = await Promise.all([
				readFile(path.join(directory, 'README.md'), 'utf8'),
				links(directory)
			]);
			expect(paths).toHaveLength(count);
			paths.forEach((link) => {
				expect(readme.split(`](${link})`)).toHaveLength(2);
			});
		}
	);
});
