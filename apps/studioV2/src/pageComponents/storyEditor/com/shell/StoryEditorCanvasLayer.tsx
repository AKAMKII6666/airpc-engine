/**
	* 故事编辑器画布叠层：舞台 + 角色入口 + 属性/资源/包浮窗。
	* 从 StoryEditorShell 拆出以控函数有效行数；布局仅会话 mock。
	*/
"use client";

import type { FC } from "react";
import { FloatingPanelShell } from "@studio-v2/src/pageComponents/storyEditor/FloatingPanelShell";
import { AssetPickerFloat } from "@studio-v2/src/pageComponents/storyEditor/library/AssetPickerFloat";
import { PackageConfigFloat } from "@studio-v2/src/pageComponents/storyEditor/library/PackageConfigFloat";
// 引用了CanvasCharacterAddButton组件，用于画布添加角色入口
import { CanvasCharacterAddButton } from "@studio-v2/src/pageComponents/storyEditor/com/character/CanvasCharacterAddButton";
import { StoryCanvasStage } from "@studio-v2/src/pageComponents/storyEditor/canvas/StoryCanvasStage";
import type { StoryCanvasStageApi } from "@studio-v2/src/pageComponents/storyEditor/canvas/storyCanvasTypes";
import type { StoryCanvasGraphMeta } from "@studio-v2/src/pageComponents/storyEditor/canvas/useStoryCanvasGraph";
import type { AssetSummary } from "@studio-v2/typeFiles/library/assets/assetSummary";
import type { DockToolModeState } from "@studio-v2/typeFiles/story/editor/dock/dockToolMode";
import type {
	CharacterAnchorNodeData,
	EditorCallCardProjection,
	EditorChapterNodeData,
	StoryEditorSelection,
} from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";
import styles from "@studio-v2/src/pageComponents/storyEditor/StoryEditorShell.module.scss";

export type StoryEditorCanvasLayerProps = {
	packageId: string;
	selection: StoryEditorSelection | null;
	assetFloat: boolean;
	packageFloat: boolean;
	assets: AssetSummary[];
	characterAnchors: readonly CharacterAnchorNodeData[];
	onSelectionChange: (next: StoryEditorSelection | null) => void;
	onCharacterAnchorSelect: (anchor: CharacterAnchorNodeData | null) => void;
	onCanvasReady: (api: StoryCanvasStageApi) => void;
	onGraphMetaChange: (meta: StoryCanvasGraphMeta) => void;
	onToolModeChange: (state: DockToolModeState) => void;
	onApplyNodeData: (nodeId: string, next: EditorCallCardProjection) => void;
	onApplyChapterNodeData: (
		nodeId: string,
		next: EditorChapterNodeData,
	) => void;
	onAssignOwner: (
		nodeId: string,
		agentId: string,
		displayName: string,
	) => void;
	onRequestDeleteNode: (nodeId: string, displayName: string) => void;
	onAddCharacter: () => void;
	onCloseSelection: () => void;
	onCloseAssetFloat: () => void;
	onClosePackageFloat: () => void;
	onCreateAsset: () => void;
	onEditAsset: (asset: AssetSummary) => void;
	onRequestDeleteAsset: (assetId: string) => void;
};

export const StoryEditorCanvasLayer: FC<StoryEditorCanvasLayerProps> = function ({
	// packageId 是路由包键，用于包配置浮窗投影
	packageId,
	// selection 是当前画布选中，用于属性浮窗
	selection,
	// assetFloat 控制资源浮窗，用于底栏入口
	assetFloat,
	// packageFloat 控制包配置浮窗，用于底栏入口
	packageFloat,
	// assets 是会话内资源列表，用于资源浮窗
	assets,
	// characterAnchors 是归属 Select 选项
	characterAnchors,
	// onSelectionChange 同步选中态，用于属性浮窗
	onSelectionChange,
	// onCharacterAnchorSelect 选中角色锚点，用于打开编辑
	onCharacterAnchorSelect,
	// onCanvasReady 登记画布命令口，用于壳层写锚点
	onCanvasReady,
	// onGraphMetaChange 同步 chapter_end 禁用与归属列表
	onGraphMetaChange,
	// onToolModeChange 同步底栏高亮
	onToolModeChange,
	// onApplyNodeData 写回通话卡投影，用于属性保存
	onApplyNodeData,
	// onApplyChapterNodeData 写回章节投影，用于章节结束配置
	onApplyChapterNodeData,
	// onAssignOwner 即时写归属
	onAssignOwner,
	// onRequestDeleteNode 打开删除确认
	onRequestDeleteNode,
	// onAddCharacter 打开新建角色，用于画布入口
	onAddCharacter,
	// onCloseSelection 关闭属性浮窗
	onCloseSelection,
	// onCloseAssetFloat 关闭资源浮窗
	onCloseAssetFloat,
	// onClosePackageFloat 关闭包配置浮窗
	onClosePackageFloat,
	// onCreateAsset 打开资源新建
	onCreateAsset,
	// onEditAsset 打开资源编辑
	onEditAsset,
	// onRequestDeleteAsset 请求删除资源
	onRequestDeleteAsset,
}) {
	return (
		<div className={styles.canvasWrap}>
			{/* 引用了StoryCanvasStage组件，用于 React Flow 画布 */}
			<StoryCanvasStage
				onSelectionChange={onSelectionChange}
				onCharacterAnchorSelect={onCharacterAnchorSelect}
				onReady={onCanvasReady}
				onToolModeChange={onToolModeChange}
				onGraphMetaChange={onGraphMetaChange}
				onRequestDeleteNode={onRequestDeleteNode}
			/>
			{/* 引用了CanvasCharacterAddButton组件，用于新建角色入口 */}
			<CanvasCharacterAddButton onAdd={onAddCharacter} />
			{/* 引用了FloatingPanelShell组件，用于 CallCard / 章节属性浮窗 */}
			<FloatingPanelShell
				selection={selection}
				onClose={onCloseSelection}
				onApplyNodeData={onApplyNodeData}
				onApplyChapterNodeData={onApplyChapterNodeData}
				characterAnchors={characterAnchors}
				onAssignOwner={onAssignOwner}
			/>
			{/* 引用了AssetPickerFloat组件，用于资源引用浮窗 */}
			<AssetPickerFloat
				open={assetFloat}
				onClose={onCloseAssetFloat}
				assets={assets}
				onCreate={onCreateAsset}
				onEdit={onEditAsset}
				onRequestDelete={onRequestDeleteAsset}
			/>
			{/* 引用了PackageConfigFloat组件，用于包配置只读浮窗 */}
			<PackageConfigFloat
				packageId={packageId}
				open={packageFloat}
				onClose={onClosePackageFloat}
			/>
		</div>
	);
};
