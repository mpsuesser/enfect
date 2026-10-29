import { loadPatterns } from '@enfect/core/pattern-catalog';
import type { Pattern } from '@enfect/core/pattern';

import { patternsDirectory } from '../../index.ts';

/** Shared pattern catalog promise for detector tests. */
export const patterns = loadPatterns(patternsDirectory);

/** Return a named pattern or fail the current test with a useful error. */
export const requirePattern = async (name: string): Promise<Pattern.Value> => {
	const pattern = (await patterns).find(
		(candidate) => candidate.name === name
	);
	if (pattern === undefined) throw new Error(`Missing pattern: ${name}`);
	return pattern;
};
