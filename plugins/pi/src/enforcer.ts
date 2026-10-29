import type {
	ToolCallEvent,
	ToolResultEvent,
	ToolResultEventResult
} from '@earendil-works/pi-coding-agent';

import { buildPatternFeedback } from '@enfect/core/guidance';
import type { Pattern } from '@enfect/core/pattern';
import { matchesPattern } from '@enfect/core/pattern-matcher';
import {
	actualProjection,
	type FileSnapshot,
	snapshotFile
} from '@enfect/core/write-projection';
import { normalizeToolPath } from './paths.ts';
import { withPiSkillReferences } from './policy.ts';

interface PendingWrite {
	readonly file: FileSnapshot;
	readonly fullFile: boolean;
}

/** Local-file snapshots keyed by call ID support parallel writes to different files. */
export const createPatternEnforcer = (
	patterns: ReadonlyArray<Pattern.Value>
) => {
	const pending = new Map<string, PendingWrite>();
	return {
		clear: (): void => pending.clear(),
		before: async (event: ToolCallEvent, cwd: string): Promise<void> => {
			try {
				pending.delete(event.toolCallId);
				if (
					(event.toolName !== 'write' && event.toolName !== 'edit') ||
					typeof event.input.path !== 'string'
				)
					return;
				pending.set(event.toolCallId, {
					file: await snapshotFile(
						cwd,
						normalizeToolPath(event.input.path)
					),
					fullFile: event.toolName === 'write'
				});
			} catch {
				// An exception here would block Pi's tool; checks are always advisory.
				pending.delete(event.toolCallId);
			}
		},
		after: async (
			event: ToolResultEvent
		): Promise<ToolResultEventResult | undefined> => {
			const write = pending.get(event.toolCallId);
			pending.delete(event.toolCallId);
			if (
				event.isError ||
				write === undefined ||
				(event.toolName !== 'write' && event.toolName !== 'edit')
			)
				return undefined;
			try {
				const projection = await actualProjection(write.file);
				if (projection === undefined) return undefined;
				const input = write.fullFile
					? {
							...projection,
							changedSpans: [
								{ start: 0, end: projection.content.length }
							]
						}
					: projection;
				const matched = patterns.filter((pattern) =>
					matchesPattern(event.toolName, input, 'after', pattern)
				);
				if (matched.length === 0) return undefined;
				return {
					content: [
						...event.content,
						{
							type: 'text',
							text: withPiSkillReferences(
								buildPatternFeedback(
									matched,
									write.file.filePath
								),
								matched
							)
						}
					],
					...(event.structuredContent === undefined
						? {}
						: { structuredContent: event.structuredContent })
				};
			} catch {
				return undefined;
			}
		}
	};
};
