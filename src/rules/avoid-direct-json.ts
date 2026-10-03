import type { CreateRule } from '@oxlint/plugins';
import { Rule } from 'effect-oxlint';

const rule: CreateRule = Rule.banMember('JSON', ['parse', 'stringify'], {
	message:
		'Avoid `JSON.parse`/`JSON.stringify` in Effect code. Use `Schema.fromJsonString(MySchema)` for typed boundaries or `Schema.fromJsonString(Schema.Unknown)` for unknown payloads, with `Schema.decodeUnknownEffect` / `Schema.encodeEffect`. (EF-19)'
});

export default rule;
