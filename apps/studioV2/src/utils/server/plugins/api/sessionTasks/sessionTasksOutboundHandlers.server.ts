/**
	* session / tasks / outbound 能力 API 的具体实现与 wrap 装配。
	*/
import type {
	PluginCapabilityApi,
	PluginOutboundRequest,
	PluginSessionSummary,
	PluginTaskDescriptor,
} from "@airpc/pack-sdk";
import type { EngineHost } from "@airpc/rpg-engine";
import { emitPluginLog } from "@studio-v2/src/utils/server/plugins/log/pluginLog.server";
import {
	cancelPluginTask,
	getPluginTask,
	listPluginTasks,
	registerPluginTask,
} from "@studio-v2/src/utils/server/plugins/tasks/pluginTaskScheduler.server";
import type { WrapApiCall } from "../core/wrapApiCall.server";

function notWiredSession(method: string): never {
	throw new Error(`session.${method}:not_wired`);
}

export function buildSessionApi(input: {
	pluginId: string;
	wrap: WrapApiCall;
	getSessionSummary?: () => PluginSessionSummary | null;
}): PluginCapabilityApi["session"] {
	const { pluginId, wrap } = input;
	return {
		getSummary() {
			return wrap(pluginId, "session.getSummary", async function () {
				return input.getSessionSummary?.() ?? null;
			});
		},
		subscribeEvents() {
			emitPluginLog({
				type: "plugin.api_call",
				pluginId,
				method: "session.subscribeEvents",
				ok: false,
			});
			notWiredSession("subscribeEvents");
		},
		injectSpeakable() {
			return wrap(pluginId, "session.injectSpeakable", async function () {
				notWiredSession("injectSpeakable");
			});
		},
		reportToolResult() {
			return wrap(pluginId, "session.reportToolResult", async function () {
				notWiredSession("reportToolResult");
			});
		},
		registerExitCandidate() {
			return wrap(
				pluginId,
				"session.registerExitCandidate",
				async function () {
					notWiredSession("registerExitCandidate");
				},
			);
		},
	};
}

export function buildTasksApi(input: {
	pluginId: string;
	wrap: WrapApiCall;
}): PluginCapabilityApi["tasks"] {
	const { pluginId, wrap } = input;
	return {
		register(task: PluginTaskDescriptor) {
			return wrap(pluginId, "tasks.register", function () {
				return registerPluginTask(pluginId, task);
			});
		},
		cancel(taskId) {
			return wrap(pluginId, "tasks.cancel", function () {
				return cancelPluginTask(pluginId, taskId);
			});
		},
		list() {
			return wrap(pluginId, "tasks.list", function () {
				// 强制本插件归属，忽略调用方传入的 filter.pluginId
				return listPluginTasks({ pluginId });
			});
		},
		get(taskId) {
			return wrap(pluginId, "tasks.get", function () {
				return getPluginTask(pluginId, taskId);
			});
		},
	};
}

async function requestPluginOutboundCall(input: {
	pluginId: string;
	req: PluginOutboundRequest;
	requestOutbound?: (
		req: PluginOutboundRequest,
	) => Promise<{ accepted: boolean; reason?: string }>;
}): Promise<{ accepted: boolean; reason?: string }> {
	if (input.requestOutbound) {
		const result = await input.requestOutbound(input.req);
		emitPluginLog({
			type: "plugin.outbound_request",
			pluginId: input.pluginId,
			accepted: result.accepted,
		});
		return result;
	}
	emitPluginLog({
		type: "plugin.outbound_request",
		pluginId: input.pluginId,
		accepted: false,
	});
	return {
		accepted: false,
		reason: "outbound_handler_unconfigured",
	};
}

export function buildOutboundApi(input: {
	pluginId: string;
	wrap: WrapApiCall;
	host: () => Promise<EngineHost>;
	requestOutbound?: (
		req: PluginOutboundRequest,
	) => Promise<{ accepted: boolean; reason?: string }>;
}): PluginCapabilityApi["outbound"] {
	const { pluginId, wrap, host } = input;
	return {
		requestCall(req) {
			return wrap(pluginId, "outbound.requestCall", function () {
				return requestPluginOutboundCall({
					pluginId,
					req,
					requestOutbound: input.requestOutbound,
				});
			});
		},
		getDialability(userId, characterId) {
			return wrap(pluginId, "outbound.getDialability", async function () {
				const profile = await (await host()).ensureProfile(userId);
				return {
					userId,
					characterId,
					hasProfile: Boolean(profile),
				};
			});
		},
	};
}
