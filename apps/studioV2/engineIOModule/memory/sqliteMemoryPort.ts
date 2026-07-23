/**
	* 模块名称：SqliteMemoryPort 工厂（本机 MemoryPort）
	* 模块说明：自 packages/rpg-engine 迁出；仅 Server / Host 装配可引用。
	* 协议：技术设计 23 §4.1；具体 SQL 落在 sqlite/ 子模块。
	*/
import {
	type EngineError,
	type MemoryPort,
} from "@airpc/rpg-engine";
import { createInsertEntry } from "./sqlite/write/insertEntry";
import {
	applyMemoryPatch,
	commitMemoryAfterCall,
	getMemoryById,
} from "./sqlite/write/mutations";
import { openSqliteMemoryDb } from "./sqlite/db/openDb";
import { projectForCall } from "./sqlite/query/projectForCall";
import { rollupIfNeeded } from "./sqlite/write/rollup";
import { searchMemory } from "./sqlite/query/search";

export {
	monthPeriodFromIso,
	previousMonthPeriod,
	previousQuarterPeriod,
	quarterPeriodFromIso,
} from "./sqlite/util/period";

/** 创建指向 dbPath 的 Sqlite MemoryPort（默认 `<dataRoot>/memory/memory.sqlite`）。 */
export function createSqliteMemoryPort(dbPath: string): MemoryPort {
	const { db, ftsReady } = openSqliteMemoryDb(dbPath);
	const insertEntry = createInsertEntry(db, ftsReady);

	return {
		async projectForCall(input) {
			return projectForCall(db, input);
		},
		async search(input) {
			return searchMemory(db, ftsReady, input);
		},
		async getById(input) {
			return getMemoryById(db, input);
		},
		async applyPatch(input) {
			return applyMemoryPatch(insertEntry, input);
		},
		async commitAfterCall(input) {
			return commitMemoryAfterCall(insertEntry, input);
		},
		async rollupIfNeeded(input) {
			return rollupIfNeeded(db, input);
		},
		close() {
			db.close();
		},
	};
}

/** 测试用：判定 search 失败是否为拒查 */
export function isMemorySearchReject(err: unknown): err is EngineError {
	return (
		typeof err === "object" &&
		err !== null &&
		(err as EngineError).ok === false &&
		(err as EngineError).code === "VALIDATION_FAILED"
	);
}
