/**
	* 模块名称：打开 Sqlite Memory 库并建表
	*/
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import {
	ensureMemoryTables,
	migrateMemoryColumns,
	tryEnableMemoryFts,
} from "./openDbSchema";
import type { SqlDb } from "./types";

export type OpenedMemoryDb = {
	db: SqlDb;
	ftsReady: boolean;
};

/** 打开（或创建）memory.sqlite，建表并探测 FTS5。 */
export function openSqliteMemoryDb(dbPath: string): OpenedMemoryDb {
	mkdirSync(path.dirname(dbPath), { recursive: true });
	const db: SqlDb = new Database(dbPath);
	db.pragma("journal_mode = WAL");
	ensureMemoryTables(db);
	migrateMemoryColumns(db);
	const ftsReady = tryEnableMemoryFts(db);
	return { db, ftsReady };
}
