// Installed plugins can't read files outside their own package, so each agent
// plugin build copies the shared catalogs into its package root. Only content is
// copied: package manifests, READMEs, and tests stay behind.
import { cp, readdir, rm } from 'node:fs/promises';
import path from 'node:path';

import {
	docsDirectory,
	guidanceDirectory
} from '../packages/guidance/index.ts';
import { patternsDirectory } from '../packages/patterns/index.ts';
import { skillsDirectory } from '../packages/skills/index.ts';

const destination = process.cwd();

const isMarkdownDocument = (entry: string): boolean =>
	entry.endsWith('.md') && entry !== 'README.md';

const stage = async (
	source: string,
	target: string,
	include: (entry: string) => Promise<boolean> | boolean
): Promise<void> => {
	const targetDirectory = path.join(destination, target);
	await rm(targetDirectory, { recursive: true, force: true });
	const entries = await readdir(source);
	await Promise.all(
		entries.map(async (entry) => {
			if (!(await include(entry))) return;
			await cp(
				path.join(source, entry),
				path.join(targetDirectory, entry),
				{
					recursive: true
				}
			);
		})
	);
};

const isSkill = async (entry: string): Promise<boolean> =>
	(
		await readdir(path.join(skillsDirectory, entry)).catch(
			(): ReadonlyArray<string> => []
		)
	).includes('SKILL.md');

await Promise.all([
	stage(guidanceDirectory, 'guidance', isMarkdownDocument),
	stage(docsDirectory, 'docs', isMarkdownDocument),
	stage(patternsDirectory, 'patterns', isMarkdownDocument),
	stage(skillsDirectory, 'skills', isSkill),
	cp(
		path.join(import.meta.dirname, '..', 'LICENSE'),
		path.join(destination, 'LICENSE')
	)
]);
