/**
	* 模块名称：MemoryPort getById / applyPatch / commitAfterCall
	*/
import {
	MEMORY_SEARCH_DEFAULTS,
	type MemoryCommitInput,
	type MemoryCommitResult,
	type MemorySearchHit,
} from "@airpc/rpg-engine";
import { truncate } from "../util/helpers";
import type { createInsertEntry } from "./insertEntry";
import type { EntryRow, SqlDb } from "../db/types";

type InsertFn = ReturnType<typeof createInsertEntry>;

export async function getMemoryById(
	db: SqlDb,
	input: { userId: string; agentId: string; entryId: string },
): Promise<MemorySearchHit | null> {
	const row = db
		.prepare(
			"SELECT id, user_id, agent_id, layer, kind, text, at, created_at FROM memory_entries WHERE id = ? AND user_id = ? AND agent_id = ?",
		)
		.get(input.entryId, input.userId, input.agentId) as EntryRow | undefined;
	if (!row) return null;
	return {
		id: row.id,
		layer: row.layer,
		kind: row.kind ?? undefined,
		text: truncate(row.text, MEMORY_SEARCH_DEFAULTS.getByIdChars),
		at: row.at,
		createdAt: row.created_at,
	};
}

export async function applyMemoryPatch(
	insertEntry: InsertFn,
	input: {
		userId: string;
		agentId: string;
		layer: string;
		payload: unknown;
	},
): Promise<void> {
	const payload = input.payload as { text?: string; kind?: string };
	const text =
		typeof payload?.text === "string"
			? payload.text
			: JSON.stringify(input.payload);
	const kind =
		typeof payload?.kind === "string"
			? payload.kind
			: input.layer === "semantic"
				? "semantic"
				: "beat";
	insertEntry({
		userId: input.userId,
		agentId: input.agentId,
		layer: input.layer,
		kind,
		text,
		at: new Date().toISOString(),
	});
}

export async function commitMemoryAfterCall(
	insertEntry: InsertFn,
	input: MemoryCommitInput,
): Promise<MemoryCommitResult> {
	try {
		const summary =
			input.summaryText?.trim() ||
			`call_summary session=${input.sessionId} ended=${input.endedAt}`;
		const ids: string[] = [];
		ids.push(
			insertEntry({
				userId: input.userId,
				agentId: input.agentId,
				layer: "episodic",
				kind: "call_summary",
				text: summary,
				at: input.endedAt,
				callId: input.sessionId,
			}),
		);
		for (const raw of input.vignettes ?? []) {
			const text = typeof raw === "string" ? raw.trim() : "";
			if (!text) continue;
			ids.push(
				insertEntry({
					userId: input.userId,
					agentId: input.agentId,
					layer: "episodic",
					kind: "vignette",
					text,
					at: input.endedAt,
					callId: input.sessionId,
				}),
			);
		}
		return {
			ok: true,
			writtenLayers: ["episodic"],
			writtenEpisodicIds: ids,
		};
	} catch (err) {
		return {
			ok: false,
			writtenLayers: [],
			error: err instanceof Error ? err.message : String(err),
		};
	}
}
