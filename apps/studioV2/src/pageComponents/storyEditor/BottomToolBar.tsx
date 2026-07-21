/**
	* 底部 icon dock：工具模式 + 资源 / 包配置浮窗入口。
	* 不直接 mutate React Flow；点击经壳层 → StoryCanvasStageApi。
	*/
"use client";

import type { FC } from "react";
import { IconButton, Tooltip } from "@mui/material";
import type { DockToolId } from "@studio-v2/typeFiles/story/editor/dock/dockToolMode";
import { DOCK_TOOLS } from "./com/dock/dockTools";
import { IconAssets, IconPackage } from "./com/dock/DockToolIcons";
import styles from "./BottomToolBar.module.scss";

export type BottomToolBarProps = {
	/** 当前高亮工具；idle 时为 pan */
	activeToolId: DockToolId;
	/** 底栏工具点击；编排在壳层 / dock bis */
	onToolClick: (toolId: DockToolId) => void;
	/**
		* 画布已有 chapter_end 时禁用章节结束 icon。
		* 删除后应恢复可点。
		*/
	chapterEndDisabled: boolean;
	/** 打开资源引用浮窗 */
	onOpenAssets: () => void;
	/** 打开包配置只读浮窗 */
	onOpenPackage: () => void;
	/** 资源浮窗是否打开；仅打开时高亮 */
	assetsActive: boolean;
	/** 包配置浮窗是否打开；仅打开时高亮 */
	packageActive: boolean;
};

export const BottomToolBar: FC<BottomToolBarProps> = function ({
	// activeToolId 是当前 toolMode 高亮，用于 active 视觉
	activeToolId,
	// onToolClick 转发底栏工具意图，用于壳层归约
	onToolClick,
	// chapterEndDisabled 有章节结束节点时灰掉入口
	chapterEndDisabled,
	// onOpenAssets 打开资源引用浮窗
	onOpenAssets,
	// onOpenPackage 打开包配置浮窗
	onOpenPackage,
	// assetsActive 资源浮窗打开态，用于高亮
	assetsActive,
	// packageActive 包配置浮窗打开态，用于高亮
	packageActive,
}) {
	return (
		<footer className={styles.bar} aria-label="画布工具">
			<div className={styles.dock}>
				{DOCK_TOOLS.map((tool) => {
					const disabled =
						tool.id === "chapter_end" && chapterEndDisabled;
					const active = !disabled && activeToolId === tool.id;
					const tip =
						disabled
							? "本包已有章节结束节点"
							: tool.label;
					return (
						// 引用了Tooltip组件，用于工具名称说明
						<Tooltip key={tool.id} title={tip} placement="top">
							<span className={styles.tipWrap}>
								{/* 引用了IconButton组件，用于底栏可点工具 */}
								<IconButton
									size="small"
									className={
										active ? styles.iconBtnActive : styles.iconBtn
									}
									onClick={() => onToolClick(tool.id)}
									disabled={disabled}
									aria-label={tip}
									aria-pressed={active}
								>
									{tool.icon}
								</IconButton>
							</span>
						</Tooltip>
					);
				})}
				<span className={styles.divider} aria-hidden />
				{/* 引用了Tooltip组件，用于资源浮窗说明 */}
				<Tooltip title="资源浮窗" placement="top">
					{/* 引用了IconButton组件，用于打开资源浮窗 */}
					<IconButton
						size="small"
						className={
							assetsActive ? styles.iconBtnActive : styles.iconBtn
						}
						onClick={onOpenAssets}
						aria-label="打开资源浮窗"
						aria-pressed={assetsActive}
					>
						{/* 引用了IconAssets组件，用于资源浮窗入口图标 */}
						<IconAssets fontSize="small" />
					</IconButton>
				</Tooltip>
				{/* 引用了Tooltip组件，用于包配置浮窗说明 */}
				<Tooltip title="包配置" placement="top">
					{/* 引用了IconButton组件，用于打开包配置浮窗 */}
					<IconButton
						size="small"
						className={
							packageActive ? styles.iconBtnActive : styles.iconBtn
						}
						onClick={onOpenPackage}
						aria-label="打开包配置浮窗"
						aria-pressed={packageActive}
					>
						{/* 引用了IconPackage组件，用于包配置入口图标 */}
						<IconPackage fontSize="small" />
					</IconButton>
				</Tooltip>
			</div>
		</footer>
	);
};
