/**
 * 模块名称：rpg-engine 包入口（统一门面）
 * 模块说明：Studio/壳只从此导入；禁止深挖内部路径。
 */

export { ENGINE_PACKAGE_NAME, getEnginePackageName } from "./packageMeta.js";

export {
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
  EndCallResult,
  EffectPlanResult,
  EffectPlanStatus,
  FreePipelineTrace,
  LogRecord,
  RenderedPrompt,
  ResolveResult,
  SaveReason,
} from "./host/types.js";

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
  readEngineLogJsonlSlice,
} from "./host/engineLogFile.js";

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
  type ComposeInput,
} from "./runtime/composer.js";
export {
  normalizePersonalityCode,
  buildPersonalityHardBlock,
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

export { createSqliteMemoryPort } from "./memory/sqliteMemoryPort.js";
export type {
  MemoryPort,
  MemoryProjection,
  MemorySearchHit,
  MemorySearchQuery,
  MemoryCommitInput,
  MemoryCommitResult,
} from "./memory/types.js";

export {
  listBuiltinTools,
  getBuiltinTool,
  BUILTIN_TOOL_DEFINITIONS,
} from "./tools/builtinRegistry.js";
export { resolveToolPolicy, isToolAllowedOnCard } from "./tools/resolveToolPolicy.js";
export type {
  ToolDefinition,
  ToolInvokeResult,
  RuntimeExitCandidate,
} from "./tools/types.js";

export {
  PlayerProfileSchema,
  UserSchema,
  ActiveStoryLockSchema,
  StorySaveSchema,
  type PlayerProfile,
  type User,
  type ActiveStoryLock,
  type StorySave,
} from "./schema/profile.js";

export {
  findActiveStoryLock,
  evaluateStoryLockGate,
  activateStoryOnBegin,
  releaseStoryLock,
} from "./runtime/activeStoryLock.js";

export {
  CallCardDefinitionSchema,
  StoryPackageConfSchema,
  EntryModeSchema,
  InteractionModeSchema,
  CardKindSchema,
  ScheduleMetaSchema,
  ToolPolicySchema,
  formatZodError,
  isScheduleCard,
  type CallCardDefinition,
  type StoryPackageConf,
  type ScheduleMeta,
  type CardKind,
} from "./schema/callCard.js";

export {
  CharacterDefSchema,
  isEffectiveDialable,
  type CharacterDef,
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
  EffectSchema,
  KNOWN_EFFECT_NAMES,
  type Outcome,
  type Effect,
  type KnownEffectName,
} from "./schema/outcome.js";

export {
  validatePackage,
  VALIDATE_PACKAGE_ERROR_COVERAGE,
  type ValidatePackageInput,
} from "./validation/validatePackage.js";
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

