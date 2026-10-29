/**
 * Pattern use-command-executor-service.
 *
 * Bans `child_process` / `node:child_process` imports. Effect exposes
 * `ChildProcessSpawner` + `ChildProcess` in `effect/process`
 * (and the older `Command` / `CommandExecutor` in `@effect/platform`)
 * which give typed errors, scoped lifetime, and declarative I/O.
 */
import type { CreateRule } from '@oxlint/plugins';

import * as Schema from 'effect/Schema';

import { Rule } from 'effect-oxlint';

const ChildProcessImportSource = Schema.Literals([
	'child_process',
	'node:child_process'
]).annotate({
	title: 'ChildProcessImportSource',
	description:
		'Node `child_process` module import specifiers. Use `ChildProcessSpawner` (Effect v4) or `CommandExecutor` (`@effect/platform`) instead.'
});

const isChildProcessImportSource = Schema.is(ChildProcessImportSource);

const rule: CreateRule = Rule.banImport(isChildProcessImportSource, {
	message:
		'Avoid importing `child_process` / `node:child_process`. Use `ChildProcessSpawner` + `ChildProcess` from `effect/process` for typed, scoped, composable process spawning. See the `effect-command-executor` skill.'
});

export default rule;
