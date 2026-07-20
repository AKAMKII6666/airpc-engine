/**
	* 底部 icon dock：高频创建与视图操作；资源 / 包配置可点，其余示意 disabled。
	* 角色入口已迁至画布锚点；底栏不再提供角色浮窗。
	*/
"use client";

import type { FC, ReactElement } from "react";
import { IconButton, Tooltip } from "@mui/material";
import {
	IconAction,
	IconAddCard,
	IconAssets,
	IconChapterEnd,
	IconComment,
	IconConnect,
	IconFitView,
	IconFreeCall,
	IconPackage,
	IconPlayback,
	IconSchedule,
	IconSelect,
} from "./com/dock/DockToolIcons";
import styles from "./BottomToolBar.module.scss";

type DockTool = {
	id: string;
	label: string;
	icon: ReactElement;
	/** false = 本步仅示意，禁用点击 */
	enabled: boolean;
};

/** 禁用项统一后缀，tooltip 语义清晰 */
const DISABLED_HINT = "（界面预览未开放）";

const DISABLED_TOOLS: readonly DockTool[] = [
	{
		id: "add_callcard",
		label: "新建 CallCard",
		icon: (
			// 引用了IconAddCard组件，用于新建通话卡示意
			<IconAddCard fontSize="small" />
		),
		enabled: false,
	},
	{
		id: "playback",
		label: "过场播放卡",
		icon: (
			// 引用了IconPlayback组件，用于过场播放卡示意
			<IconPlayback fontSize="small" />
		),
		enabled: false,
	},
	{
		id: "free",
		label: "自由通话卡",
		icon: (
			// 引用了IconFreeCall组件，用于自由通话卡示意
			<IconFreeCall fontSize="small" />
		),
		enabled: false,
	},
	{
		id: "delay",
		label: "延迟外呼卡",
		icon: (
			// 引用了IconSchedule组件，用于延迟外呼卡示意
			<IconSchedule fontSize="small" />
		),
		enabled: false,
	},
	{
		id: "chapter_end",
		label: "章节结束",
		icon: (
			// 引用了IconChapterEnd组件，用于章节结束示意
			<IconChapterEnd fontSize="small" />
		),
		enabled: false,
	},
	{
		id: "action",
		label: "动作节点",
		icon: (
			// 引用了IconAction组件，用于动作节点示意
			<IconAction fontSize="small" />
		),
		enabled: false,
	},
	{
		id: "comment",
		label: "注释分组",
		icon: (
			// 引用了IconComment组件，用于注释分组示意
			<IconComment fontSize="small" />
		),
		enabled: false,
	},
	{
		id: "connect",
		label: "连线",
		icon: (
			// 引用了IconConnect组件，用于连线工具示意
			<IconConnect fontSize="small" />
		),
		enabled: false,
	},
	{
		id: "select",
		label: "框选",
		icon: (
			// 引用了IconSelect组件，用于框选工具示意
			<IconSelect fontSize="small" />
		),
		enabled: false,
	},
	{
		id: "fit",
		label: "适配视图",
		icon: (
			// 引用了IconFitView组件，用于适配视图示意
			<IconFitView fontSize="small" />
		),
		enabled: false,
	},
];

function toolTooltip(tool: DockTool): string {
	return tool.enabled ? tool.label : `${tool.label}${DISABLED_HINT}`;
}

export type BottomToolBarProps = {
	/** 打开资源引用浮窗 */
	onOpenAssets: () => void;
	/** 打开包配置只读浮窗 */
	onOpenPackage: () => void;
};

export const BottomToolBar: FC<BottomToolBarProps> = function ({
	// onOpenAssets 打开资源引用浮窗
	onOpenAssets,
	// onOpenPackage 打开包配置浮窗
	onOpenPackage,
}) {
	return (
		<footer className={styles.bar} aria-label="画布工具">
			<div className={styles.dock}>
				{DISABLED_TOOLS.map((tool) => (
					// 引用了Tooltip组件，用于禁用工具说明
					<Tooltip key={tool.id} title={toolTooltip(tool)} placement="top">
						<span className={styles.tipWrap}>
							{/* 引用了IconButton组件，用于底栏禁用工具按钮 */}
							<IconButton
								size="small"
								className={styles.iconBtn}
								disabled={!tool.enabled}
								aria-label={toolTooltip(tool)}
							>
								{tool.icon}
							</IconButton>
						</span>
					</Tooltip>
				))}
				<span className={styles.divider} aria-hidden />
				{/* 引用了Tooltip组件，用于资源浮窗说明 */}
				<Tooltip title="资源浮窗" placement="top">
					{/* 引用了IconButton组件，用于打开资源浮窗 */}
					<IconButton
						size="small"
						className={styles.iconBtnActive}
						onClick={onOpenAssets}
						aria-label="打开资源浮窗"
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
						className={styles.iconBtnActive}
						onClick={onOpenPackage}
						aria-label="打开包配置浮窗"
					>
						{/* 引用了IconPackage组件，用于包配置入口图标 */}
						<IconPackage fontSize="small" />
					</IconButton>
				</Tooltip>
			</div>
		</footer>
	);
};
