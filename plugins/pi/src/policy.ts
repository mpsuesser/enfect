import { withPluginPolicy } from '@enfect/core/guidance';
import type { Pattern } from '@enfect/core/pattern';

/** Preserve the complete shared guidance and add Pi's explicit skill syntax. */
export const withPiPolicy = (guidance: string): string =>
	`${withPluginPolicy(guidance)}\n\nLoad relevant skills with Pi's \`/skill:<name>\` syntax, for example \`/skill:effect-schema-v4\`. You can also read the listed skill's SKILL.md when working autonomously.`;

/** Adapt the shared feedback's bare skill references to Pi skill commands. */
export const withPiSkillReferences = (
	feedback: string,
	patterns: ReadonlyArray<Pattern.Value>
): string => {
	let text = feedback;
	for (const skill of new Set(
		patterns.flatMap((pattern) => pattern.suggestedSkills ?? [])
	))
		text = text.replaceAll(`\`${skill}\``, `\`/skill:${skill}\``);
	return text;
};
