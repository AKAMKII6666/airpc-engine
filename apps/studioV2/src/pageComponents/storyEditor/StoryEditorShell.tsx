/**
	* 故事编辑器全屏壳：画布为主角 + 底栏 + 属性/资源/包配置浮窗。
	* 角色入口仅画布锚点（新建/编辑复用 /characters FormModal）；不接 Host 写口。
	*/
"use client";

import type { FC } from "react";
import { StoryEditorTopBar } from "@studio-v2/src/pageComponents/storyEditor/StoryEditorTopBar";
import { BottomToolBar } from "@studio-v2/src/pageComponents/storyEditor/BottomToolBar";
// 引用了StoryEditorCanvasLayer组件，用于画布与浮窗叠层
import { StoryEditorCanvasLayer } from "@studio-v2/src/pageComponents/storyEditor/com/shell/StoryEditorCanvasLayer";
// 引用了StoryEditorShellModals组件，用于角色/资源/节点删除弹层
import { StoryEditorShellModals } from "@studio-v2/src/pageComponents/storyEditor/com/shell/StoryEditorShellModals";
import { useStoryEditorShellController } from "@studio-v2/src/pageComponents/storyEditor/hooks/shell/useStoryEditorShellController";
import styles from "./StoryEditorShell.module.scss";

export type StoryEditorShellProps = {
	/** 路由包键；用于标题投影，主流程不要求用户理解 */
	packageId: string;
};

export const StoryEditorShell: FC<StoryEditorShellProps> = function ({
	// packageId 是路由包键，用于顶栏标题投影
	packageId,
}) {
	const shell = useStoryEditorShellController(packageId);
	const { characterForms, assetForms } = shell;

	return (
		<div className={styles.root}>
			{/* 引用了StoryEditorTopBar组件，用于顶栏包名与导航 */}
			<StoryEditorTopBar
				packageTitle={shell.packageTitle}
				chapterTitle="当前章节"
			/>
			<div className={styles.body}>
				{/* 引用了StoryEditorCanvasLayer组件，用于画布与浮窗叠层 */}
				<StoryEditorCanvasLayer
					packageId={packageId}
					selection={shell.selection}
					assetFloat={shell.assetFloat}
					packageFloat={shell.packageFloat}
					assets={assetForms.assets}
					characterAnchors={shell.characterAnchors}
					onSelectionChange={shell.onSelectionChange}
					onCharacterAnchorSelect={shell.onCharacterAnchorSelect}
					onCanvasReady={shell.onCanvasReady}
					onGraphMetaChange={shell.onGraphMetaChange}
					onToolModeChange={shell.onToolModeChange}
					onApplyNodeData={shell.onApplyNodeData}
					onApplyChapterNodeData={shell.onApplyChapterNodeData}
					onAssignOwner={shell.onAssignOwner}
					onRequestDeleteNode={shell.onRequestDeleteNode}
					onAddCharacter={characterForms.openCreate}
					onCloseSelection={shell.closeSelection}
					onCloseAssetFloat={shell.closeAssetFloat}
					onClosePackageFloat={shell.closePackageFloat}
					onCreateAsset={assetForms.openCreate}
					onEditAsset={assetForms.openEdit}
					onRequestDeleteAsset={assetForms.onRequestDelete}
				/>
			</div>
			{/* 引用了BottomToolBar组件，用于底栏工具模式与资源/包入口 */}
			<BottomToolBar
				activeToolId={shell.activeToolId}
				onToolClick={shell.onToolClick}
				chapterEndDisabled={shell.chapterEndDisabled}
				onOpenAssets={shell.openAssetsFloat}
				onOpenPackage={shell.openPackageFloat}
				assetsActive={shell.assetFloat}
				packageActive={shell.packageFloat}
			/>
			{/* 引用了StoryEditorShellModals组件，用于角色/资源/节点删除弹层 */}
			<StoryEditorShellModals
				character={characterForms}
				asset={assetForms}
				pendingDeleteNode={shell.pendingDelete}
				onCloseDeleteNode={shell.closeDeleteNodeModal}
				onConfirmDeleteNode={shell.onConfirmDeleteNode}
			/>
		</div>
	);
};
