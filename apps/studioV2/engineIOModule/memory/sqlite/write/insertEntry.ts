/**
	* 模块名称：Sqlite Memory 写入条目（含可选 FTS）
	*/
import { createHash, randomUUID } from "node:crypto";
import type { SqlDb } from "../db/types";

export type InsertEntryInput = {
	userId: string;
	agentId: string;
	layer: string;
	kind: string;
	text: string;
	at: string;
	callId?: string;
	payload?: unknown;
};

function normalizeForHash(value: string): string {
	return value.trim().replace(/\s+/g, " ");
}

function contentHash(input: InsertEntryInput): string | null {
	if (!input.callId) return null;
	const payloadMaterial =
		input.payload === undefined ? "" : JSON.stringify(input.payload);
	const material = [
		input.userId,
		input.agentId,
		input.callId,
		input.layer,
		input.kind,
		normalizeForHash(input.text),
		normalizeForHash(payloadMaterial),
	].join("\n");
	return createHash("sha256").update(material).digest("hex");
}

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
		const hash = contentHash(input);
		const result = db.prepare(
			"INSERT OR IGNORE INTO memory_entries (id, user_id, agent_id, layer, kind, text, at, created_at, updated_at, call_id, content_hash, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
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
			hash,
			input.payload === undefined ? null : JSON.stringify(input.payload),
		);
		if (result.changes === 0 && hash) {
			const existing = db.prepare(
				"SELECT id FROM memory_entries WHERE user_id = ? AND agent_id = ? AND call_id = ? AND layer = ? AND kind = ? AND content_hash = ? LIMIT 1",
			).get(
				input.userId,
				input.agentId,
				input.callId,
				input.layer,
				input.kind,
				hash,
			) as { id: string } | undefined;
			if (existing?.id) return existing.id;
		}
		if (result.changes === 0) return id;
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
