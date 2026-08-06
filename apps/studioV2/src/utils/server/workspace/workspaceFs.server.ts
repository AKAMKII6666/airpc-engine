/**
	* 工作区 workspace.json 读写：仅工作区元信息。
	* 故事入口由包内 package.conf.json 的 entryChapterId 决定。
	*/
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getStudioV2DataRoot } from "../data/dataRoot.server";

export type WorkspaceConfig = {
	/** 内容 schema；当前仅支持 1 */
	schemaVersion: number;
	/** 工作区展示标题；可空串 */
	title: string;
	/** 引擎最低版本提示串；可空串 */
	engineMinVersion: string;
};

function workspacePath(): string {
	return path.join(getStudioV2DataRoot(), "workspace.json");
}

function asString(v: unknown, fallback = ""): string {
	return typeof v === "string" ? v : fallback;
}

/** 读盘并规范化；忽略历史入口包字段。 */
export async function readWorkspaceConfig(): Promise<WorkspaceConfig> {
	const raw = JSON.parse(await readFile(workspacePath(), "utf8")) as Record<
		string,
		unknown
	>;
	const schemaVersion =
		typeof raw.schemaVersion === "number" ? raw.schemaVersion : 1;
	return {
		schemaVersion,
		title: asString(raw.title),
		engineMinVersion: asString(raw.engineMinVersion),
	};
}

/** 写入 workspace.json；不写工作区级入口指针。 */
export async function writeWorkspaceConfig(
	config: WorkspaceConfig,
): Promise<void> {
	const body: WorkspaceConfig = {
		schemaVersion: config.schemaVersion || 1,
		title: config.title,
		engineMinVersion: config.engineMinVersion,
	};
	await writeFile(
		workspacePath(),
		JSON.stringify(body, null, 2) + "\n",
		"utf8",
	);
}
