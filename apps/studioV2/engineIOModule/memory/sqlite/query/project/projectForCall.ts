/**
	* 模块名称：MemoryPort.projectForCall（Sqlite）
	*/
import type { MemoryProjection } from "@airpc/rpg-engine";
import type { SqlDb } from "../../db/types";
import { assembleProjectForCall } from "./projectForCallAssemble";
import { fetchProjectForCallRows } from "./projectForCallFetch";

/** 热投影：稳定 semantic 优先，再补最近摘要、共同经历、情绪、承诺、身份 note 与 rollup。 */
export async function projectForCall(
	db: SqlDb,
	input: { userId: string; agentId: string },
): Promise<MemoryProjection> {
	const rows = fetchProjectForCallRows(db, input);
	return assembleProjectForCall(rows);
}
