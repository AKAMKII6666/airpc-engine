/**
	* 模块名称：MemoryPort.search（FTS / LIKE）
	*/
import {
	MEMORY_SEARCH_DEFAULTS,
	engineError,
	type MemorySearchHit,
	type MemorySearchQuery,
} from "@airpc/rpg-engine";
import { clampMaxResults, escapeFtsQuery, truncate } from "../util/helpers";
import type { EntryRow, SqlDb } from "../db/types";

function kindsClause(kinds: string[] | undefined): string {
	if (!kinds || kinds.length === 0) return "";
	return `AND kind IN (${kinds.map(function () {
		return "?";
	}).join(",")})`;
}

function runLike(
	db: SqlDb,
	input: MemorySearchQuery,
	textQ: string,
	internalLimit: number,
): EntryRow[] {
	const kinds = input.kinds;
	const sql = [
		"SELECT id, user_id, agent_id, layer, kind, text, at, created_at",
		"FROM memory_entries",
		"WHERE user_id = ? AND agent_id = ?",
		"AND text LIKE ?",
		input.fromIso ? "AND at >= ?" : "",
		input.toIso ? "AND at <= ?" : "",
		kindsClause(kinds),
		"ORDER BY at DESC",
		"LIMIT ?",
	]
		.filter(Boolean)
		.join(" ");
	const params: unknown[] = [input.userId, input.agentId, `%${textQ}%`];
	if (input.fromIso) params.push(input.fromIso);
	if (input.toIso) params.push(input.toIso);
	if (kinds && kinds.length > 0) params.push(...kinds);
	params.push(internalLimit);
	return db.prepare(sql).all(...params) as EntryRow[];
}

function runFts(
	db: SqlDb,
	input: MemorySearchQuery,
	ftsQ: string,
	internalLimit: number,
): EntryRow[] {
	const kinds = input.kinds;
	const kindSql =
		kinds && kinds.length > 0
			? `AND e.kind IN (${kinds.map(function () {
				return "?";
			}).join(",")})`
			: "";
	const sql = [
		"SELECT e.id, e.user_id, e.agent_id, e.layer, e.kind, e.text, e.at, e.created_at",
		"FROM memory_entries_fts f",
		"JOIN memory_entries e ON e.id = f.entry_id",
		"WHERE memory_entries_fts MATCH ?",
		"AND f.user_id = ? AND f.agent_id = ?",
		input.fromIso ? "AND e.at >= ?" : "",
		input.toIso ? "AND e.at <= ?" : "",
		kindSql,
		"ORDER BY e.at DESC",
		"LIMIT ?",
	]
		.filter(Boolean)
		.join(" ");
	const params: unknown[] = [ftsQ, input.userId, input.agentId];
	if (input.fromIso) params.push(input.fromIso);
	if (input.toIso) params.push(input.toIso);
	if (kinds && kinds.length > 0) params.push(...kinds);
	params.push(internalLimit);
	return db.prepare(sql).all(...params) as EntryRow[];
}

function runWindowOnly(
	db: SqlDb,
	input: MemorySearchQuery,
	internalLimit: number,
): EntryRow[] {
	const kinds = input.kinds;
	const sql = [
		"SELECT id, user_id, agent_id, layer, kind, text, at, created_at",
		"FROM memory_entries",
		"WHERE user_id = ? AND agent_id = ?",
		input.fromIso ? "AND at >= ?" : "",
		input.toIso ? "AND at <= ?" : "",
		kindsClause(kinds),
		"ORDER BY at DESC",
		"LIMIT ?",
	]
		.filter(Boolean)
		.join(" ");
	const params: unknown[] = [input.userId, input.agentId];
	if (input.fromIso) params.push(input.fromIso);
	if (input.toIso) params.push(input.toIso);
	if (kinds && kinds.length > 0) params.push(...kinds);
	params.push(internalLimit);
	return db.prepare(sql).all(...params) as EntryRow[];
}

/** 冷召回：须 textQuery 或时间窗；FTS 零命中降级 LIKE。 */
export async function searchMemory(
	db: SqlDb,
	ftsReady: boolean,
	input: MemorySearchQuery,
): Promise<MemorySearchHit[]> {
	const textQ = input.textQuery?.trim() ?? "";
	const hasText = textQ.length > 0;
	const hasWindow = Boolean(input.fromIso || input.toIso);
	if (!hasText && !hasWindow) {
		throw engineError(
			"VALIDATION_FAILED",
			"search requires textQuery or time window",
			{ rule: "MEMORY_SEARCH_REJECT" },
		);
	}
	const maxResults = clampMaxResults(input.maxResults);
	const internalLimit = Math.min(Math.max(maxResults * 5, maxResults), 50);
	let rows: EntryRow[] = [];

	if (hasText && ftsReady) {
		const ftsQ = escapeFtsQuery(textQ);
		if (!ftsQ && !hasWindow) {
			throw engineError(
				"VALIDATION_FAILED",
				"textQuery too short/invalid for FTS",
				{ rule: "MEMORY_SEARCH_REJECT" },
			);
		}
		if (ftsQ) {
			rows = runFts(db, input, ftsQ, internalLimit);
			if (rows.length === 0) {
				rows = runLike(db, input, textQ, internalLimit);
			}
		}
	} else if (hasText) {
		rows = runLike(db, input, textQ, internalLimit);
	} else {
		rows = runWindowOnly(db, input, internalLimit);
	}

	return rows.slice(0, maxResults).map(function (r) {
		return {
			id: r.id,
			layer: r.layer,
			kind: r.kind ?? undefined,
			text: truncate(r.text, MEMORY_SEARCH_DEFAULTS.searchSnippetChars),
			at: r.at,
			createdAt: r.created_at,
		};
	});
}
