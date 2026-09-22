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

type EntrySlice = {
	label: string;
	rows: Array<{
		id: string;
		text: string;
		at: string;
		created_at: string;
		layer: string;
	}>;
};

function entrySlices(rows: ProjectForCallRows): EntrySlice[] {
	return [
		{ label: "semantic", rows: rows.semantic },
		{ label: "call_summary", rows: rows.summaries },
		{ label: "vignette", rows: rows.vignettes },
		{ label: "shared_event", rows: rows.sharedEvents },
		{ label: "emotion", rows: rows.emotions },
		{ label: "identity_note", rows: rows.identityNotes },
		{ label: "promise", rows: rows.promises },
		{ label: "social_share", rows: rows.socialShares },
		{ label: "attitude", rows: rows.attitudes },
	];
}

function pushAllRows(rows: ProjectForCallRows, pushChunk: PushChunkFn): void {
	for (const slice of entrySlices(rows)) {
		for (const row of slice.rows) {
			pushChunk(
				slice.label,
				row.id,
				row.text,
				row.at,
				row.created_at,
				row.layer,
				false,
			);
		}
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
