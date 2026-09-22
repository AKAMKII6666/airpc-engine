/**
	* 导入预检：交换文件解析（抽出以降圈复杂度）。
	*/
import type {
	DiskChapterBundle,
	DiskPackageContainer,
} from "@studio-v2/typeFiles/story/package/diskStoryPackage";
import {
	STORYPACK_FORMAT_ID,
	type StorypackFileV1,
} from "@studio-v2/typeFiles/story/transfer/storypackFile";

/** isRecord：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object";
}

/** ParsedStorypack：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export type ParsedStorypack =
	| { kind: "container"; container: DiskPackageContainer }
	| { kind: "legacy"; bundle: DiskChapterBundle; packageId: string };

function parseContainerRaw(raw: Record<string, unknown>): ParsedStorypack {
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

function resolveLegacyChapterId(conf: DiskChapterBundle["conf"]): string {
	if (typeof conf.chapterId === "string" && conf.chapterId.trim() !== "") {
		return conf.chapterId.trim();
	}
	if (typeof conf.packageId === "string" && conf.packageId.trim() !== "") {
		return conf.packageId.trim();
	}
	return "";
}

function parseLegacyRaw(raw: Record<string, unknown>): ParsedStorypack {
	if (!isRecord(raw.bundle)) {
		throw new Error("交换文件缺少 container 或 bundle");
	}
	const bundle = raw.bundle as DiskChapterBundle;
	const chapterId = resolveLegacyChapterId(bundle.conf);
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

/** parseStorypackRaw：bis 对外契约，调用方只经此符号读写，避免 UI 直连 store。 */
export function parseStorypackRaw(raw: Record<string, unknown>): ParsedStorypack {
	if (isRecord(raw.container)) {
		return parseContainerRaw(raw);
	}
	return parseLegacyRaw(raw);
}

function resolveExportedAt(raw: Record<string, unknown>): string {
	return typeof raw.exportedAt === "string"
		? raw.exportedAt
		: new Date().toISOString();
}

function resolveKind(
	raw: Record<string, unknown>,
): StorypackFileV1["kind"] {
	if (raw.kind === "formal" || raw.kind === "debug" || raw.kind === "source") {
		return raw.kind;
	}
	return "source";
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
	const base = {
		format: STORYPACK_FORMAT_ID,
		exportedAt: resolveExportedAt(raw),
		kind: resolveKind(raw),
	} as const;
	if (parsed.kind === "container") {
		return { ...base, container: parsed.container };
	}
	return { ...base, bundle: parsed.bundle };
}
