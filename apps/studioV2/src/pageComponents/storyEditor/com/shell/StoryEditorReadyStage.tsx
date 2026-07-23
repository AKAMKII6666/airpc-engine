/**
	* 故事编辑器就绪态主舞台：顶栏/校验条 + 画布 + 底栏 + 弹层。
	* 从 StoryEditorShell 拆出以控壳组件有效行数。
	*/
"use client";

import type { FC } from "react";
import { BottomToolBar } from "@studio-v2/src/pageComponents/storyEditor/BottomToolBar";
// 引用了StoryEditorChrome组件，用于顶栏与校验条幅
import { StoryEditorChrome } from "@studio-v2/src/pageComponents/storyEditor/com/shell/chrome/StoryEditorChrome";
// 引用了StoryEditorCanvasLayer组件，用于画布与浮窗叠层
import { StoryEditorCanvasLayer } from "@studio-v2/src/pageComponents/storyEditor/com/shell/StoryEditorCanvasLayer";
// 引用了StoryEditorShellModals组件，用于角色/资源/节点删除弹层
import { StoryEditorShellModals } from "@studio-v2/src/pageComponents/storyEditor/com/shell/StoryEditorShellModals";
import type { useStoryEditorShellController } from "@studio-v2/src/pageComponents/storyEditor/hooks/shell/useStoryEditorShellController";
import type { DiskStoryPackageBundle } from "@studio-v2/typeFiles/story/package/diskStoryPackage";
import type { EditorGraphSeed } from "@studio-v2/src/bis/pageBis/storyEditor/package/graph/diskBundleGraph";
import styles from "../../StoryEditorShell.module.scss";

type ShellController = ReturnType<typeof useStoryEditorShellController>;

export type StoryEditorReadyStageProps = {
	packageId: string;
	bundle: DiskStoryPackageBundle;
	graphSeed: EditorGraphSeed;
	shell: ShellController;
};

export const StoryEditorReadyStage: FC<StoryEditorReadyStageProps> = function ({
	// packageId 是路由包键
	packageId,
	// bundle 是当前会话整包
	bundle,
	// graphSeed 是画布初始图
	graphSeed,
	// shell 是壳控制器快照
	shell,
}) {
	const { characterForms, assetForms, packageSession } = shell;
	const {
		saveState,
		saveError,
		saveValidation,
		onSave,
		onLocateValidationIssue,
		dismissSaveValidation,
	} = packageSession;

	return (
		<div className={styles.root}>
			{/* 引用了StoryEditorChrome组件，用于顶栏与校验条幅 */}
			<StoryEditorChrome
				packageTitle={shell.packageTitle}
				chapterTitle={bundle.conf.title ?? "章节"}
				saveState={saveState}
				saveError={saveError}
				saveValidation={saveValidation}
				onSave={function () {
					void onSave();
				}}
				onLocateValidationIssue={onLocateValidationIssue}
				dismissSaveValidation={dismissSaveValidation}
			>
				<div className={styles.body}>
					{/* 引用了StoryEditorCanvasLayer组件，用于画布与浮窗叠层 */}
					<StoryEditorCanvasLayer
						packageId={packageId}
						graphSeed={graphSeed}
						bundle={bundle}
						selection={shell.selection}
						propertyPanelOpen={shell.propertyPanelOpen}
						assetFloat={shell.assetFloat}
						packageFloat={shell.packageFloat}
						assets={assetForms.assets}
						characterAnchors={shell.characterAnchors}
						effectPanelSources={shell.effectPanelSources}
						chapterDiskCtx={shell.chapterDiskCtx}
						chapterPackageOptions={shell.chapterPackageOptions}
						onSelectionChange={shell.onSelectionChange}
						onOpenPropertyPanel={shell.openPropertyPanel}
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
						entryCardOptions={shell.entryCardOptions}
						onEntryCardIdChange={packageSession.onEntryCardIdChange}
						onAssetRefsChange={packageSession.onAssetRefsChange}
						onWorldFactsChange={packageSession.onWorldFactsChange}
						onPackageMetaChange={packageSession.onPackageMetaChange}
						canUseAsPlaybackClip={shell.canUseAsPlaybackClip}
						onUseAsPlaybackClip={shell.onUseAsPlaybackClip}
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
			</StoryEditorChrome>
		</div>
	);
};
