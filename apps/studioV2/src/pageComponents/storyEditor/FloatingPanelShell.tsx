/**
* 属性浮窗壳：按选中 CallCard / 章节节点展示可编辑投影；可关闭。
* 标题栏拖移；右下角拖改宽高；提交仅会话内，不写盘。
*/
"use client";

import type { FC } from "react";
import { Button, Typography } from "@mui/material";
import type {
	CharacterAnchorNodeData,
	EditorCallCardProjection,
	EditorChapterNodeData,
	StoryEditorSelection,
} from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";
import type { ChapterPackageDiskContext } from "@studio-v2/src/bis/pageBis/storyEditor/form/chapter/chapterPropertyForm";
import type { CallCardLabelOption } from "@studio-v2/typeFiles/story/callCardLabels";
import type { EffectPanelSources } from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
// 引用了FloatingPanelFormBody组件，用于属性表单主体
import { FloatingPanelFormBody } from "@studio-v2/src/pageComponents/storyEditor/com/panel/FloatingPanelFormBody";
// 引用了useFloatingPanelLayout hook，用于拖移与缩放浮窗
import { useFloatingPanelLayout } from "@studio-v2/src/pageComponents/storyEditor/hooks/panel/useFloatingPanelDrag";
import styles from "./FloatingPanelShell.module.scss";

export type FloatingPanelShellProps = {
	/** 当前选中节点投影；null 时浮窗收起 */
	selection: StoryEditorSelection | null;
	onClose: () => void;
	/**
	* CallCard 属性表单应用到画布节点。
	* 仅会话内；调用方负责同步 selection 与 RF nodes。
	*/
	onApplyNodeData: (nodeId: string, next: EditorCallCardProjection) => void;
	/**
	* 章节节点属性应用到画布；仅会话 mock。
	*/
	onApplyChapterNodeData: (
		nodeId: string,
		next: EditorChapterNodeData,
	) => void;
	/** 画布角色锚点；CallCard 归属 Select */
	characterAnchors: readonly CharacterAnchorNodeData[];
	/** Effect 面板 id 下拉候选源；下传 CallCard 属性表单出口列表 */
	effectPanelSources: EffectPanelSources;
	/** chapter_end 下一包/卡下拉用的磁盘索引 */
	chapterDiskCtx: ChapterPackageDiskContext;
	/** 下一故事包 Select 选项（磁盘列表） */
	chapterPackageOptions: readonly CallCardLabelOption[];
	/**
		* 归属即时写回；与 role 边双向同步。
		*/
	onAssignOwner: (
		nodeId: string,
		agentId: string,
		displayName: string,
	) => void;
};

export const FloatingPanelShell: FC<FloatingPanelShellProps> = function ({
	// selection 是当前选中投影，用于切换 CallCard / 章节表单
	selection,
	// onClose 关闭属性浮窗
	onClose,
	// onApplyNodeData 写回通话卡会话投影
	onApplyNodeData,
	// onApplyChapterNodeData 写回章节会话投影
	onApplyChapterNodeData,
	// characterAnchors 是归属 Select 选项
	characterAnchors,
	// effectPanelSources 是 Effect id 下拉候选源，用于出口列表
	effectPanelSources,
	// chapterDiskCtx 是 chapter_end 磁盘卡索引
	chapterDiskCtx,
	// chapterPackageOptions 是下一故事包 Select 选项
	chapterPackageOptions,
	// onAssignOwner 即时写归属
	onAssignOwner,
}) {
	const { panelRef, panelStyle, onDragStart, onResizeStart } =
		useFloatingPanelLayout();

	if (!selection) return null;

	const panelTitle =
		selection.selectionKind === "chapter" ? "章节属性" : "卡片属性";

	return (
		<aside
			ref={panelRef}
			className={styles.panel}
			style={panelStyle}
			aria-label={`${panelTitle}浮窗`}
		>
			<div className={styles.head}>
				{/* 引用了div拖拽区，用于按住标题栏移动浮窗 */}
				<div className={styles.dragZone} onMouseDown={onDragStart}>
					<span className={styles.grip} aria-hidden>
						⠿
					</span>
					{/* 引用了Typography组件，用于浮窗标题 */}
					<Typography variant="subtitle2" className={styles.title}>
						{panelTitle}
					</Typography>
				</div>
				{/* 引用了Button组件，用于关闭浮窗 */}
				<Button size="small" onClick={onClose} aria-label="关闭浮窗">
					关闭
				</Button>
			</div>
			{/* 引用了Typography组件，用于不写盘提示 */}
			<Typography variant="caption" className={styles.hint}>
				编辑本地投影；点顶栏「保存」整包写回。右下角可拖改大小。
			</Typography>
			<div className={styles.body}>
				{/* 引用了FloatingPanelFormBody组件，用于属性表单 */}
				<FloatingPanelFormBody
					selection={selection}
					onApplyNodeData={onApplyNodeData}
					onApplyChapterNodeData={onApplyChapterNodeData}
					characterAnchors={characterAnchors}
					effectPanelSources={effectPanelSources}
					chapterDiskCtx={chapterDiskCtx}
					chapterPackageOptions={chapterPackageOptions}
					onAssignOwner={onAssignOwner}
				/>
			</div>
			{/* 引用了缩放手柄，用于拖改浮窗宽高 */}
			<button
				type="button"
				className={styles.resizeHandle}
				aria-label="拖拽调整浮窗大小"
				onMouseDown={onResizeStart}
			/>
		</aside>
	);
};
