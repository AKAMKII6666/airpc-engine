/**
	* 模块名称：读取最近 attitude 记忆（用于挂机抽取历史参考）。
	*/
import type {
	MemoryAttitudeEntry,
	MemoryAttitudePayload,
} from "@airpc/rpg-engine";
import type { SqlDb } from "../db/types";

type AttitudeRow = {
	id: string;
	text: string;
	at: string;
	payload_json: string | null;
};

function asAttitudePayload(value: unknown): MemoryAttitudePayload | undefined {
	if (typeof value !== "string" || value.trim() === "") return undefined;
	try {
		const parsed = JSON.parse(value) as Partial<MemoryAttitudePayload> | null;
		if (!parsed || typeof parsed !== "object") return undefined;
		if (typeof parsed.stance !== "string") return undefined;
		if (typeof parsed.summary !== "string") return undefined;
		if (typeof parsed.evidence !== "string") return undefined;
		if (!Array.isArray(parsed.feel)) return undefined;
		if (!Array.isArray(parsed.keywords)) return undefined;
		return {
			stance: parsed.stance,
			summary: parsed.summary,
			evidence: parsed.evidence,
			feel: parsed.feel.filter(function (item): item is string {
				return typeof item === "string";
			}),
			keywords: parsed.keywords.filter(function (item): item is string {
				return typeof item === "string";
			}),
		};
	} catch {
		return undefined;
	}
}

export function listRecentAttitudes(
	db: SqlDb,
	input: { userId: string; agentId: string; limit: number },
): MemoryAttitudeEntry[] {
	const limit = Math.max(1, Math.floor(input.limit));
	const rows = db
		.prepare(
			"SELECT id, text, at, payload_json FROM memory_entries WHERE user_id = ? AND agent_id = ? AND layer = 'relational' AND kind = 'attitude' ORDER BY at DESC LIMIT ?",
		)
		.all(input.userId, input.agentId, limit) as AttitudeRow[];
	return rows.map(function (row) {
		return {
			id: row.id,
			text: row.text,
			at: row.at,
			payload: asAttitudePayload(row.payload_json),
		};
	});
}
