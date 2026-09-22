/**
	* 能力 API：memory 域（经 MemoryPort；禁止路径泄漏）。
	*/
import type { PluginCapabilityApi } from "@airpc/pack-sdk";
import type { EngineHost } from "@airpc/rpg-engine";
import type { WrapApiCall } from "../core/wrapApiCall.server";
import {
	getPluginMemoryProjection,
	searchPluginMemoryHits,
} from "./memoryQuery.server";
import {
	updatePluginMemory,
	writePluginMemory,
} from "./memoryWrite.server";

export function createMemoryApi(input: {
	pluginId: string;
	wrap: WrapApiCall;
	host: () => Promise<EngineHost>;
}): Pick<PluginCapabilityApi, "memory"> {
	const { wrap, pluginId, host } = input;
	return {
		memory: {
			query(q) {
				return wrap(pluginId, "memory.query", function () {
					return searchPluginMemoryHits({ host, q });
				});
			},
			search(q) {
				return wrap(pluginId, "memory.search", function () {
					return searchPluginMemoryHits({ host, q });
				});
			},
			write(userId, characterId, record) {
				return wrap(pluginId, "memory.write", function () {
					return writePluginMemory({ host, userId, characterId, record });
				});
			},
			update(userId, characterId, memoryId, patch) {
				return wrap(pluginId, "memory.update", function () {
					return updatePluginMemory({
						host,
						userId,
						characterId,
						memoryId,
						patch,
					});
				});
			},
			getProjection(userId, characterId) {
				return wrap(pluginId, "memory.getProjection", function () {
					return getPluginMemoryProjection({ host, userId, characterId });
				});
			},
		},
	};
}
