/**
 * 模块名称：rpg-engine 包入口（统一门面）
 * 模块说明：Studio/壳只从此导入；禁止深挖内部路径。
 */

export { ENGINE_PACKAGE_NAME, getEnginePackageName } from "./packageMeta.js";

export {
  FREE_CHAPTER_ID,
  SCHEDULE_CHAPTER_ID,
  FREE_PACKAGE_ID,
  SCHEDULE_PACKAGE_ID,
  MEMORY_PROJECT_DEFAULTS,
  MEMORY_SEARCH_DEFAULTS,
  MEMORY_ROLLUP_DEFAULTS,
} from "./constants.js";

export {
  createEngineHost,
  getEngineHost,
  resetEngineHostForTests,
  type EngineHost,
  type CreateEngineHostOptions,
  type LoadWorkspaceOptions,
} from "./host/createEngineHost.js";

export type {
  AdvanceToNextResult,
  FiredScheduleItem,
} from "./runtime/scheduleTick.js";
export {
  SCHEDULE_DAY_MS,
  advanceProfileClock,
  advanceProfileClockToNextIntent,
  cancelStoryOnceIntents,
  clearStoryPendingCards,
  consumeLinkedOnceIntent,
  materializeRecurringOccurrences,
  peekNextScheduleFireAtMs,
  resolveRecurringCardTarget,
  setProfileClockMs,
  tickScheduleOnce,
} from "./runtime/scheduleTick.js";

export {
  listVoicemailGenStack,
  pushVoicemailGenStack,
  takeVoicemailGenStack,
  VOICEMAIL_MAILBOX_DELIVERY,
  type VoicemailGenStackEntry,
} from "./runtime/voicemail/voicemailGenStack.js";

export {
  assembleVoicemailPrompt,
  runVoicemailMaterializePipeline,
  type VoicemailMaterializeDeps,
  type VoicemailMaterializeItemResult,
  type VoicemailMaterializeItemStatus,
  type VoicemailMaterializeResult,
} from "./runtime/voicemail/voicemailMaterialize.js";

export {
  createNoopGenerateVoicemail,
  createRecordingGenerateVoicemail,
  createRecordingUnreadNotifier,
  type GenerateVoicemailInput,
  type GenerateVoicemailPort,
  type GenerateVoicemailResult,
  type OnVoicemailUnreadChanged,
} from "./runtime/voicemail/voicemailPorts.js";

export {
  isLocalHourInOutboundWindow,
  localHourFromIso,
  type OutboundWindow,
} from "./runtime/outboundWindow.js";

export {
  resolveScheduledCardReference,
  type ScheduledCardLookup,
  type ScheduledCardRefInput,
  type ScheduledCardResolveResult,
} from "./schedule/scheduleCardReferenceResolver.js";

export { reconcileRecurringIntents } from "./schedule/reconcileRecurringIntents.js";

export {
  classifyCall,
  type CallClassifyInput,
  type CallClassifyResult,
} from "./runtime/classifyCall.js";

export {
  engineError,
  isEngineError,
  type EngineError,
  type EngineErrorCode,
} from "./host/errors.js";

export type {
  ActualCallEntry,
  BeginCallOpts,
  CallIntent,
  CallSession,
  CallSessionStatus,
  ComposeScene,
  ConsumeOpeningFirstTurnResult,
  EndCallResult,
  EffectPlanResult,
  EffectPlanStatus,
  FreePipelineTrace,
  LogRecord,
  OpeningFirstTurnControl,
  OpeningFirstTurnRuntimeMode,
  OpeningFirstTurnStatus,
  OpeningLlmContextPolicy,
  PostCallJob,
  PostCallJobStatus,
  PostCallJobStep,
  PostCallJobSummary,
  RenderedPrompt,
  ResolveResult,
  SaveReason,
} from "./host/types.js";

export {
  isShellControlToolId,
} from "./host/shellControl/shellControlTool.js";
export type {
  IncomingCallShellEvent,
  IncomingCallShellEventStatus,
  ShellControlEvent,
  ShellControlToolId,
  ShellControlToolResult,
} from "./host/shellControl/shellControlTypes.js";

export {
  WorldLoreDocSchema,
  formatLoreSoftContext,
  type WorldLoreDoc,
} from "./schema/worldLore.js";

export {
  WorldFactSchema,
  WorldFactsArraySchema,
  WorldKnowledgeSchema,
  type WorldFact,
  type WorldKnowledge,
} from "./schema/worldFact.js";

export {
  ScheduledIntentSchema,
  ProfileScheduleSchema,
  hasRecurringCardRef,
  type ScheduledIntent,
  type ProfileSchedule,
} from "./schema/schedule.js";

export { buildFallbackLore } from "./lore/fallbackLore.js";
export { bootstrapLoreOntoProfile } from "./lore/bootstrapLore.js";
export type { LoreBootstrapPort, LoreBootstrapInput } from "./lore/types.js";

export {
  redactSensitive,
  redactLogRecord,
} from "./host/engineLogViaPort.js";

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
} from "./host/wet.js";

export {
  selectCallFlowPrompt,
  type CallFlowSimEventKind,
  type CallFlowPromptPick,
} from "./runtime/selectCallFlowPrompt.js";

export {
  buildComposeScene,
  callDirectionFromActualEntry,
  callDirectionFromEntryMode,
} from "./runtime/composeScene.js";
export {
  composeRenderedPrompt,
  createDefaultPromptProviderRegistry,
  listPromptProviderIds,
  type ComposeInput,
  type PromptProvider,
  type PromptProviderContext,
} from "./runtime/composer.js";
export {
  createPromptProviderRegistry,
  type PromptProviderRegistry,
} from "./runtime/promptProviderRegistry.js";

/** L1 第一方 CapabilityPack：槽点名与 Pack 契约（见技术设计 24） */
export {
  BACKGROUND_SLOTS,
  REALTIME_SLOTS,
  isBackgroundSlot,
  isRealtimeSlot,
  type BackgroundSlot,
  type CapabilityPackDomain,
  type RealtimeSlot,
} from "./capabilityPacks/slots.js";
export type {
  CapabilityPackApiVersion,
  FirstPartyPack,
  FirstPartyPackContribute,
  FirstPartyPackManifest,
} from "./capabilityPacks/types.js";
export {
  mergeCapabilityPacks,
  type CapabilityPackLogEvent,
  type MergeCapabilityPacksInput,
  type MergeCapabilityPacksResult,
} from "./capabilityPacks/mergeCapabilityPacks.js";
export {
  shouldDeferByScheduleGates,
  evaluateScheduleGatesDetailed,
} from "./capabilityPacks/evaluateScheduleGates.js";
export type {
  AfterHangupHook,
  CommitContextEnricher,
  CommitExtractContributor,
  ScheduleGate,
  SoftExtraEnricher,
  TaskRegistrar,
  TaskTickHandler,
  UserLocationSnapshot,
} from "./capabilityPacks/contributeTypes.js";
export { runAfterHangupHooks } from "./capabilityPacks/runAfterHangupHooks.js";
export { applySoftExtraEnrichers } from "./capabilityPacks/applySoftExtraEnrichers.js";
export { mergePackCommitExtras } from "./capabilityPacks/applyCommitContextEnrichers.js";
export { bootstrapTaskRegistrars } from "./capabilityPacks/bootstrapTaskRegistrars.js";
export {
  CORE_COMPOSE_PACK_ID,
  coreComposePack,
} from "./capabilityPacks/_core/coreComposePack.js";
export {
  USER_LOCATION_PACK_ID,
  USER_LOCATION_PROVIDER_ID,
  userLocationPack,
  userLocationPromptProvider,
} from "./capabilityPacks/realtime/user-location/userLocationPack.js";
export {
  OUTBOUND_WINDOW_GATE_ID,
  OUTBOUND_WINDOW_GATE_PACK_ID,
  outboundWindowGatePack,
  outboundWindowScheduleGate,
} from "./capabilityPacks/background/outbound-window-gate/outboundWindowGatePack.js";

export {
  resolveOpeningSituation,
  type OpeningControl,
  type OpeningSituation,
  type OpeningSituationKind,
} from "./runtime/openingSituationResolver.js";
export {
  normalizePersonalityCode,
  buildPersonalityHardBlock,
  buildPersonaStyleHardBlock,
} from "./runtime/personalityPrompt.js";

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
} from "./runtime/effectSink.js";

export type {
  MemoryPort,
  MemoryProjection,
  MemoryProjectionItem,
  MemorySearchHit,
  MemorySearchQuery,
  MemoryCommitInput,
  MemoryCommitItem,
  MemoryCommitItemKind,
  MemoryAttitudeEntry,
  MemoryAttitudePayload,
  MemoryCharacterAttitudeContext,
  MemoryCallTranscript,
  MemoryCommitResult,
  MemoryPatchKind,
  MemoryPatchLayer,
  MemoryPatchPayload,
} from "./memory/types.js";
export {
  normalizeMemoryPatchEffect,
  validateMemoryPatchInput,
} from "./memory/patchMemoryPolicy.js";
export {
  isMemoryCallTranscript,
  projectUserFactTranscript,
  summarizeUserFactTranscript,
} from "./memory/factMemoryTranscript.js";
export type {
  UserFactTranscriptProjection,
  UserFactTranscriptTurn,
} from "./memory/factMemoryTranscript.js";

export type { ProfilePort } from "./ports/profilePort.js";
export type {
	PostCallJobListFilter,
	PostCallJobStorePort,
} from "./ports/postCallJobStorePort.js";
export type {
  ContentPort,
  WorkspaceSnapshot,
  PackageValidateBundle,
} from "./ports/contentPort.js";
export type { EngineLogPort } from "./ports/engineLogPort.js";

export {
  listBuiltinTools,
  getBuiltinTool,
  BUILTIN_TOOL_DEFINITIONS,
} from "./tools/builtinRegistry.js";
export { resolveToolPolicy, isToolAllowedOnCard, isToolAllowedInSession, listToolsForCard, projectToolResolutionTrace } from "./tools/resolveToolPolicy.js";
export { buildToolInstructionBlocks } from "./tools/instructions/buildToolInstructionBlocks.js";
export type { ToolInstructionBlockOpts } from "./tools/instructions/buildToolInstructionBlocks.js";
export { buildAcquaintanceSoftExtra } from "./host/acquaintanceSoftExtra.js";
export { buildBeginCallSoftExtras } from "./host/buildBeginCallSoftExtras.js";
export {
  getToolInputSchema,
  TOOL_INPUT_SCHEMAS,
  ComputeBaziChartArgsSchema,
} from "./tools/schemas/toolInputSchemas.js";
export { parseToolArgs } from "./tools/schemas/parseToolArgs.js";
export { toToolJsonSchema } from "./tools/schemas/toToolJsonSchema.js";
export {
  computeBaziChart,
  COMPUTE_BAZI_CHART_TOOL_ID,
  type BaziChart,
  type BaziCalendarType,
  type ComputeBaziChartArgs,
  type ComputeBaziChartLocalResult,
} from "./tools/bazi/computeBaziChart.js";
export type {
  ToolDefinition,
  ToolInvokeResult,
  RuntimeExitCandidate,
  ToolResolutionTrace,
  ToolResolutionTraceItem,
} from "./tools/types.js";

export {
  PlayerProfileSchema,
  UserSchema,
  ActiveStoryLockSchema,
  StorySaveSchema,
  VoicemailSlotSchema,
  VoicemailSlotStatusSchema,
  deriveVoicemailHasUnread,
  type PlayerProfile,
  type User,
  type ActiveStoryLock,
  type StorySave,
  type VoicemailSlot,
  type VoicemailSlotStatus,
} from "./schema/profile.js";

export {
  findActiveStoryLock,
  evaluateStoryLockGate,
  activateStoryOnBegin,
  releaseStoryLock,
} from "./runtime/activeStoryLock.js";

export {
  CallCardDefinitionSchema,
  ChapterConfSchema,
  PackageConfSchema,
  StoryPackageConfSchema,
  FactMetaSchema,
  StoryPackageMetaSchema,
  EntryModeSchema,
  InteractionModeSchema,
  CardKindSchema,
  ScheduleMetaSchema,
  ToolPolicySchema,
  formatZodError,
  isScheduleCard,
  isVoicemailCard,
  type CallCardDefinition,
  type ChapterConf,
  type PackageConf,
  type StoryPackageConf,
  type FactMeta,
  type StoryPackageMeta,
  type ScheduleMeta,
  type CardKind,
  type EntryMode,
} from "./schema/callCard.js";

export {
  CharacterDefSchema,
  CharacterCapabilitiesSchema,
  CharacterToolCapabilitySchema,
  isEffectiveDialable,
  listEnabledCharacterToolCapabilityIds,
  type CharacterCapabilities,
  type CharacterDef,
  type CharacterToolCapability,
} from "./schema/character.js";

export {
  AssetMetaSchema,
  AssetKindSchema,
  PLAYBACK_ASSET_KINDS,
  type AssetMeta,
  type AssetKind,
} from "./schema/asset.js";

export {
  OutcomeSchema,
  OutcomeFlagSchema,
  ExitConditionSchema,
  EffectSchema,
  KNOWN_EFFECT_NAMES,
  type Outcome,
  type ExitCondition,
  type Effect,
  type KnownEffectName,
} from "./schema/outcome.js";

export {
  validatePackage,
  VALIDATE_PACKAGE_ERROR_COVERAGE,
  type ValidatePackageInput,
} from "./validation/validatePackage.js";
export {
  collectReferencedAgentIds,
  type StoryPackageContentBundle,
} from "./validation/collectReferencedAgentIds.js";
export type {
  ValidationIssue,
  ValidationLevel,
  ValidationReport,
} from "./validation/types.js";
export { hasBlockingErrors } from "./validation/types.js";

export {
  PromptSceneLayerSchema,
  validatePromptScenePatches,
  type PromptSceneLayer,
} from "./schema/promptScene.js";

export type {
  DialogueSessionSpec,
  DialogueSessionPatch,
  DialogueChannel,
  DialogueAdapter,
  DialogueEvent,
  ChatTurn,
  InteractionMode,
} from "./schema/dialogueSession.js";
