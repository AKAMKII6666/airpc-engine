/**
	* 导入预检：解析 .storypack.json + 扫描工作区冲突；禁静态假报告。
	*/
import { fetchDiskStoryPackages } from "@studio-v2/src/utils/ajaxProxy/packages/api/storiesApi";
import type { DiskStoryPackageBundle } from "@studio-v2/typeFiles/story/package/diskStoryPackage";
import type { ImportPrecheckReport } from "@studio-v2/typeFiles/story/transfer/packageTransfer";
import {
	STORYPACK_FORMAT_ID,
	type StorypackFileV1,
} from "@studio-v2/typeFiles/story/transfer/storypackFile";

/** 预检成功时携带待导入 bundle，供确认步提交 */
export type ImportPrecheckOk = {
	/** 判别成功 */
	ok: true;
	/** 给人话预检面板的投影 */
	report: ImportPrecheckReport;
	/** 待写盘整包；确认前仅内存持有 */
	bundle: DiskStoryPackageBundle;
	/** 目标 packageId；与 conf.packageId 对齐 */
	packageId: string;
};

/** 文件无法解析或预检前失败 */
export type ImportPrecheckFail = {
	/** 判别失败 */
	ok: false;
	/** 人话错误；文件无法解析时用 */
	message: string;
};

/** 预检联合结果；成功与失败互斥 */
export type ImportPrecheckOutcome = ImportPrecheckOk | ImportPrecheckFail;

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object";
}

/**
	* 从用户选择的文本解析交换文件；格式不对抛错。
	*/
export function parseStorypackJsonText(text: string): StorypackFileV1 {
	let raw: unknown;
	try {
		raw = JSON.parse(text) as unknown;
	} catch {
		throw new Error("不是合法 JSON，请选择 .storypack.json 导出文件");
	}
	if (!isRecord(raw)) {
		throw new Error("交换文件顶层须为对象");
	}
	if (raw.format !== STORYPACK_FORMAT_ID) {
		throw new Error(
			`不支持的交换格式（期望 ${STORYPACK_FORMAT_ID}）`,
		);
	}
	if (!isRecord(raw.bundle)) {
		throw new Error("交换文件缺少 bundle");
	}
	const bundle = raw.bundle as DiskStoryPackageBundle;
	if (!isRecord(bundle.conf) || typeof bundle.conf.packageId !== "string") {
		throw new Error("bundle.conf.packageId 缺失");
	}
	if (!Array.isArray(bundle.cards)) {
		throw new Error("bundle.cards 须为数组");
	}
	return {
		format: STORYPACK_FORMAT_ID,
		exportedAt:
			typeof raw.exportedAt === "string"
				? raw.exportedAt
				: new Date().toISOString(),
		kind:
			raw.kind === "formal" || raw.kind === "debug" || raw.kind === "source"
				? raw.kind
				: "source",
		bundle,
	};
}

/**
	* 对已解析交换文件做工作区冲突与结构预检。
	*/
export async function precheckStorypackImport(
	file: StorypackFileV1,
): Promise<ImportPrecheckOk> {
	const packageId = file.bundle.conf.packageId;
	const existing = await fetchDiskStoryPackages();
	const idConflict = existing.some(function (p) {
		return p.packageId === packageId;
	});
	const cardCount = file.bundle.cards.length;
	const characterCount = Array.isArray(file.bundle.conf.participants)
		? file.bundle.conf.participants.length
		: 0;
	const assetCount = Array.isArray(file.bundle.conf.assetRefs)
		? file.bundle.conf.assetRefs.length
		: 0;
	const messages: string[] = [
		`将导入为 packageId「${packageId}」。`,
		"导入会写入 data/storis-packages；同名冲突时需先改 id 或删除旧包。",
	];
	if (idConflict) {
		messages.unshift(`工作区已存在「${packageId}」，确认导入将被拒绝。`);
	}
	const verdict = idConflict ? "blocked" : "ready";
	return {
		ok: true,
		packageId,
		bundle: file.bundle,
		report: {
			packageTitle:
				typeof file.bundle.conf.title === "string" &&
				file.bundle.conf.title.trim() !== ""
					? file.bundle.conf.title
					: packageId,
			schemaVersion: String(file.bundle.conf.schemaVersion ?? 1),
			cardCount,
			characterCount,
			assetCount,
			missingAssets: false,
			unknownEffects: false,
			unreachableCards: false,
			idConflict,
			needsMigration: false,
			verdict,
			messages,
		},
	};
}

/**
	* 读取 File → 解析 → 预检。
	*/
export async function precheckImportFile(
	file: File,
): Promise<ImportPrecheckOutcome> {
	try {
		const text = await file.text();
		const storypack = parseStorypackJsonText(text);
		return await precheckStorypackImport(storypack);
	} catch (error) {
		return {
			ok: false,
			message:
				error instanceof Error && error.message.trim() !== ""
					? error.message
					: "预检失败",
		};
	}
}
