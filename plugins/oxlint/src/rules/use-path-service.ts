/**
 * Pattern use-path-service.
 *
 * Bans `path` / `node:path` imports — Effect's `Path` service from
 * `effect` provides cross-platform path operations with a
 * typed surface and layer-based substitution for tests.
 */
import type { CreateRule } from '@oxlint/plugins';

import * as Schema from 'effect/Schema';

import { Rule } from 'effect-oxlint';

const PathImportSource = Schema.Literals(['path', 'node:path']).annotate({
	title: 'PathImportSource',
	description:
		'Node `path` module import specifiers. Use `Path.Path` from `effect` instead.'
});

const isPathImportSource = Schema.is(PathImportSource);

const rule: CreateRule = Rule.banImport(isPathImportSource, {
	message:
		'Avoid importing `path` / `node:path`. Use the `Path` service from `effect` for cross-platform path operations. See the `effect-path` skill.'
});

export default rule;
