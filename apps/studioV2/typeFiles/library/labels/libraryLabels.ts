/**
	* 角色库 / 资源库 / 玩家 → 中文短标签与 Select 选项。
	* 集中映射避免组件散落内部枚举名；无 IO 副作用。
	*/
import type {
	CharacterKind,
	FreeCallReadiness,
} from "@studio-v2/typeFiles/library/characters/form/characterSummary";
import type {
	AssetAvailability,
	AssetKind,
} from "@studio-v2/typeFiles/library/assets/assetSummary";

/** Select 选项投影；与 FormSelectOption 形状对齐，不反向依赖 commonUi */
type LibraryLabelOption = {
	label: string;
	value: string;
};

/** 角色创作类型 → UI 短文案 */
export function characterKindLabel(k: CharacterKind): string {
	if (k === "story") return "剧情角色";
	if (k === "support") return "支援角色";
	return "调度角色";
}

/** 新建角色 kind Select 选项；禁止自由文本 */
export const CHARACTER_KIND_OPTIONS: readonly LibraryLabelOption[] = [
	{ label: "剧情角色", value: "story" },
	{ label: "支援角色", value: "support" },
	{ label: "调度角色", value: "schedule" },
];

/**
	* 角色详情性别 Select 选项（含其它）。
	* value 与 CharacterEditGender 对齐；禁止 TextField 手填。
	*/
export const CHARACTER_GENDER_OPTIONS: readonly LibraryLabelOption[] = [
	{ label: "女", value: "female" },
	{ label: "男", value: "male" },
	{ label: "其它", value: "other" },
];

/**
	* 玩家性别 Select 选项（仅男女，对齐 Profile gender enum）。
	* 禁止 TextField / StringListEditor 手填。
	*/
export const USER_GENDER_OPTIONS: readonly LibraryLabelOption[] = [
	{ label: "男", value: "male" },
	{ label: "女", value: "female" },
];

/** 自由通话卡就绪态 → UI 短文案 */
export function freeCallLabel(f: FreeCallReadiness): string {
	if (f === "ready") return "自由通话已就绪";
	if (f === "draft") return "自由通话草稿";
	return "缺少自由通话卡";
}

/** 资源类型 → UI 短文案 */
export function assetKindLabel(k: AssetKind): string {
	if (k === "wav") return "WAV 音频";
	if (k === "bgm") return "背景音乐";
	if (k === "image") return "图片";
	if (k === "text") return "文本资料";
	return "其它文件";
}

/** 资源本地可用性 → UI 短文案 */
export function assetAvailabilityLabel(a: AssetAvailability): string {
	if (a === "ready") return "文件就绪";
	if (a === "missing") return "文件缺失";
	return "未检测";
}

/**
	* 资源 measure 展示。
	* unit=duration_ms 时 value 为毫秒；unit=size_bytes 时为字节。
	*/
export function formatAssetMeasure(
	value: number | null,
	unit: "duration_ms" | "size_bytes" | "none",
): string {
	if (value == null || unit === "none") return "—";
	if (unit === "duration_ms") {
		const sec = value / 1000;
		if (sec < 60) return `${sec.toFixed(1)} 秒`;
		const m = Math.floor(sec / 60);
		const s = Math.round(sec % 60);
		return `${m}:${String(s).padStart(2, "0")}`;
	}
	if (value < 1024) return `${value} B`;
	if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
	return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
