import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'bun:test';

import { docsDirectory } from '../packages/guidance/index.ts';
import { skillsDirectory } from '../packages/skills/index.ts';

const baseline = '4.1.0';
const releases = ['4.1.0', '4.0.7'];
const normalize = (text: string) =>
	text
		.split('\n')
		.map((line) => line.trimEnd())
		.join('\n')
		.trim();

// SHA-256 of the complete included release sections from each tagged changelog,
// normalized only for trailing whitespace and section-separating blank lines.
// Generated independently from git show at effect@4.1.0, commit
// 9a91b1926a5fbfaffd302a7a41a94d4d53a1154e; tests require no network/source checkout.
const upstreamDigests: Readonly<Record<string, string>> = {
	'packages/ai/anthropic/CHANGELOG.md':
		'5b88948e2d81de96bc5d049b7185f73d0e91d447a2b9705b7ce2741b5af34a28',
	'packages/ai/cloudflare/CHANGELOG.md':
		'0ab9a6c77763bf02be4aec45a09d40fb702d0d6205d2105ebb8f57200d7ae457',
	'packages/ai/openai-compat/CHANGELOG.md':
		'b4610bd77cf79c83c2953ed8692835656c79e2e4ea20ea74dde2ad3c23b36a29',
	'packages/ai/openai/CHANGELOG.md':
		'6a098b5f002c100cc3507f4fe2c9442b480480dac075531c721c632ba2099d55',
	'packages/ai/openrouter/CHANGELOG.md':
		'b4610bd77cf79c83c2953ed8692835656c79e2e4ea20ea74dde2ad3c23b36a29',
	'packages/ai/typesafe/CHANGELOG.md':
		'82208e4c2c787e83d68ac522cb6e59af1bcb343b0c2532fbfe9281ae507a0fbe',
	'packages/atom/react/CHANGELOG.md':
		'1270f1620d1137bad2cbfae6c1e68fb009c5f99e6a73e67ec313dff3a673f50e',
	'packages/atom/solid/CHANGELOG.md':
		'05dc3f81f6f10432ea867c4e0ea6279ed960df5539f4693e5bbcd95321358d7d',
	'packages/atom/vue/CHANGELOG.md':
		'05dc3f81f6f10432ea867c4e0ea6279ed960df5539f4693e5bbcd95321358d7d',
	'packages/effect/CHANGELOG.md':
		'63014f979166c20cdb370b93804c6e5c17994f41dee138c40cc62e7f04a9917c',
	'packages/opentelemetry/CHANGELOG.md':
		'971cdb7cd0fd2c94d4de4b7b0037f0501ee0b2ee631e86889875ca660498b178',
	'packages/platform/browser/CHANGELOG.md':
		'3f030a07d52e42222a2f391390440e959c82e055f209985131fde9fa8e4306c6',
	'packages/platform/bun/CHANGELOG.md':
		'306b25edb7e92ab70551dd861b79ef8db8ebaf8f76e2695d11f6a74baffe0763',
	'packages/platform/deno/CHANGELOG.md':
		'bc54b797c573ce01b9dff5812775ed9bb49fd9c3d5b227199e1488b2b816caf7',
	'packages/platform/node-shared/CHANGELOG.md':
		'4ffb9ce745ce903c83e335e6c92a0a68acf96f8c5af52b372c3a3aa643cdd50a',
	'packages/platform/node/CHANGELOG.md':
		'6ee7e80e2fb00ebbe50b27a63f6d4d793443738938fe26babc7cb1dc1d2692ce',
	'packages/sql/clickhouse/CHANGELOG.md':
		'a2dc9acc5ced64d5f9d93baf7217f1af39563a16d01724c729ed5f4e26b85424',
	'packages/sql/d1/CHANGELOG.md':
		'05dc3f81f6f10432ea867c4e0ea6279ed960df5539f4693e5bbcd95321358d7d',
	'packages/sql/libsql/CHANGELOG.md':
		'05dc3f81f6f10432ea867c4e0ea6279ed960df5539f4693e5bbcd95321358d7d',
	'packages/sql/mssql/CHANGELOG.md':
		'1f6d9f72cf61a2f941ef75596d6a1c3fc40451f1e9bffe76f5c91d993cca56e2',
	'packages/sql/mysql2/CHANGELOG.md':
		'05dc3f81f6f10432ea867c4e0ea6279ed960df5539f4693e5bbcd95321358d7d',
	'packages/sql/pg/CHANGELOG.md':
		'ce30306a1679b4638962b0f215ea8b6060c192103dad708be163f056308001c5',
	'packages/sql/pglite/CHANGELOG.md':
		'05dc3f81f6f10432ea867c4e0ea6279ed960df5539f4693e5bbcd95321358d7d',
	'packages/sql/sqlite-bun/CHANGELOG.md':
		'05dc3f81f6f10432ea867c4e0ea6279ed960df5539f4693e5bbcd95321358d7d',
	'packages/sql/sqlite-do/CHANGELOG.md':
		'28436100c51ca884db61d92840106e6ffaefbf29e5d65451bebe4a1bff0efe1f',
	'packages/sql/sqlite-node/CHANGELOG.md':
		'05dc3f81f6f10432ea867c4e0ea6279ed960df5539f4693e5bbcd95321358d7d',
	'packages/sql/sqlite-react-native/CHANGELOG.md':
		'70c16112fd32fc7282d2525ee542c3898c3ecb6a81ab1b7d629838f270ba92e6',
	'packages/sql/sqlite-wasm/CHANGELOG.md':
		'05dc3f81f6f10432ea867c4e0ea6279ed960df5539f4693e5bbcd95321358d7d',
	'packages/tools/docgen/CHANGELOG.md':
		'277c09841cf81fc5d670e89a4d471dabdd719d3791ca64e2dd39b3b3dfaa90c8',
	'packages/tools/doctest/CHANGELOG.md':
		'05dc3f81f6f10432ea867c4e0ea6279ed960df5539f4693e5bbcd95321358d7d',
	'packages/tools/graphql-generator/CHANGELOG.md':
		'c80344a77ea4a0711882a472f2eabc8ee0489e99a19b1c43cfeda51bacd0b50e',
	'packages/tools/openapi-generator/CHANGELOG.md':
		'7a113d6bd500505c86db8c6cdde5e9312a837a02e7110b305bcd31876985fc48',
	'packages/vitest/CHANGELOG.md':
		'8ba9049e2895d21b82429dfc2927b009d99869f59d2b2fac7879fb5431be0a00'
};

describe('Effect release alignment', () => {
	it('accounts for every bundled skill in the migration audit', async () => {
		const audit = await readFile(
			path.join(docsDirectory, `effect-${baseline}.md`),
			'utf8'
		);
		const entries = await readdir(skillsDirectory, {
			withFileTypes: true
		});
		const directories = entries
			.filter(
				(entry) => entry.isDirectory() && entry.name !== 'node_modules'
			)
			.map((entry) => entry.name);
		const inventory = [
			...audit.matchAll(/^\| ([a-z][a-z0-9-, ]+) \|/gm)
		].flatMap((match) =>
			(match[1] ?? '').split(', ').map((name) => `effect-${name}`)
		);
		expect(directories).toHaveLength(54);
		expect(inventory).toHaveLength(directories.length);
		expect(inventory).toEqual(expect.arrayContaining(directories));
	});

	it('pins every directly consumed Effect package to the documented baseline', async () => {
		// The workspace catalog pins every Effect package the plugins consume.
		const workspace = await readFile(
			new URL('../package.json', import.meta.url),
			'utf8'
		);
		const catalog = JSON.stringify(
			JSON.parse(workspace).workspaces.catalog
		);
		const dependencies = [
			...catalog.matchAll(/"(effect|@effect\/[^"]+)":"([^"]+)"/g)
		];
		expect(dependencies).toHaveLength(7);
		dependencies.forEach((match) =>
			expect({ package: match[1], version: match[2] }).toEqual({
				package: match[1],
				version: baseline
			})
		);
		for (const document of [
			'packages/guidance/README.md',
			'packages/guidance/effect-first-development.md',
			'packages/guidance/progressive-disclosure-guidance.md'
		]) {
			const text = await readFile(
				new URL(`../${document}`, import.meta.url),
				'utf8'
			);
			expect(text).toContain(baseline);
			expect(text).toContain(`docs/effect-${baseline}.md`);
		}
	});

	it('retains all 66 upstream sections without rewriting their contents', async () => {
		const text = await readFile(
			path.join(docsDirectory, `effect-${baseline}-changelog.md`),
			'utf8'
		);
		const packages = [
			...text.matchAll(
				/^# (packages\/[^\n]+\/CHANGELOG\.md)\n([\s\S]*?)(?=^# |$(?![\s\S]))/gm
			)
		];
		expect(packages.map((match) => match[1])).toEqual(
			Object.keys(upstreamDigests)
		);
		let sectionCount = 0;
		const coreSections = new Map<string, string>();
		for (const match of packages) {
			const path = match[1] ?? '';
			const body = match[2] ?? '';
			const sections = [
				...body.matchAll(
					/^## (4\.\d+\.\d+)\n([\s\S]*?)(?=^## |$(?![\s\S]))/gm
				)
			];
			expect(sections.map((section) => section[1])).toEqual(releases);
			const content = normalize(
				sections.map((section) => normalize(section[0])).join('\n\n')
			);
			expect<unknown>({
				path,
				digest: createHash('sha256').update(content).digest('hex')
			}).toEqual({
				path,
				digest: upstreamDigests[path]
			});
			sectionCount += sections.length;
			if (path === 'packages/effect/CHANGELOG.md') {
				sections.forEach((section) =>
					coreSections.set(
						section[1] ?? '',
						normalize(section[2] ?? '')
					)
				);
			}
		}
		expect(sectionCount).toBe(66);
		const official = [
			...text.matchAll(
				/^# Official GitHub release: effect@(4\.\d+\.\d+)\n([\s\S]*?)(?=^# |$(?![\s\S]))/gm
			)
		];
		expect(official.map((match) => match[1])).toEqual(releases);
		official.forEach((match) => {
			const body = match[2] ?? '';
			const notes = body.slice(body.indexOf('### '));
			expect<unknown>(normalize(notes)).toBe(
				coreSections.get(match[1] ?? '')
			);
		});
	});
});
