/**
	* 工作区 workspace.json 读写：含首故事 startupPackageId。
	* 仅 Next API / server 调用；禁止 client 直引。
	*/
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getStudioV2DataRoot } from "../data/dataRoot.server";
import { listDiskStoryPackages } from "../packages/list/packagesList.server";

/** 磁盘工作区配置（内容包 / 冷启动指针真源） */
export type WorkspaceConfig = {
	/** 内容 schema；当前仅支持 1 */
	schemaVersion: number;
	/** 工作区展示标题；可空串 */
	title: string;
	/** 引擎最低版本提示串；可空串 */
	engineMinVersion: string;
	/**
		* 首故事 packageId；必填且须对应已存在故事包。
		* 冷启动 / 内容包导入导出真源；非各包 conf 内标记。
		*/
	startupPackageId: string;
};

function workspacePath(): string {
	return path.join(getStudioV2DataRoot(), "workspace.json");
}

function asString(v: unknown, fallback = ""): string {
	return typeof v === "string" ? v : fallback;
}

/**
	* 读盘并规范化；缺 startupPackageId 时不抛，由 validate 再裁决。
	*/
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
		startupPackageId: asString(raw.startupPackageId).trim(),
	};
}

/**
	* 校验首故事指针：非空且落在当前 storis-packages。
	* 返回人话错误；通过则 null。
	*/
export async function validateStartupPackageId(
	startupPackageId: string,
): Promise<string | null> {
	const id = startupPackageId.trim();
	if (id.length === 0) {
		return "必须设置首故事（startupPackageId 不可为空）";
	}
	const packages = await listDiskStoryPackages();
	if (packages.length === 0) {
		return "工作区尚无故事包，无法设置首故事";
	}
	if (!packages.some(function (p) {
		return p.packageId === id;
	})) {
		return `首故事指向的故事包不存在：${id}`;
	}
	return null;
}

/**
	* 写入 workspace.json；调用方应先 validateStartupPackageId。
	*/
export async function writeWorkspaceConfig(
	config: WorkspaceConfig,
): Promise<void> {
	const body: WorkspaceConfig = {
		schemaVersion: config.schemaVersion || 1,
		title: config.title,
		engineMinVersion: config.engineMinVersion,
		startupPackageId: config.startupPackageId.trim(),
	};
	await writeFile(
		workspacePath(),
		JSON.stringify(body, null, 2) + "\n",
		"utf8",
	);
}

/**
	* 仅更新首故事指针；保留其它字段。
	*/
export async function setWorkspaceStartupPackageId(
	packageId: string,
): Promise<WorkspaceConfig> {
	const err = await validateStartupPackageId(packageId);
	if (err) {
		throw Object.assign(new Error(err), { code: "VALIDATION_FAILED" });
	}
	const prev = await readWorkspaceConfig();
	const next: WorkspaceConfig = {
		...prev,
		startupPackageId: packageId.trim(),
	};
	await writeWorkspaceConfig(next);
	return next;
}

/**
	* 若当前指针无效且库非空：回落为第一个包并落盘（迁移 / 空库补齐用）。
	*/
export async function ensureWorkspaceStartupPackageId(): Promise<WorkspaceConfig> {
	const prev = await readWorkspaceConfig();
	const err = await validateStartupPackageId(prev.startupPackageId);
	if (!err) return prev;
	const packages = await listDiskStoryPackages();
	if (packages.length === 0) {
		return prev;
	}
	const next: WorkspaceConfig = {
		...prev,
		startupPackageId: packages[0]!.packageId,
	};
	await writeWorkspaceConfig(next);
	return next;
}
