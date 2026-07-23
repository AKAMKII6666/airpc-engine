/**
	* 包配置 worldFacts / meta 受控 JSON 块：序列化、解析与本地形状预检。
	* 非法 JSON 不写会话；空数组 / 空对象表示清空磁盘可选键。
	* 预检用 FE 镜像 guards（与引擎同构，不以 import 同步）。
	*/
import type {
	FactMeta,
	StoryPackageMeta,
} from "@studio-v2/typeFiles/story/callCard/engineCallCard";
import {
	isFactMeta,
	isStoryPackageMeta,
} from "@studio-v2/typeFiles/story/package/enginePackageMetaGuards";

/** JSON 块解析结果；ok=false 时 message 可直接作 helperText */
export type PackageMetaJsonParseResult<T> =
	| { ok: true; value: T | undefined }
	| { ok: false; message: string };

/** 投影为多行编辑草稿；缺省字段用空数组 / 空对象占位便于作者起步 */
export function stringifyWorldFactsDraft(
	worldFacts: readonly FactMeta[] | undefined,
): string {
	return JSON.stringify(worldFacts ?? [], null, 2);
}

/** meta 缺省用 `{}`，避免失焦时把空壳 imports/exports 误写入 */
export function stringifyPackageMetaDraft(
	meta: StoryPackageMeta | undefined,
): string {
	return JSON.stringify(meta ?? {}, null, 2);
}

/**
	* 解析 worldFacts JSON：须为数组；每项至少含 factId。
	* `[]` → undefined（磁盘省略键）。
	*/
export function parseWorldFactsJson(
	raw: string,
): PackageMetaJsonParseResult<FactMeta[]> {
	const trimmed = raw.trim();
	if (trimmed === "") {
		return { ok: true, value: undefined };
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(trimmed);
	} catch {
		return { ok: false, message: "JSON 语法错误" };
	}
	if (!Array.isArray(parsed)) {
		return { ok: false, message: "worldFacts 须为 JSON 数组" };
	}
	if (parsed.length === 0) {
		return { ok: true, value: undefined };
	}
	const items: FactMeta[] = [];
	for (let i = 0; i < parsed.length; i += 1) {
		if (!isFactMeta(parsed[i])) {
			return {
				ok: false,
				message: `worldFacts[${i}] 须含 factId 字符串`,
			};
		}
		items.push(parsed[i]);
	}
	return { ok: true, value: items };
}

/**
	* 解析 meta JSON：须为对象；空 `{}` → undefined。
	* 允许仅填 imports/exports.facts；多余键 passthrough 保留。
	*/
export function parsePackageMetaJson(
	raw: string,
): PackageMetaJsonParseResult<StoryPackageMeta> {
	const trimmed = raw.trim();
	if (trimmed === "") {
		return { ok: true, value: undefined };
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(trimmed);
	} catch {
		return { ok: false, message: "JSON 语法错误" };
	}
	if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
		return { ok: false, message: "meta 须为 JSON 对象" };
	}
	const keys = Object.keys(parsed as object);
	if (keys.length === 0) {
		return { ok: true, value: undefined };
	}
	if (!isStoryPackageMeta(parsed)) {
		return { ok: false, message: "meta 结构不符合 imports/exports 约定" };
	}
	return { ok: true, value: parsed };
}
