/**
 * L2 tools.register 正式契约。
 * SDK 不依赖引擎；CardKind 与 JSON Schema 在此保持中性软拷贝。
 */
import type { PluginCapabilityApi } from "./api.js";

export type PluginToolCardKind =
	| "story"
	| "free"
	| "system"
	| "schedule"
	| "voicemail";

export type JsonSchema = Record<string, unknown>;

export interface PluginToolInvocation {
	session: {
		sessionId: string;
		userId: string;
		agentId: string;
		chapterId: string;
		cardId: string;
	};
	/** 已由宿主按 inputSchema 校验的参数。 */
	args: Record<string, unknown>;
	/** 宿主能力门面；不暴露 data/ 或插件目录路径。 */
	capabilities: PluginCapabilityApi;
}

export interface PluginToolContribution {
	/** 插件内局部 id；宿主会标准化为 plugin:<pluginId>:<localToolId>。 */
	localToolId: string;
	displayName: string;
	description: string;
	inputSchema: JsonSchema;
	allowedCardKinds: PluginToolCardKind[];
	allowedInPlayback: boolean;
	invoke(input: PluginToolInvocation): Promise<unknown>;
}

const LOCAL_TOOL_ID_RE = /^[a-z][a-z0-9_]{1,63}$/;

export function assertPluginToolContribution(
	value: unknown,
): asserts value is PluginToolContribution {
	if (!value || typeof value !== "object") {
		throw new Error("plugin_tool_invalid:expected_object");
	}
	const item = value as Partial<PluginToolContribution>;
	if (
		typeof item.localToolId !== "string" ||
		!LOCAL_TOOL_ID_RE.test(item.localToolId)
	) {
		throw new Error("plugin_tool_invalid:localToolId");
	}
	if (!item.displayName?.trim()) {
		throw new Error("plugin_tool_invalid:displayName");
	}
	if (!item.description?.trim()) {
		throw new Error("plugin_tool_invalid:description");
	}
	if (!item.inputSchema || typeof item.inputSchema !== "object") {
		throw new Error("plugin_tool_invalid:inputSchema");
	}
	if (!Array.isArray(item.allowedCardKinds) || item.allowedCardKinds.length === 0) {
		throw new Error("plugin_tool_invalid:allowedCardKinds");
	}
	const validKinds = new Set([
		"story",
		"free",
		"system",
		"schedule",
		"voicemail",
	]);
	if (item.allowedCardKinds.some(function (kind) { return !validKinds.has(kind); })) {
		throw new Error("plugin_tool_invalid:allowedCardKinds");
	}
	if (typeof item.allowedInPlayback !== "boolean") {
		throw new Error("plugin_tool_invalid:allowedInPlayback");
	}
	if (typeof item.invoke !== "function") {
		throw new Error("plugin_tool_invalid:invoke");
	}
}
