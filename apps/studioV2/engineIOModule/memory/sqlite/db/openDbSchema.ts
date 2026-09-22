/**
	* 模块名称：Sqlite Memory 建表 / 迁移 / FTS 探测
	* 模块说明：从 openDb 拆出，压低 openSqliteMemoryDb 有效行。
	*/
import type { SqlDb } from "./types";

function tableColumns(db: SqlDb, table: string): Set<string> {
	const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
	return new Set(rows.map((row) => row.name));
}

/** 创建 memory_entries / memory_rollups 及索引。 */
export function ensureMemoryTables(db: SqlDb): void {
	db.exec(`
		CREATE TABLE IF NOT EXISTS memory_entries (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			agent_id TEXT NOT NULL,
			layer TEXT NOT NULL,
			kind TEXT,
			text TEXT NOT NULL,
			at TEXT NOT NULL,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			call_id TEXT,
			importance REAL,
			fact_id TEXT,
			expires_at TEXT,
			status TEXT,
			content_hash TEXT,
			payload_json TEXT
		);
		CREATE INDEX IF NOT EXISTS idx_mem_user_agent_at
			ON memory_entries(user_id, agent_id, at DESC);
		CREATE INDEX IF NOT EXISTS idx_mem_user_agent_layer_at
			ON memory_entries(user_id, agent_id, layer, at DESC);
		CREATE TABLE IF NOT EXISTS memory_rollups (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			agent_id TEXT NOT NULL,
			period_kind TEXT NOT NULL,
			period_key TEXT NOT NULL,
			range_from TEXT NOT NULL,
			range_to TEXT NOT NULL,
			summary TEXT NOT NULL,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			UNIQUE(user_id, agent_id, period_kind, period_key)
		);
		CREATE INDEX IF NOT EXISTS idx_rollup_user_agent
			ON memory_rollups(user_id, agent_id, range_to DESC);
	`);
}

/** 旧库补列 + commit 幂等唯一索引。 */
export function migrateMemoryColumns(db: SqlDb): void {
	const entryColumns = tableColumns(db, "memory_entries");
	if (!entryColumns.has("content_hash")) {
		db.exec("ALTER TABLE memory_entries ADD COLUMN content_hash TEXT");
	}
	if (!entryColumns.has("payload_json")) {
		db.exec("ALTER TABLE memory_entries ADD COLUMN payload_json TEXT");
	}
	db.exec(`
		CREATE UNIQUE INDEX IF NOT EXISTS idx_mem_commit_idempotency
			ON memory_entries(user_id, agent_id, call_id, layer, kind, content_hash)
			WHERE call_id IS NOT NULL AND content_hash IS NOT NULL;
	`);
}

/** 探测 FTS5；不可用则返回 false（查询侧降级 LIKE）。 */
export function tryEnableMemoryFts(db: SqlDb): boolean {
	try {
		db.exec(`
			CREATE VIRTUAL TABLE IF NOT EXISTS memory_entries_fts USING fts5(
				entry_id UNINDEXED,
				user_id UNINDEXED,
				agent_id UNINDEXED,
				text,
				kind UNINDEXED,
				at UNINDEXED,
				tokenize = 'unicode61'
			);
		`);
		return true;
	} catch {
		return false;
	}
}
