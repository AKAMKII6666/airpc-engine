/**
	* 包配置浮窗：assetRefs 多选块（候选来自 /api/assets）。
	*/
"use client";

import type { FC } from "react";
import { Checkbox, FormControlLabel, Typography } from "@mui/material";
import type { CallCardLabelOption } from "@studio-v2/typeFiles/story/callCardLabels";
import styles from "../EditorLibraryFloat.module.scss";

export type PackageAssetRefsEditorProps = {
	/** 当前 conf.assetRefs */
	selectedIds: readonly string[];
	/** 全局资产候选；value=assetId */
	assetOptions: readonly CallCardLabelOption[];
	/** 勾选变更写回；整表替换 */
	onChange: (assetRefs: readonly string[]) => void;
};

export const PackageAssetRefsEditor: FC<PackageAssetRefsEditorProps> =
	function PackageAssetRefsEditor({
		// selectedIds 是当前已勾选 assetId，用于 Checkbox 回显
		selectedIds,
		// assetOptions 是 /api/assets 候选，用于多选列表
		assetOptions,
		// onChange 是勾选写回，用于更新会话 conf.assetRefs
		onChange,
	}) {
		const selected = new Set(selectedIds);

		function toggle(assetId: string, checked: boolean): void {
			const next = checked
				? [...selectedIds, assetId]
				: selectedIds.filter(function (id) {
						return id !== assetId;
					});
			onChange(next);
		}

		return (
			<div className={styles.readonlyRow}>
				{/* 引用了Typography组件，用于 assetRefs 字段标题 */}
				<Typography variant="caption" className={styles.itemMeta}>
					assetRefs（本包资产引用）
				</Typography>
				{assetOptions.length === 0 ? (
					// 引用了Typography组件，用于空资产提示
					<Typography variant="body2" color="text.secondary">
						资源库暂无资产；请先在资源浮窗新建。
					</Typography>
				) : (
					<ul className={styles.list}>
						{assetOptions.map(function (opt) {
							return (
								<li key={opt.value} className={styles.item}>
									{/* 引用了FormControlLabel组件，用于勾选包级资产引用 */}
									<FormControlLabel
										control={
											// 引用了Checkbox组件，用于写入 conf.assetRefs
											<Checkbox
												size="small"
												checked={selected.has(opt.value)}
												onChange={(e) => {
													toggle(opt.value, e.target.checked);
												}}
												inputProps={{
													"aria-label": `引用资产 ${opt.label}`,
												}}
											/>
										}
										label={opt.label}
									/>
								</li>
							);
						})}
					</ul>
				)}
			</div>
		);
	};
