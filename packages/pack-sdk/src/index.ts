/**
 * @airpc/pack-sdk — L2 特性插件作者 SDK（类型 / 槽点 / 清单 schema / mock API）。
 * 故意不依赖 @airpc/rpg-engine；槽点字符串与引擎软拷贝对齐（技术设计 25 §10）。
 */

export {
	BACKGROUND_SLOTS,
	REALTIME_SLOTS,
	UI_SLOTS,
	isBackgroundSlot,
	isRealtimeSlot,
	isUiSlot,
	type BackgroundSlot,
	type PluginSlotDomain,
	type RealtimeSlot,
	type UiSlot,
} from "./slots.js";

export {
	BackgroundPipelineItemSchema,
	CapabilityPacksManifestSchema,
	PluginBackgroundBlockSchema,
	PluginPipelineItemSchema,
	PluginRealtimeBlockSchema,
	PluginUiBlockSchema,
	PluginUiPanelItemSchema,
	RealtimePipelineItemSchema,
	parseCapabilityPacksManifest,
	safeParseCapabilityPacksManifest,
	type BackgroundPipelineItem,
	type CapabilityPacksManifest,
	type PluginApiVersion,
	type PluginBackgroundBlock,
	type PluginPipelineItem,
	type PluginRealtimeBlock,
	type PluginUiBlock,
	type PluginUiPanelItem,
	type RealtimePipelineItem,
} from "./manifest.js";

export type {
	PluginCapabilityApi,
	PluginCharactersApi,
	PluginCharacterRecord,
	PluginCharacterSummary,
	PluginChatTextInput,
	PluginChatTextResult,
	PluginDialogueEventHandler,
	PluginLlmApi,
	PluginMemoryApi,
	PluginMemoryQuery,
	PluginMemoryRecord,
	PluginOutboundApi,
	PluginOutboundRequest,
	PluginSessionApi,
	PluginSessionSummary,
	PluginTaskDescriptor,
	PluginTasksApi,
	PluginUserContext,
	PluginUserRecord,
	PluginUsersApi,
	PluginUserSummary,
} from "./api.js";

export {
	createMockPluginCapabilityApi,
	mockApi,
	type CreateMockPluginCapabilityApiOptions,
} from "./mockApi.js";

export {
	PLUGIN_LOG_EVENT_TYPES,
	type PluginLogEvent,
	type PluginLogEventType,
} from "./logEvents.js";
