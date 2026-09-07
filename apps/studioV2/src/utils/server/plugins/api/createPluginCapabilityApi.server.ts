/**
	* L2 能力 API 门面实现（25 §6）：经 Host / 既有 BFF IO；禁止返回磁盘路径。
	*/
import type {
	PluginCapabilityApi,
	PluginOutboundRequest,
	PluginSessionSummary,
} from "@airpc/pack-sdk";
import type { EngineHost } from "@airpc/rpg-engine";
import { createWrapApiCall } from "./wrapApiCall.server";
import { createUsersApi } from "./usersApi.server";
import { createCharactersApi } from "./charactersApi.server";
import { createMemoryApi } from "./memoryApi.server";
import { createLlmApi, defaultLlmChatText } from "./llmApi.server";
import { createSessionTasksOutboundApi } from "./sessionTasksOutboundApi.server";

export type CreatePluginCapabilityApiDeps = {
	pluginId: string;
	getHost: () => EngineHost | Promise<EngineHost>;
	getCurrentUserId?: () => string | null;
	getSessionSummary?: () => PluginSessionSummary | null;
	requestOutbound?: (
		input: PluginOutboundRequest,
	) => Promise<{ accepted: boolean; reason?: string }>;
};

/**
	* 为单个插件构造能力 API；路径字段永不返回。
	*/
export function createPluginCapabilityApi(
	deps: CreatePluginCapabilityApiDeps,
): PluginCapabilityApi {
	const pluginId = deps.pluginId;
	const wrap = createWrapApiCall();
	async function host(): Promise<EngineHost> {
		return await deps.getHost();
	}
	return {
		pluginId,
		...createUsersApi({
			pluginId,
			wrap,
			host,
			getCurrentUserId: deps.getCurrentUserId,
		}),
		...createCharactersApi({ pluginId, wrap, host }),
		...createMemoryApi({ pluginId, wrap, host }),
		...createLlmApi({
			pluginId,
			wrap,
			llmChatText: defaultLlmChatText,
		}),
		...createSessionTasksOutboundApi({
			pluginId,
			wrap,
			host,
			getSessionSummary: deps.getSessionSummary,
			requestOutbound: deps.requestOutbound,
		}),
	};
}
