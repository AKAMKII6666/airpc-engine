/**
	* Memory 只读列表：直接查 data/memory/memory.sqlite。
	* 不用 MemoryPort.search（工具侧 hardMaxResults=10 且须 text/时间窗），
	* Studio 列表需要按 userId+agentId 分页浏览；禁止写口。
	*/
import { existsSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { getStudioV2DataRoot } from "../data/dataRoot.server";

export type MemoryListRow = {
	/** 记忆条目稳定 id */
	id: string;
	/** 层名（episodic 等）；仅展示 */
	layer: string;
	/** 种类；可空 */
	kind: string | null;
	/** 正文摘要；过长截断 */
	text: string;
	/** 事件时间 ISO */
	at: string;
	/** 写入时间 ISO */
	createdAt: string;
};

export type MemoryAttitudeListRow = {
	/** 条目 id */
	id: string;
	/** 短态度标签，如“亲近”“关切支持” */
	stance: string;
	/** 一句人话摘要 */
	summary: string;
	/** 本通依据 */
	evidence: string;
	/** 抽象感觉标签 */
	feel: string[];
	/** 用于后续记忆溯源的关键词 */
	keywords: string[];
	/** 事件时间 ISO */
	at: string;
};

export type MemoryListPage = {
	items: MemoryListRow[];
	attitudes: MemoryAttitudeListRow[];
	total: number;
	page: number;
	pageSize: number;
};

const SNIPPET_CHARS = 240;

function memoryDbPath(): string {
	return path.join(getStudioV2DataRoot(), "memory", "memory.sqlite");
}

function truncate(text: string, max: number): string {
	if (text.length <= max) return text;
	return text.slice(0, max - 1) + "…";
}

function asStringArray(value: unknown): string[] {
	return Array.isArray(value)
		? value.filter(function (item): item is string {
				return typeof item === "string";
			})
		: [];
}

function parseAttitudePayload(
	value: unknown,
): MemoryAttitudeListRow | null {
	if (typeof value !== "string" || value.trim() === "") return null;
	try {
		const payload = JSON.parse(value) as Partial<MemoryAttitudeListRow> | null;
		if (!payload || typeof payload !== "object") return null;
		if (
			typeof payload.stance !== "string" ||
			typeof payload.summary !== "string" ||
			typeof payload.evidence !== "string"
		) {
			return null;
		}
		return {
			id: typeof payload.id === "string" ? payload.id : "",
			stance: payload.stance,
			summary: payload.summary,
			evidence: payload.evidence,
			feel: asStringArray(payload.feel),
			keywords: asStringArray(payload.keywords),
			at: typeof payload.at === "string" ? payload.at : "",
		};
	} catch {
		return null;
	}
}

/**
	* 按 userId + agentId 只读分页；库不存在或表未建时返回空页。
	*/
export function listMemoryPage(input: {
	userId: string;
	agentId: string;
	page: number;
	pageSize: number;
}): MemoryListPage {
	const page = input.page < 1 ? 1 : input.page;
	const pageSize =
		input.pageSize < 1 ? 10 : Math.min(input.pageSize, 50);
	const dbPath = memoryDbPath();
	if (!existsSync(dbPath)) {
		return { items: [], attitudes: [], total: 0, page, pageSize };
	}

	const db = new Database(dbPath, { readonly: true, fileMustExist: true });
	try {
		const table = db
			.prepare(
				"SELECT name FROM sqlite_master WHERE type='table' AND name='memory_entries'",
			)
			.get() as { name?: string } | undefined;
		if (!table?.name) {
			return { items: [], attitudes: [], total: 0, page, pageSize };
		}

		const totalRow = db
			.prepare(
				"SELECT COUNT(*) AS c FROM memory_entries WHERE user_id = ? AND agent_id = ? AND NOT (layer = 'relational' AND kind = 'attitude')",
			)
			.get(input.userId, input.agentId) as { c: number };
		const total = Number(totalRow?.c ?? 0);
		const offset = (page - 1) * pageSize;
		const rows = db
			.prepare(
				"SELECT id, layer, kind, text, at, created_at FROM memory_entries WHERE user_id = ? AND agent_id = ? AND NOT (layer = 'relational' AND kind = 'attitude') ORDER BY at DESC LIMIT ? OFFSET ?",
			)
			.all(input.userId, input.agentId, pageSize, offset) as Array<{
			id: string;
			layer: string;
			kind: string | null;
			text: string;
			at: string;
			created_at: string;
		}>;
		const attitudeRows = db
			.prepare(
				"SELECT id, text, at, payload_json FROM memory_entries WHERE user_id = ? AND agent_id = ? AND layer = 'relational' AND kind = 'attitude' ORDER BY at DESC LIMIT 5",
			)
			.all(input.userId, input.agentId) as Array<{
			id: string;
			text: string;
			at: string;
			payload_json: string | null;
		}>;

		return {
			items: rows.map(function (r) {
				return {
					id: r.id,
					layer: r.layer,
					kind: r.kind,
					text: truncate(r.text, SNIPPET_CHARS),
					at: r.at,
					createdAt: r.created_at,
				};
			}),
			attitudes: attitudeRows.flatMap(function (row) {
				const parsed = parseAttitudePayload(row.payload_json);
				if (!parsed) return [];
				return [
					{
						...parsed,
						id: parsed.id || row.id,
						at: parsed.at || row.at,
					},
				];
			}),
			total,
			page,
			pageSize,
		};
	} finally {
		db.close();
	}
}
