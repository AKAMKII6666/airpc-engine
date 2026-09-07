/**
	* 能力 API：memory 域（经 MemoryPort；禁止路径泄漏）。
	*/
import type {
	PluginCapabilityApi,
	PluginMemoryQuery,
	PluginMemoryRecord,
} from "@airpc/pack-sdk";
import type { EngineHost } from "@airpc/rpg-engine";
import type { WrapApiCall } from "./wrapApiCall.server";
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

	async function searchHits(q: PluginMemoryQuery): Promise<PluginMemoryRecord[]> {
		const memory = (await host()).getMemoryPort();
		if (!memory) return [];
		const hits = await memory.search({
			userId: q.userId,
			agentId: q.characterId,
			textQuery: q.q,
			maxResults: q.limit ?? 20,
		});
		return hits.map(function (hit) {
			return {
				id: hit.id,
				text: hit.text,
				at: hit.at,
				kind: hit.kind,
				layer: hit.layer,
			} as PluginMemoryRecord;
		});
	}

	return {
		memory: {
			query(q) {
				return wrap(pluginId, "memory.query", function () {
					return searchHits(q);
				});
			},
			search(q) {
				return wrap(pluginId, "memory.search", function () {
					return searchHits(q);
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
				return wrap(pluginId, "memory.getProjection", async function () {
					const memory = (await host()).getMemoryPort();
					if (!memory) return null;
					const soft = await memory.projectForCall({
						userId,
						agentId: characterId,
						card: {
							schemaVersion: 1,
							cardId: "__plugin_proj__",
							cardKind: "free",
							title: "plugin",
							agentId: characterId,
						} as never,
						nowIso: new Date().toISOString(),
					});
					return { softText: soft.softText ?? null };
				});
			},
		},
	};
}
