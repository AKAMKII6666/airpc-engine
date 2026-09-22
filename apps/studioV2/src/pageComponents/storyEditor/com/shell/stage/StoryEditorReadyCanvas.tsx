/**
	* 已选玩家后的画布 + 底栏 + 壳弹层；从 ReadyStage 拆出控行数。
	*/
"use client";

import type { FC } from "react";
import { BottomToolBar } from "@studio-v2/src/pageComponents/storyEditor/chrome/BottomToolBar";
// 引用了StoryEditorCanvasLayer组件，用于画布与浮窗叠层
import { StoryEditorCanvasLayer } from "@studio-v2/src/pageComponents/storyEditor/com/shell/stage/StoryEditorCanvasLayer";
// 引用了StoryEditorShellModals组件，用于角色/资源/节点删除弹层
import { StoryEditorShellModals } from "@studio-v2/src/pageComponents/storyEditor/com/shell/modals/StoryEditorShellModals";
import type { useStoryEditorShellController } from "@studio-v2/src/pageComponents/storyEditor/hooks/shell/controller/useStoryEditorShellController";
import type { DiskStoryPackageBundle } from "@studio-v2/typeFiles/story/package/diskStoryPackage";
import type { EditorGraphSeed } from "@studio-v2/src/bis/pageBis/storyEditor/package/graph/diskBundleGraph";
import { buildReadyCanvasLayerProps } from "@studio-v2/src/pageComponents/storyEditor/com/shell/props/buildReadyCanvasLayerProps";
import styles from "../../chrome/StoryEditorShell.module.scss";

type ShellController = ReturnType<typeof useStoryEditorShellController>;

export type StoryEditorReadyCanvasProps = {
	packageId: string;
	chapterId: string;
	bundle: DiskStoryPackageBundle;
	graphSeed: EditorGraphSeed;
	shell: ShellController;
};

export const StoryEditorReadyCanvas: FC<StoryEditorReadyCanvasProps> =
	function ({
		// packageId 表示路由包键，用于画布与包配置
		packageId,
		// chapterId 表示路由章键（保存由 shell 经 bis 处理）
		chapterId: _chapterId,
		// bundle 表示当前会话整包，用于包配置浮窗
		bundle,
		// graphSeed 表示画布初始图，用于 RF 初始化
		graphSeed,
		// shell 表示壳控制器快照，用于画布绑定
		shell,
	}) {
		const { characterForms, assetForms } = shell;
		const canvasProps = buildReadyCanvasLayerProps({
			packageId,
			bundle,
			graphSeed,
			shell,
		});

		return (
			<>
				<div className={styles.body}>
					{/* 引用了StoryEditorCanvasLayer组件，用于画布与浮窗叠层 */}
					<StoryEditorCanvasLayer {...canvasProps} />
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
			</>
		);
	};
