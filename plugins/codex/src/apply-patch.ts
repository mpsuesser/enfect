import type { Span } from '@enfect/core/pattern';

export interface PatchChunk {
	readonly anchor: string | undefined;
	readonly lines: Array<{ readonly kind: string; readonly text: string }>;
	endOfFile: boolean;
}

export interface PatchFile {
	readonly kind: 'add' | 'update' | 'delete';
	readonly path: string;
	moveTo?: string;
	readonly chunks: Array<PatchChunk>;
}

/** Parse Codex's custom patch grammar, not numeric unified-diff hunks. */
export const parsePatch = (patch: string): ReadonlyArray<PatchFile> => {
	let lines = patch.trim().split(/\r?\n/);
	if (
		/^<<(?:'EOF'|"EOF"|EOF)$/.test(lines[0] ?? '') &&
		lines.at(-1) === 'EOF'
	)
		lines = lines.slice(1, -1);
	if (
		lines[0]?.trim() !== '*** Begin Patch' ||
		lines.at(-1)?.trim() !== '*** End Patch'
	)
		throw new Error('Invalid patch boundaries');
	const files: Array<PatchFile> = [];
	let file: PatchFile | undefined;
	let chunk: PatchChunk | undefined;
	for (const line of lines.slice(1, -1)) {
		const marker = /^\*\*\* (Add|Update|Delete) File: (.+)$/.exec(line);
		if (marker !== null) {
			const kind =
				marker[1] === 'Add'
					? 'add'
					: marker[1] === 'Update'
						? 'update'
						: 'delete';
			file = { kind, path: marker[2] ?? '', chunks: [] };
			files.push(file);
			chunk = undefined;
			continue;
		}
		if (line.startsWith('*** Environment ID: ') && files.length === 0)
			continue;
		if (file === undefined || file.kind === 'delete')
			throw new Error('Unexpected patch line');
		if (
			line.startsWith('*** Move to: ') &&
			file.kind === 'update' &&
			file.chunks.length === 0
		) {
			file.moveTo = line.slice('*** Move to: '.length);
			continue;
		}
		if (line === '@@' || line.startsWith('@@ ')) {
			if (file.kind !== 'update')
				throw new Error('Unexpected add-file hunk');
			chunk = {
				anchor: line === '@@' ? undefined : line.slice(3),
				lines: [],
				endOfFile: false
			};
			file.chunks.push(chunk);
			continue;
		}
		if (line === '*** End of File' && chunk !== undefined) {
			chunk.endOfFile = true;
			continue;
		}
		const kind = line.charAt(0);
		if (!['+', '-', ' '].includes(kind) && line !== '')
			throw new Error('Invalid patch hunk');
		if (file.kind === 'add' && kind !== '+')
			throw new Error('Invalid added file');
		if (chunk === undefined) {
			chunk = { anchor: undefined, lines: [], endOfFile: false };
			file.chunks.push(chunk);
		}
		chunk.lines.push({ kind: kind || ' ', text: line.slice(1) });
	}
	return files;
};

interface SourceLine {
	readonly text: string;
	readonly start: number;
	readonly end: number;
}

const sourceLines = (content: string): ReadonlyArray<SourceLine> => {
	let offset = 0;
	return (content.match(/[^\n]*\n|[^\n]+$/g) ?? []).map((line) => {
		const start = offset;
		offset += line.length;
		return { text: line.replace(/\r?\n$/, ''), start, end: offset };
	});
};

/**
 * Locate post-patch hunk lines in order, respecting anchors and EOF. Only explicit
 * '+' lines become changed spans; retained context and removed lines never do.
 * Without a pre-write snapshot, identical repeated hunks can be ambiguous: select
 * the first ordered match, as Codex does for old-side chunks. Unlocatable hunks
 * are skipped rather than reviewing an entire unchanged file.
 */
export const patchSpans = (
	file: PatchFile,
	content: string
): ReadonlyArray<Span> => {
	if (file.kind === 'delete') return [];
	if (file.kind === 'add')
		return content.length === 0 ? [] : [{ start: 0, end: content.length }];
	const lines = sourceLines(content);
	const spans: Array<Span> = [];
	let cursor = 0;
	for (const chunk of file.chunks) {
		if (chunk.anchor !== undefined) {
			const anchor = lines.findIndex(
				(line, index) =>
					index >= cursor && line.text.trim() === chunk.anchor?.trim()
			);
			if (anchor === -1) continue;
			cursor = anchor + 1;
		}
		let after = chunk.lines.filter((line) => line.kind !== '-');
		if (!after.some((line) => line.kind === '+')) continue;
		const append = !chunk.lines.some((line) => line.kind !== '+');
		const locate = (): number => {
			const first =
				append || chunk.endOfFile
					? Math.max(cursor, lines.length - after.length)
					: cursor;
			for (
				let index = first;
				index <= lines.length - after.length;
				index += 1
			) {
				if (chunk.endOfFile && index + after.length !== lines.length)
					continue;
				if (
					after.every(
						(line, part) =>
							line.text.trim() ===
							lines[index + part]?.text.trim()
					)
				)
					return index;
			}
			return -1;
		};
		let start = locate();
		// Codex tolerates a trailing blank sentinel for the final newline.
		if (start === -1 && after.at(-1)?.text === '') {
			after = after.slice(0, -1);
			start = locate();
		}
		if (start === -1) continue;
		for (const [index, line] of after.entries()) {
			const actual = lines[start + index];
			if (line.kind === '+' && actual !== undefined)
				spans.push({ start: actual.start, end: actual.end });
		}
		cursor = start + after.length;
	}
	return spans;
};
