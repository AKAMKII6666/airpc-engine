/**
	* 模块名称：Sqlite Memory 内部类型
	*/
import type Database from "better-sqlite3";

export type SqlDb = Database.Database;

export interface EntryRow {
	id: string;
	user_id: string;
	agent_id: string;
	layer: string;
	kind: string | null;
	text: string;
	at: string;
	created_at: string;
}

export interface RollupPeriod {
	kind: "month" | "quarter";
	key: string;
	rangeFrom: string;
	rangeTo: string;
}
