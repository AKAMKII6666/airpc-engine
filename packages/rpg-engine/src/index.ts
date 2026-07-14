/**
 * 模块名称：rpg-engine 包入口（统一门面）
 * 模块说明：Studio/壳只从此导入；禁止深挖内部路径。
 */

export { ENGINE_PACKAGE_NAME, getEnginePackageName } from "./packageMeta.js";

export {
  FREE_PACKAGE_ID,
  MEMORY_PROJECT_DEFAULTS,
  MEMORY_SEARCH_DEFAULTS,
} from "./constants.js";

export {
  createEngineHost,
  getEngineHost,
  resetEngineHostForTests,
  type EngineHost,
  type CreateEngineHostOptions,
  type LoadWorkspaceOptions,
} from "./host/createEngineHost.js";

export type { FiredScheduleItem } from "./runtime/scheduleTick.js";

export {
  engineError,
  isEngineError,
  type EngineError,
  type EngineErrorCode,
} from "./host/errors.js";

export type {
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
  TimeBucket,
} from "./host/types.js";

export {
  WorldLoreDocSchema,
  formatLoreSoftContext,
  type WorldLoreDoc,
} from "./schema/worldLore.js";

export { buildFallbackLore } from "./lore/fallbackLore.js";
export { bootstrapLoreOntoProfile } from "./lore/bootstrapLore.js";
export type { LoreBootstrapPort, LoreBootstrapInput } from "./lore/types.js";

export {
  redactSensitive,
  redactLogRecord,
  readEngineLogJsonlSlice,
} from "./host/engineLogFile.js";

export {
  selectCallFlowPrompt,
  type CallFlowSimEventKind,
  type CallFlowPromptPick,
} from "./runtime/selectCallFlowPrompt.js";

export { buildComposeScene } from "./runtime/composeScene.js";
export {
  composeRenderedPrompt,
  type ComposeInput,
} from "./runtime/composer.js";

export {
  createNoopEffectSink,
  createRecordingEffectSink,
  isMediaEffect,
  MEDIA_EFFECT_NAMES,
  type EffectSink,
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
  ToolPolicySchema,
  formatZodError,
  type CallCardDefinition,
} from "./schema/callCard.js";

export {
  CharacterDefSchema,
  isEffectiveDialable,
  type CharacterDef,
} from "./schema/character.js";

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
  TimeBucketSchema,
  hourToTimeBucket,
  validatePromptScenePatches,
  type PromptSceneLayer,
} from "./schema/promptScene.js";

export type {
  DialogueSessionSpec,
  DialogueSessionPatch,
  DialogueChannel,
  InteractionMode,
} from "./schema/dialogueSession.js";

