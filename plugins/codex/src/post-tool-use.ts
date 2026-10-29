import { readFile } from 'node:fs/promises';

import {
	bySeverity,
	feedbackPreamble,
	guidanceWithSkillHints
} from '@enfect/core/guidance';
import { matchesPattern } from '@enfect/core/pattern-matcher';
import type { Pattern } from '@enfect/core/pattern';
import {
	relativeToolPath,
	resolveToolPath
} from '@enfect/core/write-projection';
import { parsePatch, patchSpans } from './apply-patch.ts';
import { codexSkill, CONTEXT_LIMIT } from './session-context.ts';

const property = (value: unknown, key: string): unknown =>
	typeof value === 'object' && value !== null
		? Reflect.get(value, key)
		: undefined;
const stringProperty = (value: unknown, key: string): string | undefined => {
	const result = property(value, key);
	return typeof result === 'string' ? result : undefined;
};

export interface Finding {
	readonly filePath: string;
	readonly patterns: ReadonlyArray<Pattern.Value>;
}

/** Bound the complete multi-file review, keeping deferred guidance reachable by path. */
export const buildCodexFeedback = (
	findings: ReadonlyArray<Finding>,
	limit: number = CONTEXT_LIMIT
): string => {
	const sections: Array<string> = [];
	const append = (text: string): boolean => {
		if (Buffer.byteLength([...sections, text].join('\n\n')) > limit - 160)
			return false;
		sections.push(text);
		return true;
	};
	let omitted = 0;
	for (const finding of findings) {
		if (!append(feedbackPreamble('enfect', finding.filePath).join('\n'))) {
			omitted += finding.patterns.length;
			continue;
		}
		for (const pattern of bySeverity(finding.patterns)) {
			const head = `- ${pattern.name} [${pattern.level}]: ${pattern.description}`;
			if (
				!append(
					`${head}\n${guidanceWithSkillHints(pattern, codexSkill)}`
				) &&
				!append(
					`${head}\nRead the guidance in \`${pattern.sourcePath}\` before revising.`
				)
			)
				omitted += 1;
		}
	}
	if (omitted > 0)
		sections.push(
			`${omitted} further findings did not fit. Review the remaining patch against the bundled patterns catalog.`
		);
	return sections.join('\n\n');
};

/** Successful canonical apply_patch calls expose the patch in tool_input.command. */
export const postToolUseFeedback = async (
	payload: unknown,
	patterns: ReadonlyArray<Pattern.Value>
): Promise<string | undefined> => {
	if (stringProperty(payload, 'tool_name') !== 'apply_patch')
		return undefined;
	const response = stringProperty(payload, 'tool_response');
	// The CLI may wrap the successful apply_patch text in its timing/exit envelope.
	if (
		response === undefined ||
		!/(?:^|\n)Success\. Updated the following files:/.test(response) ||
		/(?:^|\n)Exit code: (?!0(?:\n|$))/.test(response)
	)
		return undefined;
	const command = stringProperty(property(payload, 'tool_input'), 'command');
	if (command === undefined) return undefined;
	let files;
	try {
		files = parsePatch(command);
	} catch {
		return undefined;
	}
	const directory = stringProperty(payload, 'cwd') ?? process.cwd();
	const findings: Array<Finding> = [];
	for (const file of files) {
		if (file.kind === 'delete') continue;
		const target = file.moveTo ?? file.path;
		let content: string;
		try {
			content = await readFile(
				resolveToolPath(directory, target),
				'utf8'
			);
		} catch {
			continue;
		}
		const spans = patchSpans(file, content);
		if (spans.length === 0) continue;
		const filePath = relativeToolPath(directory, target);
		const matched = patterns.filter((pattern) =>
			matchesPattern(
				'edit',
				{ filePath, content, changedSpans: spans },
				'after',
				pattern
			)
		);
		if (matched.length > 0) findings.push({ filePath, patterns: matched });
	}
	return findings.length === 0 ? undefined : buildCodexFeedback(findings);
};
