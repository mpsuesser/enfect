import type { CreateRule } from '@oxlint/plugins';
import { Plugin } from 'effect-oxlint';

import avoidAny from './rules/avoid-any.ts';
import avoidDataTaggedError from './rules/avoid-data-tagged-error.ts';
import avoidDirectJson from './rules/avoid-direct-json.ts';
import avoidDirectTagChecks from './rules/avoid-direct-tag-checks.ts';
import avoidExpectInIf from './rules/avoid-expect-in-if.ts';
import avoidMutableState from './rules/avoid-mutable-state.ts';
import avoidNativeFetch from './rules/avoid-native-fetch.ts';
import avoidNativeObjectHelpers from './rules/avoid-native-object-helpers.ts';
import avoidNodeImports from './rules/avoid-node-imports.ts';
import avoidNonNullAssertion from './rules/avoid-non-null-assertion.ts';
import avoidObjectType from './rules/avoid-object-type.ts';
import avoidOptionGetorthrow from './rules/avoid-option-getorthrow.ts';
import avoidPlatformCoupling from './rules/avoid-platform-coupling.ts';
import avoidProcessEnv from './rules/avoid-process-env.ts';
import avoidReactHooks from './rules/avoid-react-hooks.ts';
import avoidSchemaSuffix from './rules/avoid-schema-suffix.ts';
import avoidSyncFs from './rules/avoid-sync-fs.ts';
import avoidTryCatch from './rules/avoid-try-catch.ts';
import avoidTsIgnore from './rules/avoid-ts-ignore.ts';
import avoidUntaggedErrors from './rules/avoid-untagged-errors.ts';
import avoidYieldRef from './rules/avoid-yield-ref.ts';
import castingAwareness from './rules/casting-awareness.ts';
import contextTagExtends from './rules/context-tag-extends.ts';
import effectCatchallDefault from './rules/effect-catchall-default.ts';
import effectPromiseVsTrypromise from './rules/effect-promise-vs-trypromise.ts';
import effectRunInBody from './rules/effect-run-in-body.ts';
import imperativeLoops from './rules/imperative-loops.ts';
import maybePrefixRequiresOption from './rules/maybe-prefix-requires-option.ts';
import noBarrelImports from './rules/no-barrel-imports.ts';
import noCauseInHttpResponse from './rules/no-cause-in-http-response.ts';
import noChainedTypeAssertions from './rules/no-chained-type-assertions.ts';
import noConditionalEmptyObjectSpread from './rules/no-conditional-empty-object-spread.ts';
import noKnownValueWidening from './rules/no-known-value-widening.ts';
import noModuleMocking from './rules/no-module-mocking.ts';
import noObjectParameters from './rules/no-object-parameters.ts';
import noReflectApply from './rules/no-reflect-apply.ts';
import noReflectGet from './rules/no-reflect-get.ts';
import noRuntimeTypeof from './rules/no-runtime-typeof.ts';
import noServiceConstructorImports from './rules/no-service-constructor-imports.ts';
import noShapeInSymbolNames from './rules/no-shape-in-symbol-names.ts';
import noUnknownParameters from './rules/no-unknown-parameters.ts';
import noUnknownReturns from './rules/no-unknown-returns.ts';
import noUnknownTypeAliases from './rules/no-unknown-type-aliases.ts';
import noUnsafeDictionaryType from './rules/no-unsafe-dictionary-type.ts';
import noWidenThenAssert from './rules/no-widen-then-assert.ts';
import requireSafetyCommentForTypeAssertion from './rules/require-safety-comment-for-type-assertion.ts';
import noEffectIgnoreThenAs from './rules/no-effect-ignore-then-as.ts';
import noLengthComparison from './rules/no-length-comparison.ts';
import noOpaqueInstanceFields from './rules/no-opaque-instance-fields.ts';
import preferArrMatch from './rules/prefer-arr-match.ts';
import preferArrSort from './rules/prefer-arr-sort.ts';
import preferArrayFromoptionOverOptionMatchEmpty from './rules/prefer-array-fromoption-over-option-match-empty.ts';
import preferDurationConstructors from './rules/prefer-duration-constructors.ts';
import preferEffectFn from './rules/prefer-effect-fn.ts';
import preferEffectIs from './rules/prefer-effect-is.ts';
import preferMatchOverSwitch from './rules/prefer-match-over-switch.ts';
import preferNamespaceImports from './rules/prefer-namespace-imports.ts';
import preferOptionOverNull from './rules/prefer-option-over-null.ts';
import preferRedactedConfig from './rules/prefer-redacted-config.ts';
import requireEffectConcurrency from './rules/require-effect-concurrency.ts';
import requireFilterMetadata from './rules/require-filter-metadata.ts';
import requireIsPrefixForBooleanSchemaField from './rules/require-is-prefix-for-boolean-schema-field.ts';
import requireSchemaTypeAlias from './rules/require-schema-type-alias.ts';
import throwInEffectGen from './rules/throw-in-effect-gen.ts';
import useClockService from './rules/use-clock-service.ts';
import useCommandExecutorService from './rules/use-command-executor-service.ts';
import useConsoleService from './rules/use-console-service.ts';
import useFilesystemService from './rules/use-filesystem-service.ts';
import useHttpClientService from './rules/use-http-client-service.ts';
import usePathService from './rules/use-path-service.ts';
import useRandomService from './rules/use-random-service.ts';
import useTempFileScoped from './rules/use-temp-file-scoped.ts';
import vmInWrongFile from './rules/vm-in-wrong-file.ts';
import yieldInForLoop from './rules/yield-in-for-loop.ts';

const rules: Record<string, CreateRule> = {
	// ── Anti-slop evidence and boundary rules ────────────────
	'no-chained-type-assertions': noChainedTypeAssertions,
	'no-conditional-empty-object-spread': noConditionalEmptyObjectSpread,
	'no-known-value-widening': noKnownValueWidening,
	'no-module-mocking': noModuleMocking,
	'no-object-parameters': noObjectParameters,
	'no-reflect-apply': noReflectApply,
	'no-reflect-get': noReflectGet,
	'no-runtime-typeof': noRuntimeTypeof,
	'no-service-constructor-imports': noServiceConstructorImports,
	'no-shape-in-symbol-names': noShapeInSymbolNames,
	'no-unknown-parameters': noUnknownParameters,
	'no-unknown-returns': noUnknownReturns,
	'no-unknown-type-aliases': noUnknownTypeAliases,
	'no-unsafe-dictionary-type': noUnsafeDictionaryType,
	'no-widen-then-assert': noWidenThenAssert,
	'require-safety-comment-for-type-assertion':
		requireSafetyCommentForTypeAssertion,
	// ── Statement bans ───────────────────────────────────────
	'avoid-try-catch': avoidTryCatch,
	'prefer-match-over-switch': preferMatchOverSwitch,
	'imperative-loops': imperativeLoops,

	// ── Member expression bans ───────────────────────────────
	'avoid-data-tagged-error': avoidDataTaggedError,
	'avoid-direct-json': avoidDirectJson,
	'avoid-option-getorthrow': avoidOptionGetorthrow,
	'avoid-process-env': avoidProcessEnv,
	'use-random-service': useRandomService,
	'effect-run-in-body': effectRunInBody,
	'effect-promise-vs-trypromise': effectPromiseVsTrypromise,
	'use-console-service': useConsoleService,

	// ── Import bans ──────────────────────────────────────────
	'use-filesystem-service': useFilesystemService,
	'use-path-service': usePathService,
	'use-command-executor-service': useCommandExecutorService,
	'use-http-client-service': useHttpClientService,
	'avoid-platform-coupling': avoidPlatformCoupling,
	'avoid-node-imports': avoidNodeImports,

	// ── Type-level rules ─────────────────────────────────────
	'avoid-any': avoidAny,
	'avoid-object-type': avoidObjectType,
	'avoid-ts-ignore': avoidTsIgnore,
	'avoid-mutable-state': avoidMutableState,
	'avoid-schema-suffix': avoidSchemaSuffix,
	'avoid-non-null-assertion': avoidNonNullAssertion,
	'prefer-option-over-null': preferOptionOverNull,
	'casting-awareness': castingAwareness,

	// ── Call expression rules ────────────────────────────────
	'use-clock-service': useClockService,
	'avoid-native-fetch': avoidNativeFetch,
	'avoid-react-hooks': avoidReactHooks,
	'avoid-sync-fs': avoidSyncFs,
	'avoid-untagged-errors': avoidUntaggedErrors,
	'prefer-arr-sort': preferArrSort,

	// ── Complex / contextual rules ───────────────────────────
	'context-tag-extends': contextTagExtends,
	'throw-in-effect-gen': throwInEffectGen,
	'prefer-effect-fn': preferEffectFn,
	'yield-in-for-loop': yieldInForLoop,
	'avoid-expect-in-if': avoidExpectInIf,
	'avoid-yield-ref': avoidYieldRef,
	'effect-catchall-default': effectCatchallDefault,
	'no-cause-in-http-response': noCauseInHttpResponse,
	'avoid-direct-tag-checks': avoidDirectTagChecks,
	'vm-in-wrong-file': vmInWrongFile,
	'use-temp-file-scoped': useTempFileScoped,
	'avoid-native-object-helpers': avoidNativeObjectHelpers,

	// ── Effect / Option / Array idioms ────────────────────────
	'prefer-array-fromoption-over-option-match-empty':
		preferArrayFromoptionOverOptionMatchEmpty,
	'no-length-comparison': noLengthComparison,
	'no-effect-ignore-then-as': noEffectIgnoreThenAs,

	// ── Pattern enforcement rules ────────────────────────────
	'prefer-namespace-imports': preferNamespaceImports,
	'prefer-effect-is': preferEffectIs,
	'prefer-duration-constructors': preferDurationConstructors,
	'prefer-arr-match': preferArrMatch,
	'prefer-redacted-config': preferRedactedConfig,
	'require-schema-type-alias': requireSchemaTypeAlias,
	'require-filter-metadata': requireFilterMetadata,
	'require-is-prefix-for-boolean-schema-field':
		requireIsPrefixForBooleanSchemaField,
	'maybe-prefix-requires-option': maybePrefixRequiresOption,
	'require-effect-concurrency': requireEffectConcurrency,
	'no-barrel-imports': noBarrelImports,
	'no-opaque-instance-fields': noOpaqueInstanceFields
};

/**
 * Oxlint plugin for Effect-first TypeScript rules and generated config presets.
 *
 * @since 0.2.2
 */
const plugin: Plugin.DefinedPlugin<Record<string, CreateRule>> = Plugin.define({
	name: 'effect',
	specifier: '@mpsuesser/oxlint-plugin-effect',
	rules
});

export default plugin;
