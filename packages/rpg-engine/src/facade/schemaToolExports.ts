/**
 * 门面成组导出：Memory / Ports / Tools / Schema / Validation。
 */
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
} from "../memory/types.js";
export {
	normalizeMemoryPatchEffect,
	validateMemoryPatchInput,
} from "../memory/patchMemoryPolicy.js";
export {
	isMemoryCallTranscript,
	projectUserFactTranscript,
	summarizeUserFactTranscript,
} from "../memory/factMemoryTranscript.js";
export type {
	UserFactTranscriptProjection,
	UserFactTranscriptTurn,
} from "../memory/factMemoryTranscript.js";

export type { ProfilePort } from "../ports/persist/profilePort.js";
export type {
	PostCallJobListFilter,
	PostCallJobStorePort,
} from "../ports/jobs/postCallJobStorePort.js";
export type {
	ContentPort,
	WorkspaceSnapshot,
	PackageValidateBundle,
} from "../ports/persist/contentPort.js";
export type { EngineLogPort } from "../ports/host/engineLogPort.js";

export {
	listBuiltinTools,
	getBuiltinTool,
	BUILTIN_TOOL_DEFINITIONS,
} from "../tools/registry/builtinRegistry.js";
export {
	createToolRegistry,
	DEFAULT_TOOL_REGISTRY,
	getRegisteredTool,
	listRegisteredTools,
	REQUEST_HANGUP_TOOL_DEFINITION,
	REQUEST_HANGUP_TOOL_ID,
} from "../tools/registry/toolRegistry.js";
export {
	resolveToolPolicy,
	isToolAllowedOnCard,
	isToolAllowedInSession,
	listToolsForCard,
	listUnavailablePolicyToolIds,
	toolAllowedForCardContext,
} from "../tools/policy/resolveToolPolicy.js";
export { projectToolResolutionTrace } from "../tools/trace/projectToolResolutionTrace.js";
export { buildToolInstructionBlocks } from "../tools/instructions/buildToolInstructionBlocks.js";
export { normalizeCallCardToolPolicy } from "../tools/policy/normalizeToolPolicy.js";
export type { ToolInstructionBlockOpts } from "../tools/instructions/buildToolInstructionBlocks.js";
export { buildAcquaintanceSoftExtra } from "../host/beginCall/softExtra/acquaintanceSoftExtra.js";
export { buildBeginCallSoftExtras } from "../host/beginCall/softExtra/buildBeginCallSoftExtras.js";
export {
	getToolInputSchema,
	TOOL_INPUT_SCHEMAS,
	ComputeBaziChartArgsSchema,
} from "../tools/schemas/toolInputSchemas.js";
export { parseToolArgs } from "../tools/schemas/parseToolArgs.js";
export { toToolJsonSchema } from "../tools/schemas/toToolJsonSchema.js";
export {
	computeBaziChart,
	COMPUTE_BAZI_CHART_TOOL_ID,
	type BaziChart,
	type BaziCalendarType,
	type ComputeBaziChartArgs,
	type ComputeBaziChartLocalResult,
} from "../tools/bazi/computeBaziChart.js";
export type {
	RegisteredTool,
	ToolBehavior,
	ToolDefinition,
	ToolInvokeHandler,
	ToolInvokeHandlerInput,
	ToolInvokeResult,
	ToolRegistry,
	ToolSource,
	ToolSourceKind,
	RuntimeExitCandidate,
	ToolResolutionTrace,
	ToolResolutionTraceItem,
} from "../tools/types.js";

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
} from "../schema/identity/profile.js";

export {
	findActiveStoryLock,
	evaluateStoryLockGate,
	activateStoryOnBegin,
	releaseStoryLock,
} from "../runtime/lock/activeStoryLock.js";

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
	HangupReasonKindSchema,
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
	type HangupReasonKind,
	type ToolPolicy,
} from "../schema/call/callCard.js";

export {
	CharacterDefSchema,
	CharacterCapabilitiesSchema,
	CharacterToolCapabilitySchema,
	isEffectiveDialable,
	listEnabledCharacterToolCapabilityIds,
	type CharacterCapabilities,
	type CharacterDef,
	type CharacterToolCapability,
} from "../schema/identity/character.js";

export {
	AssetMetaSchema,
	AssetKindSchema,
	PLAYBACK_ASSET_KINDS,
	type AssetMeta,
	type AssetKind,
} from "../schema/identity/asset.js";

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
} from "../schema/call/outcome.js";

export {
	validatePackage,
	VALIDATE_PACKAGE_ERROR_COVERAGE,
	type ValidatePackageInput,
} from "../validation/validatePackage.js";
export {
	collectReferencedAgentIds,
	type StoryPackageContentBundle,
} from "../validation/agents/collectReferencedAgentIds.js";
export type {
	ValidationIssue,
	ValidationLevel,
	ValidationReport,
} from "../validation/types.js";
export { hasBlockingErrors } from "../validation/types.js";

export {
	PromptSceneLayerSchema,
	validatePromptScenePatches,
	type PromptSceneLayer,
} from "../schema/prompt/promptScene.js";

export type {
	DialogueSessionSpec,
	DialogueSessionPatch,
	DialogueChannel,
	DialogueAdapter,
	DialogueEvent,
	ChatTurn,
	InteractionMode,
} from "../schema/call/dialogueSession.js";
