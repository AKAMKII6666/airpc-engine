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

function filterStringItems(items: unknown[]): string[] {
	return items.filter(function (item): item is string {
		return typeof item === "string";
	});
}

/** 校验 attitude payload 字段；任一必填缺失则丢弃整段。 */
function parseAttitudeObject(
	parsed: unknown,
): MemoryAttitudePayload | undefined {
	if (!parsed || typeof parsed !== "object") return undefined;
	const p = parsed as Partial<MemoryAttitudePayload>;
	if (
		typeof p.stance !== "string" ||
		typeof p.summary !== "string" ||
		typeof p.evidence !== "string" ||
		!Array.isArray(p.feel) ||
		!Array.isArray(p.keywords)
	) {
		return undefined;
	}
	return {
		stance: p.stance,
		summary: p.summary,
		evidence: p.evidence,
		feel: filterStringItems(p.feel),
		keywords: filterStringItems(p.keywords),
	};
}

function asAttitudePayload(value: unknown): MemoryAttitudePayload | undefined {
	if (typeof value !== "string" || value.trim() === "") return undefined;
	try {
		return parseAttitudeObject(JSON.parse(value));
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
