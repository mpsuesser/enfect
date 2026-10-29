import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { isGuidanceDocument } from '@enfect/core/guidance';

export const PLUGIN_NAME = 'enfect';
export const ADDITIONAL_CONTEXT_LIMIT = 2_500;
// Codex 0.165.0 estimates tokens from UTF-8 bytes / 4. Leave room below 10 KB.
export const CONTEXT_LIMIT = 9_500;
export const codexSkill = (skill: string): string => `$${PLUGIN_NAME}:${skill}`;
export const POLICY = [
	'## Enfect policy',
	'',
	`- Bundled Effect skills are namespaced: invoke them as \`${codexSkill('<skill>')}\`, for example \`${codexSkill('effect-schema-v4')}\`.`,
	'- Treat post-write pattern feedback as an immediate review request. Fix valid findings before continuing.',
	'- Pattern findings are advisory: explain intentional exceptions or false positives instead of changing correct code.'
].join('\n');

/** Routing guidance goes first; preserve every document exactly after trimming its edges. */
export const loadSessionGuidance = async (
	directory: string
): Promise<string> => {
	const entries = (await readdir(directory))
		.filter(isGuidanceDocument)
		.toSorted(
			(left, right) =>
				Number(right === 'progressive-disclosure-guidance.md') -
					Number(left === 'progressive-disclosure-guidance.md') ||
				left.localeCompare(right)
		);
	const documents = await Promise.all(
		entries.map((entry) => readFile(path.join(directory, entry), 'utf8'))
	);
	return documents
		.map((document) => document.trim())
		.filter(Boolean)
		.join('\n\n---\n\n');
};

export const partHeader = (part: number, total: number): string =>
	`<!-- enfect guidance part ${part} of ${total}. Read the parts in order as one continuous document. -->\n\n`;

/** Split without dropping whitespace or splitting a Unicode code point. */
export const splitContext = (text: string, budget: number): Array<string> => {
	const parts: Array<string> = [];
	let current = '';
	let bytes = 0;
	for (const character of text) {
		const size = Buffer.byteLength(character);
		if (bytes + size > budget) {
			// Prefer a complete line while preserving the exact joining whitespace.
			const newline = current.lastIndexOf('\n');
			const end =
				newline > current.length / 2 ? newline + 1 : current.length;
			parts.push(current.slice(0, end));
			current = current.slice(end);
			bytes = Buffer.byteLength(current);
		}
		current += character;
		bytes += size;
	}
	if (current.length > 0) parts.push(current);
	return parts;
};

/** Policy/notices occupy their own part so concurrent handlers share stable boundaries. */
export const buildSessionParts = async (
	directory: string,
	notices: ReadonlyArray<string> = []
): Promise<ReadonlyArray<string>> => {
	const budget = CONTEXT_LIMIT - 256;
	const policy = [POLICY, ...notices].join('\n\n');
	if (Buffer.byteLength(policy) > budget)
		throw new Error('Enfect notices exceed the context budget');
	const bodies = [
		policy,
		...splitContext(await loadSessionGuidance(directory), budget)
	];
	return bodies.map(
		(body, index) => `${partHeader(index + 1, bodies.length)}${body}`
	);
};
