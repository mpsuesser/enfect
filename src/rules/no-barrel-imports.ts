import type { CreateRule } from '@oxlint/plugins';
import type { ESTree } from 'effect-oxlint';

import * as Effect from 'effect/Effect';
import type * as Fn from 'effect/Function';
import * as Schema from 'effect/Schema';

import { Diagnostic, Rule, RuleContext } from 'effect-oxlint';

/**
 * Packages where barrel imports (named imports from package root) should
 * be namespace imports from submodules instead.
 */
const BARREL_PACKAGES = new Set(['effect']);

const isFunctionExport = Schema.is(
	Schema.Literals([
		'absurd',
		'cast',
		'flow',
		'hole',
		'identity',
		'pipe'
	] satisfies ReadonlyArray<keyof typeof Fn>)
);

const rule: CreateRule = Rule.define({
	name: 'no-barrel-imports',
	meta: Rule.meta({
		type: 'suggestion',
		description:
			'Disallow named imports from barrel packages — use submodule namespace imports instead'
	}),
	create: function* () {
		const ctx = yield* RuleContext;
		return {
			ImportDeclaration: (node: ESTree.Node) => {
				const decl = node as ESTree.ImportDeclaration;
				const src = decl.source.value;
				if (!BARREL_PACKAGES.has(src)) return Effect.void;

				// Skip type-only import declarations
				if (decl.importKind === 'type') return Effect.void;

				// Flag named imports (ImportSpecifier), not namespace or default
				for (const specifier of decl.specifiers) {
					if (specifier.type !== 'ImportSpecifier') continue;

					// Skip type-only specifiers within a value import
					if (specifier.importKind === 'type') continue;

					const imported = specifier.imported;
					if (!imported || imported.type !== 'Identifier') continue;

					const name = imported.name;
					const local = specifier.local.name;
					const suggestion = isFunctionExport(name)
						? `import { ${name === local ? name : `${name} as ${local}`} } from "effect/Function"`
						: `import * as ${local} from "effect/${name}"`;
					return ctx.report(
						Diagnostic.make({
							node,
							message: `Prefer \`${suggestion}\` over a named import from "${src}" to keep the dependency on its owning module explicit.`
						})
					);
				}

				return Effect.void;
			}
		};
	}
});

export default rule;
