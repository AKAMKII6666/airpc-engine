/**
	* memory 能力 API 的查询 / 投影实现。
	*/
import type {
	PluginMemoryQuery,
	PluginMemoryRecord,
} from "@airpc/pack-sdk";
import type { EngineHost } from "@airpc/rpg-engine";

export async function searchPluginMemoryHits(input: {
	host: () => Promise<EngineHost>;
	q: PluginMemoryQuery;
}): Promise<PluginMemoryRecord[]> {
	const memory = (await input.host()).getMemoryPort();
	if (!memory) return [];
	const hits = await memory.search({
		userId: input.q.userId,
		agentId: input.q.characterId,
		textQuery: input.q.q,
		maxResults: input.q.limit ?? 20,
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

export async function getPluginMemoryProjection(input: {
	host: () => Promise<EngineHost>;
	userId: string;
	characterId: string;
}): Promise<{ softText: string | null } | null> {
	const memory = (await input.host()).getMemoryPort();
	if (!memory) return null;
	const soft = await memory.projectForCall({
		userId: input.userId,
		agentId: input.characterId,
		card: {
			schemaVersion: 1,
			cardId: "__plugin_proj__",
			cardKind: "free",
			title: "plugin",
			agentId: input.characterId,
		} as never,
		nowIso: new Date().toISOString(),
	});
	return { softText: soft.softText ?? null };
}
