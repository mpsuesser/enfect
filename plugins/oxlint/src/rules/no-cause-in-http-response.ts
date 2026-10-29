/**
 * Effect's `Cause` can carry internal detail — defect stack traces, decode
 * internals, or other implementation specifics — that must never reach an
 * HTTP client. Rendering it into a response body turns an internal failure
 * into an information disclosure.
 *
 * Motivating real bug:
 * ```ts
 * const betterAuthFailureResponse = (cause: Cause.Cause<unknown>) =>
 *   HttpServerResponse.text(Cause.pretty(cause), { status: 500 });
 * ```
 *
 * Flags, inside the body argument of `HttpServerResponse.text` / `.json` /
 * `.html` / `.raw` / `.unsafeJson(...)`, or `new Response(...)`:
 *
 *  - `Cause.pretty(...)` / `Cause.squash(...)`, anywhere in the expression —
 *    unconditionally, since rendering full cause detail is never a
 *    client-safe response body.
 *  - The parameter bound by the nearest enclosing `Effect.catch` /
 *    `catchAll` / `catchCause` / `catchAllCause` handler (conventionally
 *    named `cause` or `error`), used directly, via `.message`, via
 *    `String(...)`, or interpolated into a template literal.
 *
 * Logging the cause server-side, e.g. `Effect.logError(Cause.pretty(cause))`,
 * is untouched — the rule only inspects response-construction arguments.
 */
import type { CreateRule } from '@oxlint/plugins';

import type { ESTree } from 'effect-oxlint';

import { pipe } from 'effect';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { AST, Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint';

// ---------------------------------------------------------------------------
// Domain
// ---------------------------------------------------------------------------

/** `HttpServerResponse` constructors whose first argument is the response body. */
const ResponseBodyMethodName = Schema.Literals([
	'text',
	'json',
	'html',
	'raw',
	'unsafeJson'
]).annotate({
	title: 'ResponseBodyMethodName',
	description:
		'`HttpServerResponse` constructors whose first argument is the response body.'
});

const isResponseBodyMethodName = Schema.is(ResponseBodyMethodName);

/** `Cause` accessors that render full failure detail as text. */
const CauseDetailMethodName = Schema.Literals(['pretty', 'squash']).annotate({
	title: 'CauseDetailMethodName',
	description:
		'`Cause` accessors that render full failure detail — safe for server-side logs, unsafe for a client-facing response body.'
});

const isCauseDetailMethodName = Schema.is(CauseDetailMethodName);

/**
 * All v3 + v4 names for blanket catch APIs whose handler parameter this rule
 * tracks (mirrors `effect-catchall-default`'s `CatchMethodName`).
 * v3: `catchAll`, `catchAllCause`
 * v4: `catch`, `catchCause`
 */
const CatchMethodName = Schema.Literals([
	'catchAll',
	'catch',
	'catchAllCause',
	'catchCause'
]).annotate({
	title: 'CatchMethodName',
	description:
		'Method names on `Effect` that perform blanket error recovery — v3 (`catchAll`/`catchAllCause`) and v4 (`catch`/`catchCause`) spellings.'
});

const isCatchMethodName = Schema.is(CatchMethodName);

// ---------------------------------------------------------------------------
// Detection: locate the response body argument
// ---------------------------------------------------------------------------

/** The first argument of a call/`new` expression, excluding a spread. */
const bodyArgument = (
	args: ReadonlyArray<ESTree.Argument>
): Option.Option<ESTree.Expression> =>
	pipe(
		Option.fromNullishOr(args[0]),
		Option.filter(
			(arg): arg is ESTree.Expression => arg.type !== 'SpreadElement'
		)
	);

/** `HttpServerResponse.text/json/html/raw/unsafeJson(body, ...)` → `Some(body)`. */
const httpResponseBodyArg = (
	node: ESTree.CallExpression
): Option.Option<ESTree.Expression> =>
	pipe(
		AST.narrow(node.callee, 'MemberExpression'),
		Option.flatMap(AST.memberNames),
		Option.filter(
			([obj, prop]) =>
				obj === 'HttpServerResponse' && isResponseBodyMethodName(prop)
		),
		Option.flatMap(() => bodyArgument(node.arguments))
	);

/** `new Response(body, ...)` → `Some(body)`. */
const newResponseBodyArg = (
	node: ESTree.NewExpression
): Option.Option<ESTree.Expression> =>
	pipe(
		AST.calleeIdentifier(node),
		Option.filter((name) => name === 'Response'),
		Option.flatMap(() => bodyArgument(node.arguments))
	);

// ---------------------------------------------------------------------------
// Detection: the enclosing catch handler's parameter
// ---------------------------------------------------------------------------

/** A `CallExpression` whose callee is `Effect.<catch-method>(...)`. */
const isBlanketCatchCall = (node: ESTree.CallExpression): boolean =>
	pipe(
		AST.narrow(node.callee, 'MemberExpression'),
		Option.flatMap(AST.memberNames),
		Option.exists(
			([obj, prop]) => obj === 'Effect' && isCatchMethodName(prop)
		)
	);

/**
 * Walk the ancestor chain from `node`, looking for a function literal that
 * is itself passed directly as the handler argument to a blanket
 * `Effect.catch` call. Returns the handler's first parameter name when it
 * is a simple identifier — the binding this rule treats as a caught
 * cause/error. Keeps walking past non-handler functions, so a response
 * built from a nested arrow inside the handler is still attributed to it.
 */
const enclosingCatchHandlerParamName = (
	start: ESTree.Node
): Option.Option<string> => {
	let current: ESTree.Node | null | undefined = start.parent;
	while (
		current !== null &&
		current !== undefined &&
		current.type !== 'Program'
	) {
		if (
			current.type === 'ArrowFunctionExpression' ||
			current.type === 'FunctionExpression'
		) {
			const handler = current;
			const parent = handler.parent;
			const isDirectHandlerArg =
				parent.type === 'CallExpression' &&
				isBlanketCatchCall(parent) &&
				(parent.arguments as ReadonlyArray<ESTree.Node>).includes(
					handler
				);
			if (isDirectHandlerArg) {
				const [firstParam] = handler.params;
				if (
					firstParam !== undefined &&
					firstParam.type === 'Identifier'
				) {
					return Option.some(firstParam.name);
				}
			}
		}
		current = current.parent;
	}
	return Option.none();
};

// ---------------------------------------------------------------------------
// Detection: cause/error detail inside the body expression
// ---------------------------------------------------------------------------

/** `Cause.pretty(...)` / `Cause.squash(...)`. */
const isCauseDetailCall = (node: ESTree.CallExpression): boolean =>
	pipe(
		AST.narrow(node.callee, 'MemberExpression'),
		Option.flatMap(AST.memberNames),
		Option.exists(
			([obj, prop]) => obj === 'Cause' && isCauseDetailMethodName(prop)
		)
	);

/** `String(<paramName>)`. */
const isStringOfParam = (
	node: ESTree.CallExpression,
	paramName: string
): boolean =>
	pipe(
		AST.calleeName(node),
		Option.filter((name) => name === 'String'),
		Option.flatMap(() => Option.fromNullishOr(node.arguments[0])),
		Option.exists(
			(arg) => arg.type === 'Identifier' && arg.name === paramName
		)
	);

/** `<paramName>.message`. */
const isParamMessageAccess = (
	node: ESTree.MemberExpression,
	paramName: string
): boolean =>
	!node.computed &&
	node.object.type === 'Identifier' &&
	node.object.name === paramName &&
	node.property.type === 'Identifier' &&
	node.property.name === 'message';

/**
 * Does `expr` (or any sub-expression it structurally contains) render Cause
 * detail into a response body? `Cause.pretty`/`Cause.squash` are always a
 * leak; a bare reference to `paramName` (the caught cause/error binding),
 * its `.message`, or `String(paramName)` are a leak only once a catch
 * handler's parameter name is known.
 */
const containsCauseLeak = (
	expr: ESTree.Expression | ESTree.SpreadElement,
	paramName: Option.Option<string>
): boolean => {
	if (expr.type === 'SpreadElement')
		return containsCauseLeak(expr.argument, paramName);

	switch (expr.type) {
		case 'Identifier':
			return Option.exists(paramName, (name) => expr.name === name);

		case 'CallExpression': {
			if (isCauseDetailCall(expr)) return true;
			if (
				Option.isSome(paramName) &&
				isStringOfParam(expr, paramName.value)
			) {
				return true;
			}
			return expr.arguments.some((arg) =>
				containsCauseLeak(arg, paramName)
			);
		}

		case 'NewExpression':
			return expr.arguments.some((arg) =>
				containsCauseLeak(arg, paramName)
			);

		case 'MemberExpression':
			if (
				Option.isSome(paramName) &&
				isParamMessageAccess(expr, paramName.value)
			) {
				return true;
			}
			return containsCauseLeak(expr.object, paramName);

		case 'TemplateLiteral':
			return expr.expressions.some((sub) =>
				containsCauseLeak(sub, paramName)
			);

		case 'ConditionalExpression':
			return (
				containsCauseLeak(expr.test, paramName) ||
				containsCauseLeak(expr.consequent, paramName) ||
				containsCauseLeak(expr.alternate, paramName)
			);

		case 'LogicalExpression':
			return (
				containsCauseLeak(expr.left, paramName) ||
				containsCauseLeak(expr.right, paramName)
			);

		case 'BinaryExpression': {
			const { left, right } = expr;
			return (
				(left.type !== 'PrivateIdentifier' &&
					containsCauseLeak(left, paramName)) ||
				containsCauseLeak(right, paramName)
			);
		}

		case 'UnaryExpression':
		case 'AwaitExpression':
			return containsCauseLeak(expr.argument, paramName);

		case 'ParenthesizedExpression':
		case 'TSAsExpression':
		case 'TSSatisfiesExpression':
		case 'TSTypeAssertion':
		case 'TSNonNullExpression':
			return containsCauseLeak(expr.expression, paramName);

		case 'ChainExpression':
			return containsCauseLeak(expr.expression, paramName);

		case 'ArrayExpression':
			return expr.elements.some(
				(element) =>
					element !== null && containsCauseLeak(element, paramName)
			);

		case 'ObjectExpression':
			return expr.properties.some((property) =>
				property.type === 'SpreadElement'
					? containsCauseLeak(property.argument, paramName)
					: containsCauseLeak(property.value, paramName)
			);

		default:
			return false;
	}
};

// ---------------------------------------------------------------------------
// Rule
// ---------------------------------------------------------------------------

const MESSAGE =
	'Avoid rendering Cause/error detail into an HTTP response body. `Cause.pretty`/`Cause.squash`, and a caught cause/error binding used directly, via `.message`, `String(...)`, or template interpolation, can leak internals to a client. Log it server-side instead (e.g. `Effect.logError(Cause.pretty(cause))`) and return a generic response body.';

const rule: CreateRule = Rule.define({
	name: 'no-cause-in-http-response',
	meta: Rule.meta({
		type: 'problem',
		description:
			'Disallow Cause/error detail (`Cause.pretty`/`Cause.squash`, or a caught cause/error binding) flowing into an HTTP response body built with `HttpServerResponse.text`/`json`/`html`/`raw`/`unsafeJson` or `new Response(...)`'
	}),
	create: function* () {
		const ctx = yield* RuleContext;

		const reportIfLeaking = (
			node: ESTree.CallExpression | ESTree.NewExpression,
			body: ESTree.Expression
		) =>
			containsCauseLeak(body, enclosingCatchHandlerParamName(node))
				? ctx.report(Diagnostic.make({ node, message: MESSAGE }))
				: Effect.void;

		return Visitor.merge(
			Visitor.on('CallExpression', (node) =>
				pipe(
					httpResponseBodyArg(node),
					Option.match({
						onNone: () => Effect.void,
						onSome: (body) => reportIfLeaking(node, body)
					})
				)
			),
			Visitor.on('NewExpression', (node) =>
				pipe(
					newResponseBodyArg(node),
					Option.match({
						onNone: () => Effect.void,
						onSome: (body) => reportIfLeaking(node, body)
					})
				)
			)
		);
	}
});

export default rule;
