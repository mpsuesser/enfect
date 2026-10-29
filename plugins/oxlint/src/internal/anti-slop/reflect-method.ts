import type { ESTree, SourceCode } from '@oxlint/plugins';
import * as Option from 'effect/Option';
import { Scope } from 'effect-oxlint';

function isGlobalReflect(
	sourceCode: SourceCode,
	expression: ESTree.Expression
): boolean {
	if (expression.type !== 'Identifier' || expression.name !== 'Reflect')
		return false;
	if (sourceCode.isGlobalReference(expression)) return true;
	return Option.match(
		Scope.findVariableUp(sourceCode.getScope(expression), expression.name),
		{
			onNone: () => true,
			onSome: (variable) => variable.defs.length === 0
		}
	);
}

/** Reports whether a call target names one method on the global Reflect object. */
export function isGlobalReflectMethodCall(
	sourceCode: SourceCode,
	callee: ESTree.Expression,
	methodName: string
): boolean {
	if (
		!('property' in callee) ||
		!('object' in callee) ||
		!('computed' in callee)
	)
		return false;
	if (!isGlobalReflect(sourceCode, callee.object)) return false;
	const property = callee.property;
	return callee.computed
		? property.type === 'Literal' && property.value === methodName
		: property.type === 'Identifier' && property.name === methodName;
}
