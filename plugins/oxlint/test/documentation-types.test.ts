import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import ts from 'typescript';
import { expect, it } from 'vitest';

it('compiles marked README examples and Effect imports against the stable release', async () => {
	const filename = resolve(import.meta.dirname, '../README.md');
	const markdown = await readFile(filename, 'utf8');
	const modules = new Map<string, ts.SourceFile>();
	const marked = [
		...markdown.matchAll(
			/<!-- typecheck -->\s*```ts\r?\n([\s\S]*?)\r?\n```/g
		)
	];
	expect(marked).toHaveLength(
		markdown.split('<!-- typecheck -->').length - 1
	);
	expect(marked.length).toBeGreaterThanOrEqual(6);

	// Compiler boundary: isolate examples and imports so illustrative fragments
	// and deliberately invalid examples do not share declarations with each other.
	for (const match of marked) {
		const code = match[1];
		if (code === undefined) continue;
		const path = `${filename}.example-${markdown.slice(0, match.index).split('\n').length}.ts`;
		modules.set(
			path,
			ts.createSourceFile(path, code, ts.ScriptTarget.ESNext, true)
		);
	}
	for (const match of markdown.matchAll(
		/```(ts|tsx)\r?\n([\s\S]*?)\r?\n```/g
	)) {
		const code = match[2];
		if (code === undefined) continue;
		const fragment = ts.createSourceFile(
			filename,
			code,
			ts.ScriptTarget.ESNext,
			true,
			match[1] === 'tsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS
		);
		for (const statement of fragment.statements) {
			if (
				!ts.isImportDeclaration(statement) ||
				!ts.isStringLiteral(statement.moduleSpecifier)
			)
				continue;
			const source = statement.moduleSpecifier.text;
			if (source !== 'effect' && !source.startsWith('effect/')) continue;
			const path = `${filename}.import-${match.index}-${statement.pos}.ts`;
			modules.set(
				path,
				ts.createSourceFile(
					path,
					statement.getText(fragment),
					ts.ScriptTarget.ESNext,
					true
				)
			);
		}
	}
	const options: ts.CompilerOptions = {
		noEmit: true,
		strict: true,
		exactOptionalPropertyTypes: true,
		noUncheckedIndexedAccess: true,
		skipLibCheck: true,
		target: ts.ScriptTarget.ESNext,
		module: ts.ModuleKind.Preserve,
		moduleResolution: ts.ModuleResolutionKind.Bundler,
		moduleDetection: ts.ModuleDetectionKind.Force,
		types: []
	};
	const host = ts.createCompilerHost(options);
	const getSourceFile = host.getSourceFile.bind(host);
	host.getSourceFile = (path, ...args) =>
		modules.get(path) ?? getSourceFile(path, ...args);
	const program = ts.createProgram([...modules.keys()], options, host);
	const diagnostics = ts.getPreEmitDiagnostics(program);
	expect(
		ts.formatDiagnosticsWithColorAndContext(diagnostics, {
			getCanonicalFileName: (path) => path,
			getCurrentDirectory: () => resolve(import.meta.dirname, '..'),
			getNewLine: () => '\n'
		})
	).toBe('');
});
