/**
	* 编辑器内资源浮窗：列表 + 增删改 + 回填当前卡 playbackClipId。
	* 真源 = /api/assets ↔ data/assets；缺文件带警告；默认可收起。
	*/
"use client";

import type { FC } from "react";
import { Button, Typography } from "@mui/material";
import {
	assetAvailabilityLabel,
	assetKindLabel,
} from "@studio-v2/typeFiles/library/labels/libraryLabels";
import type { AssetSummary } from "@studio-v2/typeFiles/library/assets/assetSummary";
import styles from "./EditorLibraryFloat.module.scss";

export type AssetPickerFloatProps = {
	open: boolean;
	onClose: () => void;
	/** 磁盘资源投影快照；由 hook 经 /api/assets 刷新 */
	assets: readonly AssetSummary[];
	/** 打开新建 FormModal */
	onCreate: () => void;
	/** 打开编辑 FormModal */
	onEdit: (asset: AssetSummary) => void;
	/** 打开删除确认 */
	onRequestDelete: (assetId: string) => void;
	/**
		* 是否可回填当前选中 CallCard 的 playbackClipId。
		* 无选中通话卡时为 false，隐藏「用作播放片段」。
		*/
	canUseAsPlaybackClip: boolean;
	/** 把 assetId 写入当前选中卡 context.playbackClipId（会话内） */
	onUseAsPlaybackClip: (assetId: string) => void;
};

export const AssetPickerFloat: FC<AssetPickerFloatProps> =
	function AssetPickerFloat({
		// open 表示浮窗是否可见，用于条件渲染
		open,
		// onClose 是关闭回调，用于收起浮窗
		onClose,
		// assets 是磁盘资源列表投影，用于展示与 CRUD 入口
		assets,
		// onCreate 打开新建弹层，用于登记资源
		onCreate,
		// onEdit 打开编辑弹层，用于改资源投影
		onEdit,
		// onRequestDelete 打开删除确认，用于落盘移除
		onRequestDelete,
		// canUseAsPlaybackClip 表示是否可选中卡回填，用于显示「用作播放片段」
		canUseAsPlaybackClip,
		// onUseAsPlaybackClip 是回填回调，用于写入当前卡 playbackClipId
		onUseAsPlaybackClip,
	}) {
		if (!open) return null;

		return (
			<aside className={styles.floatRight} aria-label="资源引用浮窗">
				<div className={styles.head}>
					{/* 引用了Typography组件，用于浮窗标题 */}
					<Typography variant="subtitle2" className={styles.title}>
						资源引用
					</Typography>
					{/* 引用了Button组件，用于关闭资源浮窗 */}
					<Button size="small" onClick={onClose} aria-label="关闭资源浮窗">
						关闭
					</Button>
				</div>
				{/* 引用了Typography组件，用于操作提示文案 */}
				<Typography variant="caption" className={styles.hint}>
					经 /api/assets 读写 data/assets。选中通话卡后可「用作播放片段」回填
					playbackClipId；包级 assetRefs 在包配置浮窗勾选。
				</Typography>
				<div className={styles.toolbar}>
					{/* 引用了Button组件，用于打开新建资源 FormModal */}
					<Button size="small" variant="outlined" onClick={onCreate}>
						新建资源
					</Button>
				</div>
				{assets.length === 0 ? (
					// 引用了Typography组件，用于空列表提示
					<Typography variant="body2" color="text.secondary">
						暂无资源。可点击「新建资源」写入 data/assets。
					</Typography>
				) : (
					<ul className={styles.list}>
						{assets.map((a) => (
							<li key={a.assetId} className={styles.item}>
								<span className={styles.itemBody}>
									{a.displayName}
									<br />
									<span className={styles.itemMeta}>
										{assetKindLabel(a.kind)}
										{" · "}
										{a.availability === "missing" ? (
											<span className={styles.warn}>
												{assetAvailabilityLabel(a.availability)}
											</span>
										) : (
											assetAvailabilityLabel(a.availability)
										)}
									</span>
								</span>
								<span className={styles.itemActions}>
									{canUseAsPlaybackClip ? (
										// 引用了Button组件，用于回填当前卡 playbackClipId
										<Button
											size="small"
											variant="outlined"
											onClick={() => onUseAsPlaybackClip(a.assetId)}
											aria-label={`将 ${a.displayName} 用作播放片段`}
										>
											用作播放片段
										</Button>
									) : null}
									{/* 引用了Button组件，用于打开编辑 FormModal */}
									<Button
										size="small"
										onClick={() => onEdit(a)}
										aria-label={`编辑 ${a.displayName}`}
									>
										编辑
									</Button>
									{/* 引用了Button组件，用于打开删除确认 */}
									<Button
										size="small"
										color="warning"
										onClick={() => onRequestDelete(a.assetId)}
										aria-label={`删除 ${a.displayName}`}
									>
										删除
									</Button>
								</span>
							</li>
						))}
					</ul>
				)}
			</aside>
		);
	};
