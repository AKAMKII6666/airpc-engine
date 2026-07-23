/**
	* 与引擎同构镜像，不以 import 同步。
	* 对齐引擎 FactMetaSchema / StoryPackageMetaSchema 的形状预检（无 zod）。
	* 仅供 Client 本地 JSON 块校验用 helperText；不替代服务端/引擎侧真校验。
	*/
import type {
	FactMeta,
	StoryPackageMeta,
} from "@studio-v2/typeFiles/story/callCard/engineCallCard";

/** FactMeta 形状预检：factId 须为非空字符串；其余键 passthrough 不校验 */
export function isFactMeta(value: unknown): value is FactMeta {
	if (typeof value !== "object" || value === null) return false;
	const factId = (value as Record<string, unknown>).factId;
	return typeof factId === "string" && factId.length > 0;
}

/** 数组内每项须为 FactMeta；空数组视为通过 */
export function isFactMetaArray(value: unknown): value is FactMeta[] {
	if (!Array.isArray(value)) return false;
	return value.every(isFactMeta);
}

/**
	* StoryPackageMeta 形状预检：须为非数组对象；imports/exports 若存在须为对象，
	* 且其 facts 若存在须为字符串数组；conflictsWith 若存在须为字符串数组。
	*/
export function isStoryPackageMeta(value: unknown): value is StoryPackageMeta {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return false;
	}
	const record = value as Record<string, unknown>;
	if (!isOptionalStringArray(record.conflictsWith)) return false;
	if (!isOptionalFactsBlock(record.imports)) return false;
	if (!isOptionalFactsBlock(record.exports)) return false;
	return true;
}

function isOptionalStringArray(value: unknown): boolean {
	if (value === undefined) return true;
	if (!Array.isArray(value)) return false;
	return value.every((item) => typeof item === "string");
}

function isOptionalFactsBlock(value: unknown): boolean {
	if (value === undefined) return true;
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return false;
	}
	return isOptionalStringArray((value as Record<string, unknown>).facts);
}
