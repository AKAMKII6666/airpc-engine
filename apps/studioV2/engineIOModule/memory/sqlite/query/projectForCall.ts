/**
	* 模块名称：MemoryPort.projectForCall（Sqlite）
	*/
import {
	MEMORY_PROJECT_DEFAULTS,
	type MemoryProjectionItem,
	type MemoryProjection,
} from "@airpc/rpg-engine";
import type { EntryRow, SqlDb } from "../db/types";

/** 热投影：稳定 semantic 优先，再补最近摘要、共同经历、情绪、承诺、身份 note 与 rollup。 */
export async function projectForCall(
	db: SqlDb,
	input: { userId: string; agentId: string },
): Promise<MemoryProjection> {
	const { maxCallSummaries, maxVignettes, maxRollups, maxSoftChars } =
		MEMORY_PROJECT_DEFAULTS;
	const maxSemantic = MEMORY_PROJECT_DEFAULTS.maxSemantic ?? 6;

	const summaries = db
		.prepare(
			"SELECT id, layer, kind, text, at, created_at FROM memory_entries WHERE user_id = ? AND agent_id = ? AND kind = 'call_summary' ORDER BY at DESC LIMIT ?",
		)
		.all(input.userId, input.agentId, maxCallSummaries) as EntryRow[];

	const vignettes = db
		.prepare(
			"SELECT id, layer, kind, text, at, created_at FROM memory_entries WHERE user_id = ? AND agent_id = ? AND kind = 'vignette' ORDER BY at DESC LIMIT ?",
		)
		.all(input.userId, input.agentId, maxVignettes) as EntryRow[];

	const semantic = db
		.prepare(
			"SELECT id, layer, kind, text, at, created_at FROM memory_entries WHERE user_id = ? AND agent_id = ? AND kind = 'semantic' ORDER BY at DESC LIMIT ?",
		)
		.all(input.userId, input.agentId, maxSemantic) as EntryRow[];

	const sharedEvents = db
		.prepare(
			"SELECT id, layer, kind, text, at, created_at FROM memory_entries WHERE user_id = ? AND agent_id = ? AND kind = 'shared_event' ORDER BY at DESC LIMIT ?",
		)
		.all(input.userId, input.agentId, maxVignettes) as EntryRow[];

	const emotions = db
		.prepare(
			"SELECT id, layer, kind, text, at, created_at FROM memory_entries WHERE user_id = ? AND agent_id = ? AND kind = 'emotion' ORDER BY at DESC LIMIT ?",
		)
		.all(input.userId, input.agentId, 2) as EntryRow[];

	const identityNotes = db
		.prepare(
			"SELECT id, layer, kind, text, at, created_at FROM memory_entries WHERE user_id = ? AND agent_id = ? AND kind = 'identity_note' ORDER BY at DESC LIMIT ?",
		)
		.all(input.userId, input.agentId, 2) as EntryRow[];

	const promises = db
		.prepare(
			"SELECT id, layer, kind, text, at, created_at FROM memory_entries WHERE user_id = ? AND agent_id = ? AND kind = 'promise' ORDER BY at DESC LIMIT ?",
		)
		.all(input.userId, input.agentId, 2) as EntryRow[];

	const socialShares = db
		.prepare(
			"SELECT id, layer, kind, text, at, created_at FROM memory_entries WHERE user_id = ? AND agent_id = ? AND kind = 'social_share' ORDER BY at DESC LIMIT ?",
		)
		.all(input.userId, input.agentId, 2) as EntryRow[];

	const attitudes = db
		.prepare(
			"SELECT id, layer, kind, text, at, created_at FROM memory_entries WHERE user_id = ? AND agent_id = ? AND kind = 'attitude' ORDER BY at DESC LIMIT 3",
		)
		.all(input.userId, input.agentId) as EntryRow[];

	const rollups = db
		.prepare(
			"SELECT id, summary as text, range_to as at, created_at FROM memory_rollups WHERE user_id = ? AND agent_id = ? ORDER BY range_to DESC LIMIT ?",
		)
		.all(input.userId, input.agentId, maxRollups) as Array<{
		id: string;
		text: string;
		at: string;
		created_at: string;
	}>;

	const chunks: string[] = [];
	const items: MemoryProjectionItem[] = [];
	const includedEntryIds: string[] = [];
	const rollupIds: string[] = [];
	const counts: Record<string, number> = {};
	let chars = 0;

	function pushChunk(
		label: string,
		id: string,
		text: string,
		at: string,
		createdAt: string,
		layer: string,
		isRollup: boolean,
	): void {
		const line = `[${label}] (${id.slice(0, 8)}) ${text}`;
		if (chars + line.length > maxSoftChars) return;
		chunks.push(line);
		chars += line.length + 1;
		counts[label] = (counts[label] ?? 0) + 1;
		items.push({
			id,
			layer,
			kind: label,
			text,
			at,
			createdAt,
			source: isRollup ? "rollup" : "entry",
		});
		if (isRollup) rollupIds.push(id);
		else includedEntryIds.push(id);
	}

	for (const row of semantic) {
		pushChunk("semantic", row.id, row.text, row.at, row.created_at, row.layer, false);
	}
	for (const row of summaries) {
		pushChunk("call_summary", row.id, row.text, row.at, row.created_at, row.layer, false);
	}
	for (const row of vignettes) {
		pushChunk("vignette", row.id, row.text, row.at, row.created_at, row.layer, false);
	}
	for (const row of sharedEvents) {
		pushChunk("shared_event", row.id, row.text, row.at, row.created_at, row.layer, false);
	}
	for (const row of emotions) {
		pushChunk("emotion", row.id, row.text, row.at, row.created_at, row.layer, false);
	}
	for (const row of identityNotes) {
		pushChunk("identity_note", row.id, row.text, row.at, row.created_at, row.layer, false);
	}
	for (const row of promises) {
		pushChunk("promise", row.id, row.text, row.at, row.created_at, row.layer, false);
	}
	for (const row of socialShares) {
		pushChunk("social_share", row.id, row.text, row.at, row.created_at, row.layer, false);
	}
	for (const row of attitudes) {
		pushChunk("attitude", row.id, row.text, row.at, row.created_at, row.layer, false);
	}
	for (const row of rollups) {
		pushChunk("rollup", row.id, row.text, row.at, row.created_at, "rollup", true);
	}

	return {
		softText: chunks.join("\n"),
		items,
		includedEntryIds,
		rollupIds,
		debug: {
			hotCount: includedEntryIds.length + rollupIds.length,
			chars,
			counts,
		},
	};
}
