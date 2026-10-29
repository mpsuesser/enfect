import type { CreateRule } from '@oxlint/plugins';
import { Rule } from 'effect-oxlint';

// Sources already handled by more specific use-*-service rules.
// Exclude these to avoid duplicate diagnostics.
const SPECIFIC_SOURCES = new Set([
	'node:fs',
	'node:fs/promises',
	'node:path',
	'node:os',
	'node:child_process',
	'node:http',
	'node:https'
]);

const rule: CreateRule = Rule.banImport(
	(src) => src.startsWith('node:') && !SPECIFIC_SOURCES.has(src),
	{
		message:
			'Avoid `node:*` imports in domain code. Use `FileSystem` and `Path` from `effect`, `SecureRandom` and `Digest` from `effect/crypto`, `ChildProcessSpawner` from `effect/process`, and `HttpClient` from `effect/http` for portable, testable code. (EF-21)'
	}
);

export default rule;
