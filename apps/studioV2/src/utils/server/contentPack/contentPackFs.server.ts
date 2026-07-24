/**
	* 内容包（运行时包）构建 / 校验 / 覆盖导入。
	* 仅 Next API；禁止 client 直引。
	* 单包 .storypack 不走本模块；首故事唯一性只挂在此处。
	*/
import { readdir, rm } from "node:fs/promises";
import path from "node:path";
import {
	ensureWorkspaceStartupPackageId,
	readWorkspaceConfig,
	validateStartupPackageId,
	writeWorkspaceConfig,
	type WorkspaceConfig,
} from "@studio-v2/src/utils/server/workspace/workspaceFs.server";
import {
	listDiskStoryPackages,
} from "@studio-v2/src/utils/server/packages/list/packagesList.server";
import {
	readDiskStoryPackage,
	writeDiskStoryPackage,
} from "@studio-v2/src/utils/server/packages/fs/packagesFs.server";
import {
	isValidPackageId,
	packagesRoot,
} from "@studio-v2/src/utils/server/packages/paths/packagesPaths.server";
import type { DiskStoryPackageBundle } from "@studio-v2/src/utils/server/types/diskStoryPackage.server";

/** 与 FE contentPackFile 对齐；server 侧自持常量避免倒引 Client typeFiles */
export const CONTENTPACK_FORMAT_ID = "airpc.contentpack.v1" as const;

export type ContentPackWorkspace = {
	schemaVersion: number;
	title: string;
	engineMinVersion: string;
	startupPackageId: string;
};

export type ContentPackFile = {
	format: typeof CONTENTPACK_FORMAT_ID;
	exportedAt: string;
	workspace: ContentPackWorkspace;
	packages: DiskStoryPackageBundle[];
};

function packFail(code: string, message: string): never {
	throw Object.assign(new Error(message), { code });
}

/**
	* 导出前校验：首故事非空且指向现有包（工作区级单指针，不会出现「多个首故事」）。
	*/
export async function assertContentPackExportable(): Promise<WorkspaceConfig> {
	const workspace = await ensureWorkspaceStartupPackageId();
	const err = await validateStartupPackageId(workspace.startupPackageId);
	if (err) {
		packFail("VALIDATION_FAILED", `内容包导出被拒：${err}`);
	}
	const packages = await listDiskStoryPackages();
	if (packages.length === 0) {
		packFail("VALIDATION_FAILED", "内容包导出被拒：工作区尚无故事包");
	}
	return workspace;
}

/** 扫描磁盘构建内容包载荷 */
export async function buildContentPackFile(): Promise<ContentPackFile> {
	const workspace = await assertContentPackExportable();
	const summaries = await listDiskStoryPackages();
	const packages: DiskStoryPackageBundle[] = [];
	for (const summary of summaries) {
		packages.push(await readDiskStoryPackage(summary.packageId));
	}
	return {
		format: CONTENTPACK_FORMAT_ID,
		exportedAt: new Date().toISOString(),
		workspace: {
			schemaVersion: workspace.schemaVersion,
			title: workspace.title,
			engineMinVersion: workspace.engineMinVersion,
			startupPackageId: workspace.startupPackageId,
		},
		packages,
	};
}

function readWorkspaceFromRaw(ws: Record<string, unknown>): ContentPackWorkspace {
	const startupPackageId =
		typeof ws.startupPackageId === "string"
			? ws.startupPackageId.trim()
			: "";
	if (startupPackageId.length === 0) {
		packFail(
			"VALIDATION_FAILED",
			"内容包导入被拒：缺少首故事（startupPackageId 为空）",
		);
	}
	return {
		schemaVersion:
			typeof ws.schemaVersion === "number" ? ws.schemaVersion : 1,
		title: typeof ws.title === "string" ? ws.title : "",
		engineMinVersion:
			typeof ws.engineMinVersion === "string" ? ws.engineMinVersion : "",
		startupPackageId,
	};
}

function readPackageIdFromBundle(item: unknown): string {
	if (!item || typeof item !== "object") {
		packFail("VALIDATION_FAILED", "packages 项无效");
	}
	const bundle = item as DiskStoryPackageBundle;
	const packageId =
		bundle.conf && typeof bundle.conf === "object"
			? String(
					(bundle.conf as { packageId?: unknown }).packageId ?? "",
				).trim()
			: "";
	if (!isValidPackageId(packageId)) {
		packFail(
			"VALIDATION_FAILED",
			`内容包内 packageId 非法：${packageId || "(空)"}`,
		);
	}
	if (!Array.isArray(bundle.cards)) {
		packFail("VALIDATION_FAILED", `故事包缺 cards：${packageId}`);
	}
	return packageId;
}

function parsePackagesArray(rawPackages: unknown[]): DiskStoryPackageBundle[] {
	const packages: DiskStoryPackageBundle[] = [];
	const seen = new Set<string>();
	for (const item of rawPackages) {
		const packageId = readPackageIdFromBundle(item);
		if (seen.has(packageId)) {
			packFail("VALIDATION_FAILED", `内容包内重复故事包：${packageId}`);
		}
		seen.add(packageId);
		packages.push(item as DiskStoryPackageBundle);
	}
	return packages;
}

/**
	* 解析并校验导入体：format、非空 packages、startup 恰好指向包内某一 id。
	* 不落盘。
	*/
export function parseAndValidateContentPack(raw: unknown): ContentPackFile {
	if (!raw || typeof raw !== "object") {
		packFail("VALIDATION_FAILED", "内容包须为 JSON 对象");
	}
	const obj = raw as Record<string, unknown>;
	if (obj.format !== CONTENTPACK_FORMAT_ID) {
		packFail(
			"VALIDATION_FAILED",
			`未知内容包格式：${String(obj.format ?? "")}（需要 ${CONTENTPACK_FORMAT_ID}）`,
		);
	}
	if (!obj.workspace || typeof obj.workspace !== "object") {
		packFail("VALIDATION_FAILED", "内容包缺少 workspace");
	}
	const workspace = readWorkspaceFromRaw(
		obj.workspace as Record<string, unknown>,
	);
	if (!Array.isArray(obj.packages) || obj.packages.length === 0) {
		packFail("VALIDATION_FAILED", "内容包导入被拒：packages 为空");
	}
	const packages = parsePackagesArray(obj.packages);
	const ids = new Set(
		packages.map(function (p) {
			return p.conf.packageId;
		}),
	);
	if (!ids.has(workspace.startupPackageId)) {
		packFail(
			"VALIDATION_FAILED",
			`内容包导入被拒：首故事 ${workspace.startupPackageId} 不在 packages 内`,
		);
	}
	return {
		format: CONTENTPACK_FORMAT_ID,
		exportedAt:
			typeof obj.exportedAt === "string"
				? obj.exportedAt
				: new Date().toISOString(),
		workspace,
		packages,
	};
}

/**
	* 覆盖导入：删掉不在包内的故事包目录 → 写全量包 → 写 workspace。
	* 调用方负责 Host reload。
	*/
export async function importContentPackOverwrite(
	raw: unknown,
): Promise<{
	startupPackageId: string;
	packageIds: string[];
}> {
	const pack = parseAndValidateContentPack(raw);
	const keep = new Set(
		pack.packages.map(function (p) {
			return p.conf.packageId;
		}),
	);

	const root = packagesRoot();
	let entries: string[] = [];
	try {
		entries = await readdir(root);
	} catch {
		entries = [];
	}
	for (const name of entries) {
		if (keep.has(name)) continue;
		await rm(path.join(root, name), { recursive: true, force: true });
	}

	for (const bundle of pack.packages) {
		await writeDiskStoryPackage(bundle.conf.packageId, {
			conf: bundle.conf,
			cards: bundle.cards,
			layout: bundle.layout,
		});
	}

	const prev = await readWorkspaceConfig().catch(function (): WorkspaceConfig {
		return {
			schemaVersion: 1,
			title: "",
			engineMinVersion: "",
			startupPackageId: "",
		};
	});
	await writeWorkspaceConfig({
		schemaVersion: pack.workspace.schemaVersion || prev.schemaVersion || 1,
		title: pack.workspace.title,
		engineMinVersion: pack.workspace.engineMinVersion,
		startupPackageId: pack.workspace.startupPackageId,
	});

	const err = await validateStartupPackageId(pack.workspace.startupPackageId);
	if (err) {
		packFail("VALIDATION_FAILED", `导入后校验失败：${err}`);
	}

	return {
		startupPackageId: pack.workspace.startupPackageId,
		packageIds: [...keep],
	};
}
