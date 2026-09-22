/**
	* 资源库详情区：加载 / 选中 / 空态。
	*/
"use client";

import type { FC } from "react";
import { Typography } from "@mui/material";
import type { AssetSummary } from "@studio-v2/typeFiles/library/assets/assetSummary";
// 引用了AssetLibraryDetail组件，用于资源详情
import { AssetLibraryDetail } from "@studio-v2/src/pageComponents/assets/AssetLibraryDetail";
import styles from "@studio-v2/src/pageComponents/library/LibrarySplit.module.scss";

export type AssetLibraryDetailPaneProps = {
	loading: boolean;
	selected: AssetSummary | undefined;
	onSaved: (next: AssetSummary) => void;
};

export const AssetLibraryDetailPane: FC<AssetLibraryDetailPaneProps> =
	function AssetLibraryDetailPane({
		// loading 表示列表加载中
		loading,
		// selected 表示当前选中资源
		selected,
		// onSaved 表示详情保存成功后同步列表
		onSaved,
	}) {
		if (loading) {
			return (
				<section className={styles.detailPane} aria-label="资源详情">
					{/* 引用了Typography组件，用于加载态 */}
					<Typography variant="body2" color="text.secondary">
						加载资源中…
					</Typography>
				</section>
			);
		}
		if (selected) {
			return (
				// 引用了AssetLibraryDetail组件，用于资源详情编辑
				<AssetLibraryDetail
					key={selected.assetId}
					asset={selected}
					onSaved={onSaved}
				/>
			);
		}
		return (
			<section className={styles.detailPane} aria-label="资源详情">
				{/* 引用了Typography组件，用于空列表提示 */}
				<Typography variant="body2" color="text.secondary">
					暂无资源。可点击「上传资源」写入 data/assets。
				</Typography>
			</section>
		);
	};
