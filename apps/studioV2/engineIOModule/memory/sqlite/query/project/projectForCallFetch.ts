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

/** 热投影所需各 kind 的最近条目与 rollup。 */
export function fetchProjectForCallRows(
	db: SqlDb,
	input: { userId: string; agentId: string },
): ProjectForCallRows {
	const { maxCallSummaries, maxVignettes, maxRollups } = MEMORY_PROJECT_DEFAULTS;
	const maxSemantic = MEMORY_PROJECT_DEFAULTS.maxSemantic ?? 6;

	return {
		summaries: fetchEntriesByKind(
			db,
			input.userId,
			input.agentId,
			"call_summary",
			maxCallSummaries,
		),
		vignettes: fetchEntriesByKind(
			db,
			input.userId,
			input.agentId,
			"vignette",
			maxVignettes,
		),
		semantic: fetchEntriesByKind(
			db,
			input.userId,
			input.agentId,
			"semantic",
			maxSemantic,
		),
		sharedEvents: fetchEntriesByKind(
			db,
			input.userId,
			input.agentId,
			"shared_event",
			maxVignettes,
		),
		emotions: fetchEntriesByKind(db, input.userId, input.agentId, "emotion", 2),
		identityNotes: fetchEntriesByKind(
			db,
			input.userId,
			input.agentId,
			"identity_note",
			2,
		),
		promises: fetchEntriesByKind(db, input.userId, input.agentId, "promise", 2),
		socialShares: fetchEntriesByKind(
			db,
			input.userId,
			input.agentId,
			"social_share",
			2,
		),
		attitudes: fetchEntriesByKind(
			db,
			input.userId,
			input.agentId,
			"attitude",
			3,
		),
		rollups: db
			.prepare(
				"SELECT id, summary as text, range_to as at, created_at FROM memory_rollups WHERE user_id = ? AND agent_id = ? ORDER BY range_to DESC LIMIT ?",
			)
			.all(input.userId, input.agentId, maxRollups) as Array<{
			id: string;
			text: string;
			at: string;
			created_at: string;
		}>,
	};
}
