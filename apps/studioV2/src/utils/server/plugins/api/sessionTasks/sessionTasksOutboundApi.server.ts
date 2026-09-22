/**
	* 能力 API：session / tasks / outbound。
	* session 实时注入类方法显式 not_wired（L2 收口补完定稿）。
	*/
import type {
	PluginCapabilityApi,
	PluginOutboundRequest,
	PluginSessionSummary,
} from "@airpc/pack-sdk";
import type { EngineHost } from "@airpc/rpg-engine";
import type { WrapApiCall } from "../core/wrapApiCall.server";
import {
	buildOutboundApi,
	buildSessionApi,
	buildTasksApi,
} from "./sessionTasksOutboundHandlers.server";

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
		session: buildSessionApi({
			pluginId,
			wrap,
			getSessionSummary: input.getSessionSummary,
		}),
		tasks: buildTasksApi({ pluginId, wrap }),
		outbound: buildOutboundApi({
			pluginId,
			wrap,
			host,
			requestOutbound: input.requestOutbound,
		}),
	};
}
