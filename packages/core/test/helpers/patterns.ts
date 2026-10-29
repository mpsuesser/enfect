import path from 'node:path';

import { loadPatterns } from '../../src/pattern-catalog.ts';
import type { Pattern } from '../../src/pattern.ts';

const root = path.resolve(import.meta.dirname, '..', '..');

/** Absolute path to the authoritative guidance documents. */
export const GUIDANCE_DIRECTORY = path.join(root, 'guidance');

/** Absolute path to the authoritative pattern catalog. */
export const PATTERNS_DIRECTORY = path.join(root, 'patterns');

/** Absolute path to the authoritative skill catalog. */
export const SKILLS_DIRECTORY = path.join(root, 'skills');

/** Shared pattern catalog promise for detector tests. */
export const patterns = loadPatterns(PATTERNS_DIRECTORY);

/** Return a named pattern or fail the current test with a useful error. */
export const requirePattern = async (name: string): Promise<Pattern.Value> => {
	const pattern = (await patterns).find(
		(candidate) => candidate.name === name
	);
	if (pattern === undefined) throw new Error(`Missing pattern: ${name}`);
	return pattern;
};
