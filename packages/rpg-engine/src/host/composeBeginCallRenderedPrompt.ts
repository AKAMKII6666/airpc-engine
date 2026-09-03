/**
 * beginCall：classifyBeginContext + softExtras + userSnapshot + compose。
 * 从 createEngineHost 拆出，避免 L1 样板接线抬高 Host 基线。
 */
import type {
	BeginCallContext,
	ComposeScene,
	RenderedPrompt,
	ResolveResult,
} from "./types.js";
import type { CallCardDefinition } from "../schema/callCard.js";
import type { CharacterDef } from "../schema/character.js";
import type { PlayerProfile } from "../schema/profile.js";
import type { MemoryPort } from "../memory/types.js";
import {
	composeRenderedPrompt,
} from "../runtime/composer.js";
import type { PromptProviderRegistry } from "../runtime/promptProviderRegistry.js";
import { isEngineError, type EngineError } from "./errors.js";
import { buildBeginCallSoftExtras } from "./buildBeginCallSoftExtras.js";
import type { SoftExtraEnricher } from "../capabilityPacks/contributeTypes.js";

type ClassifyBeginContext = (input: {
	result: ResolveResult;
	actualEntry: BeginCallContext["actualEntry"];
	scheduledIntentId?: string;
	topicHint?: string;
	scheduleOrigin?: string;
	missedOutbound?: BeginCallContext["missedOutbound"];
	conversationInertia?: BeginCallContext["conversationInertia"];
}) => BeginCallContext;

export async function composeBeginCallRenderedPrompt(input: {
	userId: string;
	agentId: string;
	card: CallCardDefinition;
	characterDef?: CharacterDef | null;
	nowIso: string;
	memory: MemoryPort | null | undefined;
	profile: PlayerProfile | undefined;
	composeScene: ComposeScene;
	promptProviderRegistry: PromptProviderRegistry | null;
	classifyBeginContext: ClassifyBeginContext;
	classifyInput: Parameters<ClassifyBeginContext>[0];
	/** L1 begin.softExtras；缺省空 */
	softExtraEnrichers?: readonly SoftExtraEnricher[];
}): Promise<
	| { ok: true; beginContext: BeginCallContext; rendered: RenderedPrompt }
	| EngineError
> {
	const beginContext = input.classifyBeginContext(input.classifyInput);
	const softExtras = await buildBeginCallSoftExtras({
		userId: input.userId,
		agentId: input.agentId,
		card: input.card,
		characterDef: input.characterDef,
		nowIso: input.nowIso,
		memory: input.memory,
		profile: input.profile,
		softExtraEnrichers: input.softExtraEnrichers,
	});
	const userLocation = input.profile?.user?.location;
	const rendered = composeRenderedPrompt({
		card: input.card,
		characterDef: input.characterDef,
		scene: input.composeScene,
		beginContext,
		allowCharacterOpeningFallback:
			input.card.cardKind !== "free" || beginContext.source !== "free",
		softExtras,
		promptProviderRegistry: input.promptProviderRegistry ?? undefined,
		userSnapshot: userLocation ? { location: userLocation } : undefined,
	});
	if (isEngineError(rendered)) {
		return rendered;
	}
	return {
		ok: true,
		beginContext,
		rendered,
	};
}
