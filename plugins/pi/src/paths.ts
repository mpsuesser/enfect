import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Match Pi's built-in write/edit path normalization before taking a snapshot. */
export const normalizeToolPath = (filePath: string): string => {
	let normalized = filePath
		.replace(/[\u00a0\u2000-\u200a\u202f\u205f\u3000]/g, ' ')
		.replace(/^@/, '');
	if (process.platform === 'win32' && !normalized.includes('\\')) {
		const drive = /^\/(?:mnt\/|cygdrive\/)?([a-z])(?:\/(.*))?$/i.exec(
			normalized
		);
		if (drive?.[1] !== undefined)
			normalized = `${drive[1].toUpperCase()}:\\${(drive[2] ?? '').replaceAll('/', '\\')}`;
	}
	if (normalized === '~') return homedir();
	if (
		normalized.startsWith('~/') ||
		(process.platform === 'win32' && normalized.startsWith('~\\'))
	)
		return path.join(homedir(), normalized.slice(2));
	return normalized.startsWith('file://')
		? fileURLToPath(normalized)
		: normalized;
};
