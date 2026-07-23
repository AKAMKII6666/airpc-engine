/**
	* AssetMeta（引擎/磁盘）↔ AssetSummary（Studio 投影）映射。
	* Studio kind 比引擎宽：多余种类写入 meta.studioKind，引擎 kind 取最近合法值。
	*/
import type { AssetMeta } from "@studio-v2/typeFiles/library/assets/engineAssetMeta";
import type {
	AssetAvailability,
	AssetKind,
	AssetSummary,
} from "@studio-v2/typeFiles/library/assets/assetSummary";

type EngineAssetKind = AssetMeta["kind"];

/** Studio 侧扩展字段落在 AssetMeta.meta，避免污染引擎 schema */
type StudioAssetMetaBag = {
	studioKind?: AssetKind;
	format?: string;
	measureValue?: number | null;
	measureUnit?: AssetSummary["measureUnit"];
	note?: string;
	/** 新建尚未上传二进制时为 true；有文件后清除 */
	pendingFile?: boolean;
};

/** 新建表单最小字段（与 CreateAssetFormValues 对齐，避免循环 import） */
export type AssetCreateFields = {
	/** 人类可读资源名；trim 后写入 AssetMeta.displayName */
	displayName: string;
	/** Studio 侧 kind；落盘时映射为引擎 kind，原值进 meta.studioKind */
	kind: AssetKind;
	/** 备注；空串表示无；持久化在 AssetMeta.meta.note */
	note: string;
};

/** 详情表单最小字段（与 AssetDetailFormValues 对齐；availability 不写盘） */
export type AssetDetailFields = {
	/** 人类可读资源名；trim 后覆盖 AssetMeta.displayName */
	displayName: string;
	/** Studio 侧 kind；映射规则同新建 */
	kind: AssetKind;
	/** 备注；空串表示无；写回 meta.note */
	note: string;
	/** 文件格式短标签；写回 meta.format，非引擎 schema 一等字段 */
	format: string;
	/**
		* 度量数字的文本投影；空串 → null。
		* 单位由 measureUnit 解释（毫秒或字节）。
		*/
	measureValueText: string;
	/** measureValue 单位；duration_ms 时同步写 AssetMeta.durationMs */
	measureUnit: AssetSummary["measureUnit"];
};

const STUDIO_KINDS: readonly AssetKind[] = [
	"wav",
	"bgm",
	"image",
	"text",
	"other",
];

function isStudioKind(value: unknown): value is AssetKind {
	return (
		typeof value === "string" &&
		(STUDIO_KINDS as readonly string[]).includes(value)
	);
}

function readBag(meta: AssetMeta): StudioAssetMetaBag {
	const bag = meta.meta ?? {};
	return {
		studioKind: isStudioKind(bag.studioKind) ? bag.studioKind : undefined,
		format: typeof bag.format === "string" ? bag.format : undefined,
		measureValue:
			typeof bag.measureValue === "number" || bag.measureValue === null
				? (bag.measureValue as number | null)
				: undefined,
		measureUnit:
			bag.measureUnit === "duration_ms" ||
			bag.measureUnit === "size_bytes" ||
			bag.measureUnit === "none"
				? bag.measureUnit
				: undefined,
		note: typeof bag.note === "string" ? bag.note : undefined,
		pendingFile: bag.pendingFile === true,
	};
}

/**
	* Studio kind → 引擎 AssetMeta.kind；无法一一对应时取最近可校验值。
	*/
export function studioKindToEngineKind(kind: AssetKind): EngineAssetKind {
	if (kind === "wav" || kind === "bgm") return "wav";
	if (kind === "image") return "image";
	// text / other：落 prompt_clip，便于后续接 clip 引用；真区分靠 studioKind
	return "prompt_clip";
}

function engineKindToStudioKind(
	engineKind: EngineAssetKind,
	bag: StudioAssetMetaBag,
): AssetKind {
	if (bag.studioKind) return bag.studioKind;
	if (engineKind === "image") return "image";
	if (engineKind === "prompt_clip") return "text";
	if (engineKind === "tts") return "wav";
	return "wav";
}

function defaultFormatForStudioKind(kind: AssetKind): string {
	if (kind === "wav") return "wav";
	if (kind === "bgm") return "mp3";
	if (kind === "image") return "webp";
	if (kind === "text") return "md";
	return "";
}

function defaultMeasureUnit(kind: AssetKind): AssetSummary["measureUnit"] {
	if (kind === "wav" || kind === "bgm") return "duration_ms";
	if (kind === "image" || kind === "text") return "size_bytes";
	return "none";
}

function formatFromUri(uri: string): string {
	const base = uri.split("/").pop() ?? "";
	const dot = base.lastIndexOf(".");
	if (dot < 0 || dot === base.length - 1) return "";
	return base.slice(dot + 1).toLowerCase();
}

/**
	* 可用性：有文件 → ready；新建占位 → unchecked；否则 missing。
	*/
export function resolveAssetAvailability(
	fileExists: boolean,
	pendingFile: boolean,
): AssetAvailability {
	if (fileExists) return "ready";
	if (pendingFile) return "unchecked";
	return "missing";
}

/**
	* 磁盘 AssetMeta + 文件探测 → 资源库列表/详情投影。
	*/
export function assetMetaToSummary(
	meta: AssetMeta,
	opts: { fileExists: boolean; lastEditedAt: string },
): AssetSummary {
	const bag = readBag(meta);
	const kind = engineKindToStudioKind(meta.kind, bag);
	const measureUnit =
		bag.measureUnit ??
		(meta.durationMs != null ? "duration_ms" : defaultMeasureUnit(kind));
	const measureValue =
		bag.measureValue !== undefined
			? bag.measureValue
			: meta.durationMs != null
				? meta.durationMs
				: null;
	const format =
		bag.format ??
		(formatFromUri(meta.uri) || defaultFormatForStudioKind(kind));
	return {
		assetId: meta.assetId,
		displayName: meta.displayName?.trim() || meta.assetId,
		kind,
		format,
		measureValue,
		measureUnit,
		refCount: 0,
		lastEditedAt: opts.lastEditedAt,
		availability: resolveAssetAvailability(
			opts.fileExists,
			bag.pendingFile === true,
		),
		note: bag.note ?? "",
		referenceLines: [],
	};
}

/**
	* 新建表单 → 可落盘 AssetMeta；uri 占位，pendingFile=true。
	* 真二进制请走 /api/assets/upload（头像直传）。
	*/
export function buildAssetMetaFromCreateForm(
	assetId: string,
	values: AssetCreateFields,
): AssetMeta {
	const displayName = values.displayName.trim();
	const studioKind = values.kind;
	const engineKind = studioKindToEngineKind(studioKind);
	const ext = defaultFormatForStudioKind(studioKind) || "bin";
	const uri = `files/${assetId}.${ext}`;
	const bag: StudioAssetMetaBag = {
		studioKind,
		format: defaultFormatForStudioKind(studioKind),
		measureValue: null,
		measureUnit: defaultMeasureUnit(studioKind),
		note: values.note.trim(),
		pendingFile: true,
	};
	return {
		assetId,
		kind: engineKind,
		uri,
		displayName,
		meta: bag as Record<string, unknown>,
	};
}

/**
	* 详情表单合并进既有 AssetMeta；保留 uri；availability 不写盘（读时由文件探测）。
	*/
export function mergeDetailFormIntoAssetMeta(
	previous: AssetMeta,
	values: AssetDetailFields,
): AssetMeta {
	const bag = readBag(previous);
	const studioKind = values.kind;
	const engineKind = studioKindToEngineKind(studioKind);
	const measureRaw = values.measureValueText.trim();
	const measureValue = measureRaw.length === 0 ? null : Number(measureRaw);
	const nextBag: StudioAssetMetaBag = {
		studioKind,
		format: values.format.trim(),
		measureValue,
		measureUnit: values.measureUnit,
		note: values.note.trim(),
		pendingFile: bag.pendingFile,
	};
	const next: AssetMeta = {
		...previous,
		kind: engineKind,
		displayName: values.displayName.trim(),
		meta: nextBag as Record<string, unknown>,
	};
	if (values.measureUnit === "duration_ms" && measureValue != null) {
		next.durationMs = measureValue;
	} else if (
		previous.durationMs != null &&
		values.measureUnit !== "duration_ms"
	) {
		const { durationMs: _drop, ...rest } = next;
		return rest;
	}
	return next;
}
