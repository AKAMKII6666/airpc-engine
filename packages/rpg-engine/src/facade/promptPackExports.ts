/**
 * 门面成组导出：Lore / WET / Prompt / CapabilityPack / Opening。
 */
export {
	WorldLoreDocSchema,
	formatLoreSoftContext,
	type WorldLoreDoc,
} from "../schema/world/worldLore.js";

export {
	WorldFactSchema,
	WorldFactsArraySchema,
	WorldKnowledgeSchema,
	type WorldFact,
	type WorldKnowledge,
} from "../schema/world/worldFact.js";

export {
	ScheduledIntentSchema,
	ProfileScheduleSchema,
	hasRecurringCardRef,
	type ScheduledIntent,
	type ProfileSchedule,
} from "../schema/schedule/schedule.js";

export { buildFallbackLore } from "../lore/fallbackLore.js";
export { bootstrapLoreOntoProfile } from "../lore/bootstrapLore.js";
export type { LoreBootstrapPort, LoreBootstrapInput } from "../lore/types.js";

export {
	redactSensitive,
	redactLogRecord,
} from "../host/viaPort/engineLogViaPort.js";

export {
	WET_APPENDABLE_TYPES,
	WET_STORAGE_NOTE,
	isWetAppendableType,
	matchWetType,
	filterWetRecords,
	mergeWetSources,
	validateWetAppend,
	buildWetAppendRecord,
	buildWetReplayView,
	type WetAppendableType,
	type WetQueryOpts,
	type WetAppendInput,
	type WetReplayView,
} from "../host/wet/wet.js";

export {
	selectCallFlowPrompt,
	type CallFlowSimEventKind,
	type CallFlowPromptPick,
} from "../runtime/prompt/blocks/selectCallFlowPrompt.js";

export {
	buildComposeScene,
	callDirectionFromActualEntry,
	callDirectionFromEntryMode,
} from "../runtime/prompt/compose/composeScene.js";
export {
	composeRenderedPrompt,
	createDefaultPromptProviderRegistry,
	listPromptProviderIds,
	type ComposeInput,
	type PromptProvider,
	type PromptProviderContext,
} from "../runtime/prompt/compose/composer.js";
export {
	createPromptProviderRegistry,
	type PromptProviderRegistry,
} from "../runtime/prompt/providers/promptProviderRegistry.js";

/** L1 第一方 CapabilityPack：槽点名与 Pack 契约（见技术设计 24） */
export {
	BACKGROUND_SLOTS,
	REALTIME_SLOTS,
	isBackgroundSlot,
	isRealtimeSlot,
	type BackgroundSlot,
	type CapabilityPackDomain,
	type RealtimeSlot,
} from "../capabilityPacks/slots.js";
export type {
	CapabilityPackApiVersion,
	FirstPartyPack,
	FirstPartyPackContribute,
	FirstPartyPackManifest,
} from "../capabilityPacks/types.js";
export {
	mergeCapabilityPacks,
	type CapabilityPackLogEvent,
	type MergeCapabilityPacksInput,
	type MergeCapabilityPacksResult,
} from "../capabilityPacks/merge/mergeCapabilityPacks.js";
export {
	shouldDeferByScheduleGates,
	evaluateScheduleGatesDetailed,
} from "../capabilityPacks/hooks/evaluateScheduleGates.js";
export type {
	AfterHangupHook,
	CommitContextEnricher,
	CommitExtractContributor,
	ScheduleGate,
	SoftExtraEnricher,
	TaskRegistrar,
	TaskTickHandler,
	UserLocationSnapshot,
} from "../capabilityPacks/types/contributeTypes.js";
export { runAfterHangupHooks } from "../capabilityPacks/hooks/runAfterHangupHooks.js";
export { applySoftExtraEnrichers } from "../capabilityPacks/enrichers/applySoftExtraEnrichers.js";
export { mergePackCommitExtras } from "../capabilityPacks/enrichers/applyCommitContextEnrichers.js";
export { bootstrapTaskRegistrars } from "../capabilityPacks/hooks/bootstrapTaskRegistrars.js";
export {
	CORE_COMPOSE_PACK_ID,
	coreComposePack,
} from "../capabilityPacks/_core/coreComposePack.js";
export {
	USER_LOCATION_PACK_ID,
	USER_LOCATION_PROVIDER_ID,
	userLocationPack,
	userLocationPromptProvider,
} from "../capabilityPacks/realtime/user-location/userLocationPack.js";
export {
	OUTBOUND_WINDOW_GATE_ID,
	OUTBOUND_WINDOW_GATE_PACK_ID,
	outboundWindowGatePack,
	outboundWindowScheduleGate,
} from "../capabilityPacks/background/outbound-window-gate/outboundWindowGatePack.js";

export {
	resolveOpeningSituation,
	type OpeningControl,
	type OpeningSituation,
	type OpeningSituationKind,
} from "../runtime/opening/openingSituationResolver.js";
export {
	normalizePersonalityCode,
	buildPersonalityHardBlock,
	buildPersonaStyleHardBlock,
} from "../runtime/prompt/blocks/personalityPrompt.js";

export {
	createNoopEffectSink,
	createRecordingEffectSink,
	isMediaEffect,
	MEDIA_EFFECT_NAMES,
	type EffectSink,
	type EffectSinkApplyInput,
	type EffectSinkResult,
	type EffectSinkResultOk,
	type EffectSinkResultErr,
} from "../runtime/effect/effectSink.js";
