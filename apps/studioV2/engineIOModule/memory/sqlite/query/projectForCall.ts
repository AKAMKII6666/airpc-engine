/**
	* 模块名称：MemoryPort.projectForCall（Sqlite）
	*/
import {
	MEMORY_PROJECT_DEFAULTS,
	type MemoryProjection,
} from "@airpc/rpg-engine";
import type { EntryRow, SqlDb } from "../db/types";

/** 热投影：最近 call_summary / vignette / rollup，受预算截断。 */
export async function projectForCall(
	db: SqlDb,
	input: { userId: string; agentId: string },
): Promise<MemoryProjection> {
	const { maxCallSummaries, maxVignettes, maxRollups, maxSoftChars } =
		MEMORY_PROJECT_DEFAULTS;

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
	const includedEntryIds: string[] = [];
	const rollupIds: string[] = [];
	let chars = 0;

	function pushChunk(
		label: string,
		id: string,
		text: string,
		isRollup: boolean,
	): void {
		const line = `[${label}] (${id.slice(0, 8)}) ${text}`;
		if (chars + line.length > maxSoftChars) return;
		chunks.push(line);
		chars += line.length + 1;
		if (isRollup) rollupIds.push(id);
		else includedEntryIds.push(id);
	}

	for (const row of summaries) {
		pushChunk("call_summary", row.id, row.text, false);
	}
	for (const row of vignettes) {
		pushChunk("vignette", row.id, row.text, false);
	}
	for (const row of rollups) {
		pushChunk("rollup", row.id, row.text, true);
	}

	return {
		softText: chunks.join("\n"),
		includedEntryIds,
		rollupIds,
		debug: {
			hotCount: includedEntryIds.length + rollupIds.length,
			chars,
		},
	};
}
