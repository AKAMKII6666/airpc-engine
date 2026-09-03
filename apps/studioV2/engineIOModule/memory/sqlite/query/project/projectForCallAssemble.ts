/**
	* MemoryPort.projectForCall：把 entry/rollup 行组装成 softText 投影。
	*/
import type { MemoryProjection, MemoryProjectionItem } from "@airpc/rpg-engine";
import { MEMORY_PROJECT_DEFAULTS } from "@airpc/rpg-engine";
import type { ProjectForCallRows } from "./projectForCallFetch";

type PushChunkFn = (
	label: string,
	id: string,
	text: string,
	at: string,
	createdAt: string,
	layer: string,
	isRollup: boolean,
) => void;

function pushAllRows(rows: ProjectForCallRows, pushChunk: PushChunkFn): void {
	for (const row of rows.semantic) {
		pushChunk("semantic", row.id, row.text, row.at, row.created_at, row.layer, false);
	}
	for (const row of rows.summaries) {
		pushChunk(
			"call_summary",
			row.id,
			row.text,
			row.at,
			row.created_at,
			row.layer,
			false,
		);
	}
	for (const row of rows.vignettes) {
		pushChunk("vignette", row.id, row.text, row.at, row.created_at, row.layer, false);
	}
	for (const row of rows.sharedEvents) {
		pushChunk(
			"shared_event",
			row.id,
			row.text,
			row.at,
			row.created_at,
			row.layer,
			false,
		);
	}
	for (const row of rows.emotions) {
		pushChunk("emotion", row.id, row.text, row.at, row.created_at, row.layer, false);
	}
	for (const row of rows.identityNotes) {
		pushChunk(
			"identity_note",
			row.id,
			row.text,
			row.at,
			row.created_at,
			row.layer,
			false,
		);
	}
	for (const row of rows.promises) {
		pushChunk("promise", row.id, row.text, row.at, row.created_at, row.layer, false);
	}
	for (const row of rows.socialShares) {
		pushChunk(
			"social_share",
			row.id,
			row.text,
			row.at,
			row.created_at,
			row.layer,
			false,
		);
	}
	for (const row of rows.attitudes) {
		pushChunk("attitude", row.id, row.text, row.at, row.created_at, row.layer, false);
	}
	for (const row of rows.rollups) {
		pushChunk("rollup", row.id, row.text, row.at, row.created_at, "rollup", true);
	}
}

/** 按 softChars 上限拼装 MemoryProjection。 */
export function assembleProjectForCall(
	rows: ProjectForCallRows,
): MemoryProjection {
	const { maxSoftChars } = MEMORY_PROJECT_DEFAULTS;
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

	pushAllRows(rows, pushChunk);

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
