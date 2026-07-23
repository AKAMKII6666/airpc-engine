/**
	* 与引擎同构镜像，不以 import 同步。
	* 对齐 packages/rpg-engine/src/schema/asset.ts 的 AssetKindSchema / AssetMetaSchema。
	*/

/** 对齐引擎 AssetKindSchema 枚举 */
export type EngineAssetKind = "wav" | "tts" | "prompt_clip" | "image";

/** 对齐引擎 AssetMetaSchema；全局资产库条目形状 */
export type AssetMeta = {
	/** 资产稳定键；全局唯一 */
	assetId: string;
	/** 资产种类；驱动播放器/表单分支 */
	kind: EngineAssetKind;
	/** 相对 data/assets/ 的路径（如 files/clip_hello.wav） */
	uri: string;
	/** 人类展示名；缺省表示未填 */
	displayName?: string;
	/** 时长；单位 ms；缺省表示未知（如未解析出的 tts） */
	durationMs?: number;
	/** 台本文本；tts/prompt_clip 常用；缺省表示未填 */
	transcript?: string;
	/** 语言/地区标记；缺省表示未指定 */
	locale?: string;
	/** 内容哈希；用于去重/校验；缺省表示未计算 */
	hash?: string;
	/** 扩展元数据；引擎 v1 不强校验内部结构 */
	meta?: Record<string, unknown>;
};

const ENGINE_ASSET_KINDS: ReadonlySet<string> = new Set([
	"wav",
	"tts",
	"prompt_clip",
	"image",
]);

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.length > 0;
}

/**
	* Client 本地预检；与引擎 AssetMetaSchema 同构意图，不 import zod 引擎。
	* 仅做形状级判别（assetId/uri 非空字符串，kind 落在枚举内），不替代服务端校验。
	*/
export function isAssetMetaShape(value: unknown): value is AssetMeta {
	if (typeof value !== "object" || value === null) return false;
	const record = value as Record<string, unknown>;
	if (!isNonEmptyString(record.assetId)) return false;
	if (!isNonEmptyString(record.uri)) return false;
	return typeof record.kind === "string" && ENGINE_ASSET_KINDS.has(record.kind);
}
