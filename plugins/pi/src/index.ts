import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { registerEnfect } from './extension.ts';

// Bundled to dist/index.js; the build stages catalogs beside dist/.
const packageDirectory = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'..'
);

export default async function enfect(pi: ExtensionAPI): Promise<void> {
	await registerEnfect(pi, packageDirectory);
}
