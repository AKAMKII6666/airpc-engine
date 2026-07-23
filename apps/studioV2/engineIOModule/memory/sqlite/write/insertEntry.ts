/**
	* 模块名称：Sqlite Memory 写入条目（含可选 FTS）
	*/
import { randomUUID } from "node:crypto";
import type { SqlDb } from "../db/types";

export type InsertEntryInput = {
	userId: string;
	agentId: string;
	layer: string;
	kind: string;
	text: string;
	at: string;
	callId?: string;
};

/** 构造 insertEntry；ftsReady=false 时跳过 FTS 同步。 */
export function createInsertEntry(
	db: SqlDb,
	ftsReady: boolean,
): (input: InsertEntryInput) => string {
	function insertFts(row: {
		id: string;
		userId: string;
		agentId: string;
		text: string;
		kind: string | null;
		at: string;
	}): void {
		if (!ftsReady) return;
		db.prepare(
			"INSERT INTO memory_entries_fts(entry_id, user_id, agent_id, text, kind, at) VALUES (?, ?, ?, ?, ?, ?)",
		).run(row.id, row.userId, row.agentId, row.text, row.kind, row.at);
	}

	return function insertEntry(input: InsertEntryInput): string {
		const id = randomUUID();
		const now = input.at;
		db.prepare(
			"INSERT INTO memory_entries (id, user_id, agent_id, layer, kind, text, at, created_at, updated_at, call_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		).run(
			id,
			input.userId,
			input.agentId,
			input.layer,
			input.kind,
			input.text,
			input.at,
			now,
			now,
			input.callId ?? null,
		);
		insertFts({
			id,
			userId: input.userId,
			agentId: input.agentId,
			text: input.text,
			kind: input.kind,
			at: input.at,
		});
		return id;
	};
}
