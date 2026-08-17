/**
	* 模块名称：打开 Sqlite Memory 库并建表
	*/
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { SqlDb } from "./types";

export type OpenedMemoryDb = {
	db: SqlDb;
	ftsReady: boolean;
};

function tableColumns(db: SqlDb, table: string): Set<string> {
	const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
	return new Set(rows.map((row) => row.name));
}

/** 打开（或创建）memory.sqlite，建表并探测 FTS5。 */
export function openSqliteMemoryDb(dbPath: string): OpenedMemoryDb {
	mkdirSync(path.dirname(dbPath), { recursive: true });
	const db: SqlDb = new Database(dbPath);
	db.pragma("journal_mode = WAL");
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
	let ftsReady = false;
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
		ftsReady = true;
	} catch {
		ftsReady = false;
	}
	return { db, ftsReady };
}
