/**
	* 模块名称：本机引擎 IO 装配工厂
	* 模块说明：按 dataRoot 创建 Memory / Profile / Content / EngineLog Ports。
	* Server 边界：仅 app/api、Host 装配、*.server.ts、utils/server 可引用；
	* 禁止 Client（pageComponents / bis / stores / typeFiles / ajaxProxy 等）任何 import。
	* V2-IO-4～7：四 Port 本机实现均已就绪；Host 注入见
	* `src/utils/server/host/engineHost.server.ts`（V2-IO-9）。
	*/
import path from "node:path";
import type {
	ContentPort,
	EngineLogPort,
	MemoryPort,
	ProfilePort,
} from "@airpc/rpg-engine";
// 引用了 Sqlite Memory 工厂，用于本机 memory.sqlite 落盘
import { createSqliteMemoryPort } from "./memory/sqliteMemoryPort";
// 引用了 Fs Profile 工厂，用于本机 profile.save.json 读写
import { createFsProfilePort } from "./profile/fsProfilePort";
// 引用了 Fs Content 工厂，用于本机 Workspace / 包 / 角色读
import { createFsContentPort } from "./content/fsContentPort";
// 引用了 Fs EngineLog 工厂，用于本机 jsonl 旁路日志
import { createFsEngineLogPort } from "./log/fsEngineLogPort";

/** 本机 Studio 注入 Host 的四 Port 套件（技术设计 23）。 */
export type EngineIOPorts = {
	memory: MemoryPort;
	profile: ProfilePort;
	content: ContentPort;
	engineLog: EngineLogPort;
};

export { createSqliteMemoryPort } from "./memory/sqliteMemoryPort";
export { createFsProfilePort } from "./profile/fsProfilePort";
export { createFsContentPort } from "./content/fsContentPort";
export { createFsEngineLogPort } from "./log/fsEngineLogPort";

/**
	* 创建指向 `dataRoot` 的本机 Ports。
	* Memory：`<dataRoot>/memory/memory.sqlite`。
	* Profile：`<dataRoot>/users/<userId>/profile.save.json`。
	* Content：以 Host `loadWorkspace(rootDir)` 的 rootDir 为 workspaceKey。
	* EngineLog：`<dataRoot>/logs/engine-YYYYMMDD.jsonl`（UTC）。
	*
	* @param dataRoot 工作区根（本机即仓库 `data/` 或等价绝对路径）
	*/
export function createEngineIOPorts(dataRoot: string): EngineIOPorts {
	return {
		memory: createSqliteMemoryPort(
			path.join(dataRoot, "memory", "memory.sqlite"),
		),
		profile: createFsProfilePort(dataRoot),
		content: createFsContentPort(),
		engineLog: createFsEngineLogPort(dataRoot),
	};
}
