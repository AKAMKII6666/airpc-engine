/**
	* MemoryPort.projectForCall：按 kind 拉取 entry / rollup 行。
	*/
import { MEMORY_PROJECT_DEFAULTS } from "@airpc/rpg-engine";
import type { EntryRow, SqlDb } from "../../db/types";

export type ProjectForCallRows = {
	summaries: EntryRow[];
	vignettes: EntryRow[];
	semantic: EntryRow[];
	sharedEvents: EntryRow[];
	emotions: EntryRow[];
	identityNotes: EntryRow[];
	promises: EntryRow[];
	socialShares: EntryRow[];
	attitudes: EntryRow[];
	rollups: Array<{
		id: string;
		text: string;
		at: string;
		created_at: string;
	}>;
};

function fetchEntriesByKind(
	db: SqlDb,
	userId: string,
	agentId: string,
	kind: string,
	limit: number,
): EntryRow[] {
	return db
		.prepare(
			"SELECT id, layer, kind, text, at, created_at FROM memory_entries WHERE user_id = ? AND agent_id = ? AND kind = ? ORDER BY at DESC LIMIT ?",
		)
		.all(userId, agentId, kind, limit) as EntryRow[];
}

function fetchRollups(
	db: SqlDb,
	userId: string,
	agentId: string,
	limit: number,
): ProjectForCallRows["rollups"] {
	return db
		.prepare(
			"SELECT id, summary as text, range_to as at, created_at FROM memory_rollups WHERE user_id = ? AND agent_id = ? ORDER BY range_to DESC LIMIT ?",
		)
		.all(userId, agentId, limit) as ProjectForCallRows["rollups"];
}

/** 热投影所需各 kind 的最近条目与 rollup。 */
export function fetchProjectForCallRows(
	db: SqlDb,
	input: { userId: string; agentId: string },
): ProjectForCallRows {
	const { userId, agentId } = input;
	const d = MEMORY_PROJECT_DEFAULTS;
	const maxSemantic = d.maxSemantic ?? 6;
	const fetch = (kind: string, limit: number) =>
		fetchEntriesByKind(db, userId, agentId, kind, limit);

	return {
		summaries: fetch("call_summary", d.maxCallSummaries),
		vignettes: fetch("vignette", d.maxVignettes),
		semantic: fetch("semantic", maxSemantic),
		sharedEvents: fetch("shared_event", d.maxVignettes),
		emotions: fetch("emotion", 2),
		identityNotes: fetch("identity_note", 2),
		promises: fetch("promise", 2),
		socialShares: fetch("social_share", 2),
		attitudes: fetch("attitude", 3),
		rollups: fetchRollups(db, userId, agentId, d.maxRollups),
	};
}
