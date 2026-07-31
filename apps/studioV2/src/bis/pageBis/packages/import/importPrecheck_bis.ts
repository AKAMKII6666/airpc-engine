/**
	* 导入预检：解析 .storypack.json（v2 多章 / legacy 单章）+ 冲突检测。
	*/
import { fetchDiskStoryPackages } from "@studio-v2/src/utils/ajaxProxy/packages/api/storiesApi";
import type {
	DiskChapterBundle,
	DiskPackageContainer,
} from "@studio-v2/typeFiles/story/package/diskStoryPackage";
import type { ImportPrecheckReport } from "@studio-v2/typeFiles/story/transfer/packageTransfer";
import {
	STORYPACK_FORMAT_ID,
	type StorypackFileV1,
} from "@studio-v2/typeFiles/story/transfer/storypackFile";

/** 预检成功时携带待导入载荷，供确认步提交 */
export type ImportPrecheckOk = {
	/** 判别成功 */
	ok: true;
	/** 给人话预检面板的投影 */
	report: ImportPrecheckReport;
	/** legacy 单章导入体；与 container 互斥 */
	bundle?: DiskChapterBundle;
	/** v2 多章导入体；与 bundle 互斥 */
	container?: DiskPackageContainer;
	/** 目标 packageId；与 packageConf.packageId 对齐 */
	packageId: string;
	/** 入口章 id；导入后默认打开章 */
	entryChapterId: string;
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

type ParsedStorypack =
	| { kind: "container"; container: DiskPackageContainer }
	| { kind: "legacy"; bundle: DiskChapterBundle; packageId: string };

type PrecheckStats = {
	packageId: string;
	entryChapterId: string;
	packageTitle: string;
	cardCount: number;
	characterCount: number;
	assetCount: number;
};

function collectContainerPrecheckStats(
	container: DiskPackageContainer,
): PrecheckStats {
	const packageId = container.packageConf.packageId;
	const entryChapterId = container.packageConf.entryChapterId;
	let cardCount = 0;
	let assetCount = 0;
	for (const ch of container.chapters) {
		cardCount += ch.cards.length;
		assetCount += ch.conf.assetRefs?.length ?? 0;
	}
	const entry = container.chapters.find(function (ch) {
		return ch.conf.chapterId === entryChapterId;
	});
	return {
		packageId,
		entryChapterId,
		packageTitle: container.packageConf.title ?? packageId,
		cardCount,
		characterCount: entry?.conf.participants?.length ?? 0,
		assetCount,
	};
}

function collectLegacyPrecheckStats(bundle: DiskChapterBundle): PrecheckStats {
	const chapterId = bundle.conf.chapterId;
	return {
		packageId: chapterId,
		entryChapterId: chapterId,
		packageTitle: bundle.conf.title ?? chapterId,
		cardCount: bundle.cards.length,
		characterCount: bundle.conf.participants?.length ?? 0,
		assetCount: bundle.conf.assetRefs?.length ?? 0,
	};
}

function resolvePrecheckStats(file: StorypackFileV1): PrecheckStats {
	if ("container" in file && file.container) {
		return collectContainerPrecheckStats(file.container);
	}
	if ("bundle" in file && file.bundle) {
		return collectLegacyPrecheckStats(file.bundle);
	}
	throw new Error("交换文件缺少有效载荷");
}

function parseStorypackRaw(raw: Record<string, unknown>): ParsedStorypack {
	if (isRecord(raw.container)) {
		const container = raw.container as DiskPackageContainer;
		const packageId = container.packageConf?.packageId;
		if (typeof packageId !== "string" || packageId.trim() === "") {
			throw new Error("container.packageConf.packageId 缺失");
		}
		if (!Array.isArray(container.chapters) || container.chapters.length === 0) {
			throw new Error("container.chapters 须为非空数组");
		}
		return { kind: "container", container };
	}

	if (!isRecord(raw.bundle)) {
		throw new Error("交换文件缺少 container 或 bundle");
	}
	const bundle = raw.bundle as DiskChapterBundle;
	const conf = bundle.conf;
	const chapterId =
		typeof conf.chapterId === "string" && conf.chapterId.trim() !== ""
			? conf.chapterId.trim()
			: typeof conf.packageId === "string" && conf.packageId.trim() !== ""
				? conf.packageId.trim()
				: "";
	if (chapterId === "") {
		throw new Error("bundle.conf.chapterId 缺失");
	}
	if (!Array.isArray(bundle.cards)) {
		throw new Error("bundle.cards 须为数组");
	}
	const packageId =
		typeof raw.packageId === "string" && raw.packageId.trim() !== ""
			? raw.packageId.trim()
			: chapterId;
	return { kind: "legacy", bundle, packageId };
}

/**
	* 从用户选择的文本解析交换文件；支持 v2 container 或 legacy bundle。
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
	const parsed = parseStorypackRaw(raw);
	if (parsed.kind === "container") {
		return {
			format: STORYPACK_FORMAT_ID,
			exportedAt:
				typeof raw.exportedAt === "string"
					? raw.exportedAt
					: new Date().toISOString(),
			kind:
				raw.kind === "formal" ||
				raw.kind === "debug" ||
				raw.kind === "source"
					? raw.kind
					: "source",
			container: parsed.container,
		};
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
		bundle: parsed.bundle,
	};
}

/**
	* 对已解析交换文件做工作区冲突与结构预检。
	*/
export async function precheckStorypackImport(
	file: StorypackFileV1,
): Promise<ImportPrecheckOk> {
	const stats = resolvePrecheckStats(file);
	const {
		packageId,
		entryChapterId,
		packageTitle,
		cardCount,
		characterCount,
		assetCount,
	} = stats;

	const existing = await fetchDiskStoryPackages();
	const idConflict = existing.some(function (p) {
		return p.packageId === packageId;
	});
	const messages: string[] = [
		`将导入为 packageId「${packageId}」。`,
		"导入会写入 data/storis-packages；同名冲突时需先改 id 或删除旧包。",
	];
	if (idConflict) {
		messages.unshift(`工作区已存在「${packageId}」，确认导入将被拒绝。`);
	}
	const verdict = idConflict ? "blocked" : "ready";
	const base: ImportPrecheckOk = {
		ok: true,
		packageId,
		entryChapterId,
		report: {
			packageTitle,
			schemaVersion: "1",
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
	if ("container" in file && file.container) {
		return { ...base, container: file.container };
	}
	if ("bundle" in file && file.bundle) {
		return { ...base, bundle: file.bundle };
	}
	return base;
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
