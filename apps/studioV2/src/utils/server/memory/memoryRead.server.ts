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

export type MemoryListPage = {
	items: MemoryListRow[];
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
		return { items: [], total: 0, page, pageSize };
	}

	const db = new Database(dbPath, { readonly: true, fileMustExist: true });
	try {
		const table = db
			.prepare(
				"SELECT name FROM sqlite_master WHERE type='table' AND name='memory_entries'",
			)
			.get() as { name?: string } | undefined;
		if (!table?.name) {
			return { items: [], total: 0, page, pageSize };
		}

		const totalRow = db
			.prepare(
				"SELECT COUNT(*) AS c FROM memory_entries WHERE user_id = ? AND agent_id = ?",
			)
			.get(input.userId, input.agentId) as { c: number };
		const total = Number(totalRow?.c ?? 0);
		const offset = (page - 1) * pageSize;
		const rows = db
			.prepare(
				"SELECT id, layer, kind, text, at, created_at FROM memory_entries WHERE user_id = ? AND agent_id = ? ORDER BY at DESC LIMIT ? OFFSET ?",
			)
			.all(input.userId, input.agentId, pageSize, offset) as Array<{
			id: string;
			layer: string;
			kind: string | null;
			text: string;
			at: string;
			created_at: string;
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
			total,
			page,
			pageSize,
		};
	} finally {
		db.close();
	}
}
