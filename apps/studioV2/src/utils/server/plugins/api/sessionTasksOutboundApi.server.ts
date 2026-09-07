/**
	* 能力 API：session / tasks / outbound。
	* session 实时注入类方法显式 not_wired（L2 收口补完定稿）。
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
import type { WrapApiCall } from "./wrapApiCall.server";

function notWired(method: string): never {
	throw new Error(`session.${method}:not_wired`);
}

export function createSessionTasksOutboundApi(input: {
	pluginId: string;
	wrap: WrapApiCall;
	host: () => Promise<EngineHost>;
	getSessionSummary?: () => PluginSessionSummary | null;
	requestOutbound?: (
		req: PluginOutboundRequest,
	) => Promise<{ accepted: boolean; reason?: string }>;
}): Pick<PluginCapabilityApi, "session" | "tasks" | "outbound"> {
	const { wrap, pluginId, host } = input;
	return {
		session: {
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
				notWired("subscribeEvents");
			},
			injectSpeakable() {
				return wrap(pluginId, "session.injectSpeakable", async function () {
					notWired("injectSpeakable");
				});
			},
			reportToolResult() {
				return wrap(pluginId, "session.reportToolResult", async function () {
					notWired("reportToolResult");
				});
			},
			registerExitCandidate() {
				return wrap(
					pluginId,
					"session.registerExitCandidate",
					async function () {
						notWired("registerExitCandidate");
					},
				);
			},
		},
		tasks: {
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
		},
		outbound: {
			requestCall(req) {
				return wrap(pluginId, "outbound.requestCall", async function () {
					if (input.requestOutbound) {
						const result = await input.requestOutbound(req);
						emitPluginLog({
							type: "plugin.outbound_request",
							pluginId,
							accepted: result.accepted,
						});
						return result;
					}
					emitPluginLog({
						type: "plugin.outbound_request",
						pluginId,
						accepted: false,
					});
					return {
						accepted: false,
						reason: "outbound_handler_unconfigured",
					};
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
		},
	};
}
