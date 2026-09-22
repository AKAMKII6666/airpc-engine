/**
	* 能力 API：memory 写路径（applyPatch / getById）。
	*/
import type { PluginMemoryRecord } from "@airpc/pack-sdk";
import type { EngineHost } from "@airpc/rpg-engine";

export async function writePluginMemory(input: {
	host: () => Promise<EngineHost>;
	userId: string;
	characterId: string;
	record: Record<string, unknown>;
}): Promise<PluginMemoryRecord> {
	const memory = (await input.host()).getMemoryPort();
	if (!memory) {
		throw new Error("memory_port_unavailable");
	}
	const text =
		typeof input.record.text === "string" && input.record.text.trim() !== ""
			? input.record.text
			: JSON.stringify(input.record);
	await memory.applyPatch({
		userId: input.userId,
		agentId: input.characterId,
		layer: "semantic",
		op: "insert",
		payload: { text, kind: "semantic" },
	});
	const hits = await memory.search({
		userId: input.userId,
		agentId: input.characterId,
		textQuery: text.slice(0, 48),
		maxResults: 1,
	});
	const hit = hits[0];
	return {
		id: hit?.id ?? `plugin_mem_${Date.now()}`,
		userId: input.userId,
		characterId: input.characterId,
		text,
		at: hit?.at,
		kind: hit?.kind ?? "semantic",
		layer: hit?.layer ?? "semantic",
	} as PluginMemoryRecord;
}

export async function updatePluginMemory(input: {
	host: () => Promise<EngineHost>;
	userId: string;
	characterId: string;
	memoryId: string;
	patch: Record<string, unknown>;
}): Promise<PluginMemoryRecord> {
	const memory = (await input.host()).getMemoryPort();
	if (!memory) {
		throw new Error("memory_port_unavailable");
	}
	const existing = await memory.getById({
		userId: input.userId,
		agentId: input.characterId,
		entryId: input.memoryId,
	});
	if (!existing) {
		throw new Error("memory_not_found");
	}
	const text =
		typeof input.patch.text === "string" && input.patch.text.trim() !== ""
			? input.patch.text
			: existing.text;
	// MemoryPort v1 仅 insert：追加新语义条，非原地更新
	const appendedText = `[update:${input.memoryId}] ${text}`;
	await memory.applyPatch({
		userId: input.userId,
		agentId: input.characterId,
		layer: "semantic",
		op: "insert",
		payload: {
			text: appendedText,
			kind: "semantic",
		},
	});
	const hits = await memory.search({
		userId: input.userId,
		agentId: input.characterId,
		textQuery: appendedText.slice(0, 48),
		maxResults: 1,
	});
	const appendedEntryId = hits[0]?.id ?? `plugin_mem_${Date.now()}`;
	return {
		id: appendedEntryId,
		userId: input.userId,
		characterId: input.characterId,
		text,
		updatedFrom: input.memoryId,
		appendedEntryId,
		inplaceUpdate: false,
	} as PluginMemoryRecord;
}
