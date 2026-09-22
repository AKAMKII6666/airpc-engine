/**
	* 包配置浮窗：worldFacts / meta 受控 JSON 双块。
	*/
"use client";

import type { FC } from "react";
import type { FactMeta, StoryPackageMeta } from "@studio-v2/typeFiles/story/callCard/engineCallCard";
import {
	parsePackageMetaJson,
	parseWorldFactsJson,
} from "@studio-v2/src/bis/pageBis/storyEditor/package/session/packageMetaJson";
// 引用了PackageConfJsonBlock组件，用于单字段受控 JSON
import { PackageConfJsonBlock } from "./PackageConfJsonBlock";

export type PackageConfigMetaJsonBlocksProps = {
	/** worldFacts 规范草稿文本 */
	worldFactsText: string;
	/** meta 规范草稿文本 */
	metaText: string;
	/** worldFacts 写回；undefined 清空 */
	onWorldFactsChange: (worldFacts: readonly FactMeta[] | undefined) => void;
	/** meta 写回；undefined 清空 */
	onPackageMetaChange: (meta: StoryPackageMeta | undefined) => void;
};

export const PackageConfigMetaJsonBlocks: FC<
	PackageConfigMetaJsonBlocksProps
> = function PackageConfigMetaJsonBlocks({
	// worldFactsText 是会话真源序列化，用于 JSON 块回显
	worldFactsText,
	// metaText 是会话真源序列化，用于 JSON 块回显
	metaText,
	// onWorldFactsChange 是写回回调，用于更新会话 worldFacts
	onWorldFactsChange,
	// onPackageMetaChange 是写回回调，用于更新会话 meta
	onPackageMetaChange,
}) {
	return (
		<>
			{/* 引用了PackageConfJsonBlock组件，用于 worldFacts JSON */}
			<PackageConfJsonBlock
				label="worldFacts（JSON）"
				hint='数组；每项至少 {"factId":"..."}。空数组清除。'
				canonicalText={worldFactsText}
				onApply={function (raw) {
					const parsed = parseWorldFactsJson(raw);
					if (!parsed.ok) return parsed.message;
					onWorldFactsChange(parsed.value);
					return undefined;
				}}
			/>
			{/* 引用了PackageConfJsonBlock组件，用于 meta JSON */}
			<PackageConfJsonBlock
				label="meta（JSON）"
				hint='对象示例：{"imports":{"facts":[]},"exports":{"facts":[]},"conflictsWith":[]}。空对象清除。'
				canonicalText={metaText}
				onApply={function (raw) {
					const parsed = parsePackageMetaJson(raw);
					if (!parsed.ok) return parsed.message;
					onPackageMetaChange(parsed.value);
					return undefined;
				}}
			/>
		</>
	);
};
