/**
	* 故事包配置浮窗：entryCardId / assetRefs / worldFacts / meta 可编。
	* 写回会话 bundle；整包保存见顶栏。
	*/
"use client";

import type { FC } from "react";
import { Button, MenuItem, TextField, Typography } from "@mui/material";
import type { FactMeta, StoryPackageMeta } from "@studio-v2/typeFiles/story/callCard/engineCallCard";
import {
	stringifyPackageMetaDraft,
	stringifyWorldFactsDraft,
} from "@studio-v2/src/bis/pageBis/storyEditor/package/session/packageMetaJson";
import { projectEditorPackageConfFromBundle } from "@studio-v2/src/bis/pageBis/storyEditor/package/conf/packageConfProjection";
import type { CallCardLabelOption } from "@studio-v2/typeFiles/story/callCardLabels";
import type { DiskStoryPackageBundle } from "@studio-v2/typeFiles/story/package/diskStoryPackage";
// 引用了PackageAssetRefsEditor组件，用于包级 assetRefs 多选
import { PackageAssetRefsEditor } from "./PackageAssetRefsEditor";
// 引用了PackageConfigMetaJsonBlocks组件，用于 worldFacts/meta JSON
import { PackageConfigMetaJsonBlocks } from "./PackageConfigMetaJsonBlocks";
// 引用了PackageConfigReadonlySummary组件，用于只读摘要
import { PackageConfigReadonlySummary } from "./PackageConfigReadonlySummary";
import styles from "../EditorLibraryFloat.module.scss";

export type PackageConfigFloatProps = {
	/** 当前打开的磁盘整包（含会话内已改 conf 字段） */
	bundle: DiskStoryPackageBundle;
	/** 入口卡 Select 候选；优先画布现有 CallCard，兜底 conf.cards */
	entryCardOptions: readonly CallCardLabelOption[];
	/** 全局资产候选；来自 /api/assets，写入 conf.assetRefs */
	assetOptions: readonly CallCardLabelOption[];
	open: boolean;
	onClose: () => void;
	/** 入口卡变更；写会话 bundle.conf.entryCardId，顶栏保存落盘 */
	onEntryCardIdChange: (cardId: string) => void;
	/** 包级 assetRefs 多选写回；顶栏保存落盘 */
	onAssetRefsChange: (assetRefs: readonly string[]) => void;
	/** worldFacts 写回；undefined 表示清空 */
	onWorldFactsChange: (worldFacts: readonly FactMeta[] | undefined) => void;
	/** meta 写回；undefined 表示清空 */
	onPackageMetaChange: (meta: StoryPackageMeta | undefined) => void;
};

export const PackageConfigFloat: FC<PackageConfigFloatProps> =
	function PackageConfigFloat({
		// bundle 是当前整包，用于投影与入口/资产回显
		bundle,
		// entryCardOptions 是本包 cardId 候选，用于入口 Select
		entryCardOptions,
		// assetOptions 是全局资产候选，用于 assetRefs 多选
		assetOptions,
		// open 表示浮窗是否可见，用于条件渲染
		open,
		// onClose 是关闭回调，用于收起浮窗
		onClose,
		// onEntryCardIdChange 是入口卡写回，用于会话内改 conf.entryCardId
		onEntryCardIdChange,
		// onAssetRefsChange 是包资产引用写回，用于会话内改 conf.assetRefs
		onAssetRefsChange,
		// onWorldFactsChange 是 worldFacts 写回，用于 JSON 块应用
		onWorldFactsChange,
		// onPackageMetaChange 是 meta 写回，用于 JSON 块应用
		onPackageMetaChange,
	}) {
		if (!open) return null;

		const conf = projectEditorPackageConfFromBundle(bundle);
		const entryValue = entryCardOptions.some(function (opt) {
			return opt.value === conf.entryCardId;
		})
			? conf.entryCardId
			: "";

		return (
			<aside className={styles.floatRight} aria-label="包配置浮窗">
				<div className={styles.head}>
					{/* 引用了Typography组件，用于浮窗标题 */}
					<Typography variant="subtitle2" className={styles.title}>
						包配置
					</Typography>
					{/* 引用了Button组件，用于关闭包配置浮窗 */}
					<Button size="small" onClick={onClose} aria-label="关闭包配置浮窗">
						关闭
					</Button>
				</div>
				{/* 引用了Typography组件，用于可编说明 */}
				<Typography variant="caption" className={styles.hint}>
					入口卡、assetRefs、worldFacts、meta 可改。保存请用顶栏「保存」。
				</Typography>
				{/* 引用了TextField组件，用于入口卡 Select */}
				<TextField
					size="small"
					select
					fullWidth
					label="入口卡 entryCardId"
					value={entryValue}
					disabled={entryCardOptions.length === 0}
					helperText={
						entryCardOptions.length === 0
							? "本包暂无 CallCard，请先放置卡片"
							: "章节起点；删入口卡时保存会改指向首张"
					}
					onChange={(e) => {
						onEntryCardIdChange(e.target.value);
					}}
				>
					{entryCardOptions.map(function (opt) {
						return (
							// 引用了MenuItem组件，用于入口卡选项
							<MenuItem key={opt.value} value={opt.value}>
								{opt.label}
							</MenuItem>
						);
					})}
				</TextField>
				{/* 引用了PackageAssetRefsEditor组件，用于包级资产引用多选 */}
				<PackageAssetRefsEditor
					selectedIds={conf.assetRefs}
					assetOptions={assetOptions}
					onChange={onAssetRefsChange}
				/>
				{/* 引用了PackageConfigMetaJsonBlocks组件，用于 worldFacts/meta */}
				<PackageConfigMetaJsonBlocks
					worldFactsText={stringifyWorldFactsDraft(bundle.conf.worldFacts)}
					metaText={stringifyPackageMetaDraft(bundle.conf.meta)}
					onWorldFactsChange={onWorldFactsChange}
					onPackageMetaChange={onPackageMetaChange}
				/>
				{/* 引用了PackageConfigReadonlySummary组件，用于只读摘要 */}
				<PackageConfigReadonlySummary conf={conf} />
			</aside>
		);
	};
