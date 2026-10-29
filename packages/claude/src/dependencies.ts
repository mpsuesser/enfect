import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import packageJson from '../package.json' with { type: 'json' };
import { loadAstGrep } from '@enfect/core/ast-grep';

const AST_GREP = '@ast-grep/napi';

/** The runtime manifest installed into the plugin data directory. */
export const runtimeManifest = (): string =>
	`${JSON.stringify(
		{
			private: true,
			dependencies: { [AST_GREP]: packageJson.dependencies[AST_GREP] }
		},
		null,
		2
	)}\n`;

/**
 * Ensure the ast-grep native binding is loadable. Installed Claude Code plugins are
 * copied without node_modules, so the first session installs it into
 * `CLAUDE_PLUGIN_DATA`. Returns a notice for the model when AST checks are unavailable.
 */
export const ensureAstGrep = async (): Promise<string | undefined> => {
	if (loadAstGrep() !== undefined) return undefined;
	const dataDirectory = process.env.CLAUDE_PLUGIN_DATA;
	const unavailable = (reason: string) =>
		`Enfect notice: AST-based pattern checks are disabled because ${reason}. Regex-based checks still run.`;
	if (dataDirectory === undefined)
		return unavailable('`@ast-grep/napi` could not be loaded');
	try {
		await mkdir(dataDirectory, { recursive: true });
		const manifestPath = path.join(dataDirectory, 'package.json');
		const current = await readFile(manifestPath, 'utf8').catch(
			() => undefined
		);
		if (current !== runtimeManifest())
			await writeFile(manifestPath, runtimeManifest());
		await promisify(execFile)(
			'npm',
			[
				'install',
				'--omit=dev',
				'--no-audit',
				'--no-fund',
				'--no-package-lock',
				'--silent'
			],
			{ cwd: dataDirectory, timeout: 110_000 }
		);
	} catch (error) {
		return unavailable(
			`installing \`${AST_GREP}\` into the plugin data directory failed (${
				error instanceof Error
					? error.message.split('\n')[0]
					: String(error)
			})`
		);
	}
	return loadAstGrep() === undefined
		? unavailable(`\`${AST_GREP}\` did not load after installation`)
		: undefined;
};
