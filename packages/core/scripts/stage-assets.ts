// Installed plugins can't read files outside their own package, so each plugin
// build copies the shared catalogs and release notes into the package root.
import { cp, rm } from 'node:fs/promises';
import path from 'node:path';

const core = path.resolve(import.meta.dirname, '..');
const destination = process.cwd();

await Promise.all(
	['docs', 'guidance', 'patterns', 'skills'].map(async (directory) => {
		const target = path.join(destination, directory);
		await rm(target, { recursive: true, force: true });
		await cp(path.join(core, directory), target, { recursive: true });
	})
);
await cp(
	path.resolve(core, '..', '..', 'LICENSE'),
	path.join(destination, 'LICENSE')
);
