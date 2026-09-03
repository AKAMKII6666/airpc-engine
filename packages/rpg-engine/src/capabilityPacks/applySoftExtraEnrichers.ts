/**
 * begin.softExtras：把 Pack enricher 追加到内置 soft 块之后；null/空跳过。
 */
import type { SoftExtraEnricher } from "./contributeTypes.js";
import type { PlayerProfile } from "../schema/profile.js";

export function applySoftExtraEnrichers(input: {
	softExtras: string[];
	enrichers: readonly SoftExtraEnricher[];
	profile: PlayerProfile | undefined;
	userId: string;
	agentId: string;
}): string[] {
	if (input.enrichers.length === 0) {
		return input.softExtras;
	}
	const out = [...input.softExtras];
	for (const enricher of input.enrichers) {
		const block = enricher.apply({
			profile: input.profile,
			userId: input.userId,
			agentId: input.agentId,
		});
		const trimmed = typeof block === "string" ? block.trim() : "";
		if (trimmed.length > 0) {
			out.push(trimmed);
		}
	}
	return out;
}
