import { describe, expect, it } from '@effect/vitest';
import type { ESTree } from 'effect-oxlint';

import rule from '../../src/rules/no-cause-in-http-response.ts';
import * as Testing from 'effect-oxlint/testing';

/** Link a synthetic node to its synthetic parent (mirrors the pattern used by other ancestor-walking rule tests, e.g. `throw-in-effect-gen.test.ts`). */
const withParent = <T>(node: T, parent: unknown): T => {
	(node as { parent: unknown }).parent = parent;
	return node;
};

/**
 * Build `Effect.<method>((<paramName>) => <bodyCall>)` with real `.parent`
 * links wired from `bodyCall` up through the handler to the catch call, the
 * same chain `enclosingCatchHandlerParamName` walks at runtime.
 */
const wrapInCatchHandler = (
	method: string,
	paramName: string,
	bodyCall: ESTree.CallExpression | ESTree.NewExpression
): ESTree.CallExpression | ESTree.NewExpression => {
	const handler = Testing.arrowFn(bodyCall, [Testing.id(paramName)]);
	const catchCall = Testing.callOfMember('Effect', method, [handler]);
	withParent(handler, catchCall);
	withParent(bodyCall, handler);
	return bodyCall;
};

const templateLiteral = (
	expressions: ReadonlyArray<unknown>
): ESTree.TemplateLiteral =>
	({ type: 'TemplateLiteral', expressions, quasis: [] }) as never;

describe('no-cause-in-http-response', () => {
	// ── `Cause.pretty` / `Cause.squash` — unconditional, regardless of context ──
	it('flags `HttpServerResponse.text(Cause.pretty(cause), ...)` (the motivating bug)', () => {
		const node = Testing.callOfMember('HttpServerResponse', 'text', [
			Testing.callOfMember('Cause', 'pretty', [Testing.id('cause')]),
			Testing.objectExpr([
				{ key: 'status', value: Testing.numLiteral(500) }
			])
		]);
		expect(Testing.runRule(rule, 'CallExpression', node)).toHaveLength(1);
	});

	it('flags `HttpServerResponse.json(Cause.squash(cause))`', () => {
		const node = Testing.callOfMember('HttpServerResponse', 'json', [
			Testing.callOfMember('Cause', 'squash', [Testing.id('cause')])
		]);
		expect(Testing.runRule(rule, 'CallExpression', node)).toHaveLength(1);
	});

	it('flags `new Response(Cause.pretty(cause))`', () => {
		const node = Testing.newExpr('Response', [
			Testing.callOfMember('Cause', 'pretty', [Testing.id('cause')])
		]);
		expect(Testing.runRule(rule, 'NewExpression', node)).toHaveLength(1);
	});

	it('flags `Cause.pretty(...)` nested inside a template-literal body', () => {
		const node = Testing.callOfMember('HttpServerResponse', 'text', [
			templateLiteral([
				Testing.callOfMember('Cause', 'pretty', [Testing.id('cause')])
			])
		]);
		expect(Testing.runRule(rule, 'CallExpression', node)).toHaveLength(1);
	});

	it('does not flag `Cause.pretty(...)` used for logging (not a response construction)', () => {
		const node = Testing.callOfMember('Effect', 'logError', [
			Testing.callOfMember('Cause', 'pretty', [Testing.id('cause')])
		]);
		expect(Testing.runRule(rule, 'CallExpression', node)).toHaveLength(0);
	});

	it('allows a generic string body', () => {
		const node = Testing.callOfMember('HttpServerResponse', 'text', [
			Testing.strLiteral('Internal error.'),
			Testing.objectExpr([
				{ key: 'status', value: Testing.numLiteral(500) }
			])
		]);
		expect(Testing.runRule(rule, 'CallExpression', node)).toHaveLength(0);
	});

	it('allows a response built with no body argument', () => {
		const node = Testing.newExpr('Response');
		expect(Testing.runRule(rule, 'NewExpression', node)).toHaveLength(0);
	});

	// ── Caught cause/error parameter — direct `Effect.catch*` handlers ──
	it('flags `.message` on the `cause` bound by `Effect.catchAll`', () => {
		const bodyCall = Testing.callOfMember('HttpServerResponse', 'text', [
			Testing.memberExpr('cause', 'message'),
			Testing.objectExpr([
				{ key: 'status', value: Testing.numLiteral(500) }
			])
		]);
		wrapInCatchHandler('catchAll', 'cause', bodyCall);
		expect(Testing.runRule(rule, 'CallExpression', bodyCall)).toHaveLength(
			1
		);
	});

	it('flags the bare `error` bound by `Effect.catch` (v4 name) passed straight through', () => {
		const bodyCall = Testing.callOfMember('HttpServerResponse', 'text', [
			Testing.id('error'),
			Testing.objectExpr([
				{ key: 'status', value: Testing.numLiteral(500) }
			])
		]);
		wrapInCatchHandler('catch', 'error', bodyCall);
		expect(Testing.runRule(rule, 'CallExpression', bodyCall)).toHaveLength(
			1
		);
	});

	it('flags `String(cause)` inside an object body under `Effect.catchCause`', () => {
		const bodyCall = Testing.callOfMember('HttpServerResponse', 'json', [
			Testing.objectExpr([
				{
					key: 'error',
					value: Testing.callExpr('String', [Testing.id('cause')])
				}
			])
		]);
		wrapInCatchHandler('catchCause', 'cause', bodyCall);
		expect(Testing.runRule(rule, 'CallExpression', bodyCall)).toHaveLength(
			1
		);
	});

	it('flags `${cause}` template interpolation under `Effect.catchAllCause` (v3 name)', () => {
		const bodyCall = Testing.callOfMember('HttpServerResponse', 'text', [
			templateLiteral([Testing.id('cause')])
		]);
		wrapInCatchHandler('catchAllCause', 'cause', bodyCall);
		expect(Testing.runRule(rule, 'CallExpression', bodyCall)).toHaveLength(
			1
		);
	});

	it('flags `new Response(cause.message)` under a catch handler', () => {
		const bodyCall = Testing.newExpr('Response', [
			Testing.memberExpr('cause', 'message')
		]);
		wrapInCatchHandler('catchCause', 'cause', bodyCall);
		expect(Testing.runRule(rule, 'NewExpression', bodyCall)).toHaveLength(
			1
		);
	});

	// ── Negative: catch-handler param present but not leaked ──
	it('allows a catch handler that never uses its caught parameter', () => {
		const bodyCall = Testing.callOfMember('HttpServerResponse', 'text', [
			Testing.strLiteral('Not found'),
			Testing.objectExpr([
				{ key: 'status', value: Testing.numLiteral(404) }
			])
		]);
		wrapInCatchHandler('catchAll', 'cause', bodyCall);
		expect(Testing.runRule(rule, 'CallExpression', bodyCall)).toHaveLength(
			0
		);
	});

	it('allows `.message` on a binding other than the caught parameter', () => {
		const bodyCall = Testing.callOfMember('HttpServerResponse', 'text', [
			Testing.memberExpr('somethingElse', 'message')
		]);
		wrapInCatchHandler('catchAll', 'cause', bodyCall);
		expect(Testing.runRule(rule, 'CallExpression', bodyCall)).toHaveLength(
			0
		);
	});

	it('allows a targeted `Effect.catchTag` handler (not a blanket catch method)', () => {
		const bodyCall = Testing.callOfMember('HttpServerResponse', 'text', [
			Testing.memberExpr('e', 'message')
		]);
		wrapInCatchHandler('catchTag', 'e', bodyCall);
		expect(Testing.runRule(rule, 'CallExpression', bodyCall)).toHaveLength(
			0
		);
	});

	it('allows a `cause`-named parameter whose function is not a direct catch-handler argument', () => {
		// Same shape as the motivating bug's `.message` access, but the handler
		// is only assigned to a binding — never passed to a blanket catch call.
		// This is a known precision boundary: `Cause.pretty`/`Cause.squash` are
		// still caught unconditionally (see the first test group above).
		const bodyCall = Testing.callOfMember('HttpServerResponse', 'text', [
			Testing.memberExpr('cause', 'message')
		]);
		const handler = Testing.arrowFn(bodyCall, [Testing.id('cause')]);
		withParent(handler, { type: 'VariableDeclarator' });
		withParent(bodyCall, handler);
		expect(Testing.runRule(rule, 'CallExpression', bodyCall)).toHaveLength(
			0
		);
	});
});
