/**
	* 故事编辑器画布叠层：舞台 + 角色入口 + 属性/资源/包浮窗。
	* 打开真源为磁盘整包；保存由顶栏触发写回。
	*/
"use client";

import type { FC } from "react";
import type { FactMeta, StoryPackageMeta } from "@studio-v2/typeFiles/story/callCard/engineCallCard";
import type { EditorGraphSeed } from "@studio-v2/src/bis/pageBis/storyEditor/package/graph/diskBundleGraph";
import type { ChapterPackageDiskContext } from "@studio-v2/src/bis/pageBis/storyEditor/form/chapter/chapterPropertyForm";
import { FloatingPanelShell } from "@studio-v2/src/pageComponents/storyEditor/FloatingPanelShell";
import { AssetPickerFloat } from "@studio-v2/src/pageComponents/storyEditor/library/AssetPickerFloat";
import { PackageConfigFloat } from "@studio-v2/src/pageComponents/storyEditor/library/package/PackageConfigFloat";
// 引用了CanvasCharacterAddButton组件，用于画布添加角色入口
import { CanvasCharacterAddButton } from "@studio-v2/src/pageComponents/storyEditor/com/character/CanvasCharacterAddButton";
import { StoryCanvasStage } from "@studio-v2/src/pageComponents/storyEditor/canvas/StoryCanvasStage";
import type { StoryCanvasStageApi } from "@studio-v2/src/pageComponents/storyEditor/canvas/storyCanvasTypes";
import type { StoryCanvasGraphMeta } from "@studio-v2/src/pageComponents/storyEditor/canvas/useStoryCanvasGraph";
import type { AssetSummary } from "@studio-v2/typeFiles/library/assets/assetSummary";
import type { CallCardLabelOption } from "@studio-v2/typeFiles/story/callCardLabels";
import type { EffectPanelSources } from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
import type { DockToolModeState } from "@studio-v2/typeFiles/story/editor/dock/dockToolMode";
import type {
	CharacterAnchorNodeData,
	EditorCallCardProjection,
	EditorChapterNodeData,
	StoryEditorSelection,
} from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";
import type { DiskStoryPackageBundle } from "@studio-v2/typeFiles/story/package/diskStoryPackage";
import styles from "@studio-v2/src/pageComponents/storyEditor/StoryEditorShell.module.scss";

export type StoryEditorCanvasLayerProps = {
	packageId: string;
	graphSeed: EditorGraphSeed;
	bundle: DiskStoryPackageBundle;
	selection: StoryEditorSelection | null;
	/** 属性浮窗是否打开（单击选中不自动开） */
	propertyPanelOpen: boolean;
	assetFloat: boolean;
	packageFloat: boolean;
	assets: AssetSummary[];
	characterAnchors: readonly CharacterAnchorNodeData[];
	effectPanelSources: EffectPanelSources;
	chapterDiskCtx: ChapterPackageDiskContext;
	chapterPackageOptions: readonly CallCardLabelOption[];
	onSelectionChange: (next: StoryEditorSelection | null) => void;
	onOpenPropertyPanel: (next: StoryEditorSelection | null) => void;
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
	/** 入口卡 Select 候选；画布 CallCard 优先 */
	entryCardOptions: readonly CallCardLabelOption[];
	/** 包配置入口卡写回 */
	onEntryCardIdChange: (cardId: string) => void;
	/** 包级 assetRefs 多选写回；选项与 effectPanelSources.clips 同源 */
	onAssetRefsChange: (assetRefs: readonly string[]) => void;
	/** worldFacts JSON 块写回 */
	onWorldFactsChange: (worldFacts: readonly FactMeta[] | undefined) => void;
	/** meta JSON 块写回 */
	onPackageMetaChange: (meta: StoryPackageMeta | undefined) => void;
	/** 资源浮窗是否可回填当前卡 playbackClipId */
	canUseAsPlaybackClip: boolean;
	/** 资源浮窗回填当前卡 playbackClipId */
	onUseAsPlaybackClip: (assetId: string) => void;
};

export const StoryEditorCanvasLayer: FC<StoryEditorCanvasLayerProps> = function ({
	// packageId 是路由包键；属性浮窗首通预览与包配置共用
	packageId,
	// graphSeed 是磁盘打开的初始画布
	graphSeed,
	// bundle 是当前整包，用于包配置投影
	bundle,
	// selection 是当前画布选中，用于属性浮窗数据源
	selection,
	// propertyPanelOpen 表示属性浮窗是否打开，用于条件渲染 FloatingPanel
	propertyPanelOpen,
	// assetFloat 控制资源浮窗，用于底栏入口
	assetFloat,
	// packageFloat 控制包配置浮窗，用于底栏入口
	packageFloat,
	// assets 是磁盘资源列表，用于资源浮窗
	assets,
	// characterAnchors 是归属 Select 选项
	characterAnchors,
	// effectPanelSources 是 Effect id 下拉候选源，用于属性浮窗出口列表
	effectPanelSources,
	// chapterDiskCtx 是 chapter_end 下一包/卡下拉的磁盘索引
	chapterDiskCtx,
	// chapterPackageOptions 是下一故事包 Select 选项
	chapterPackageOptions,
	// onSelectionChange 同步单击选中态
	onSelectionChange,
	// onOpenPropertyPanel 是双击回调，用于打开属性浮窗
	onOpenPropertyPanel,
	// onCharacterAnchorSelect 选中角色锚点，用于打开编辑
	onCharacterAnchorSelect,
	// onCanvasReady 登记画布命令口，用于壳层写锚点与保存快照
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
	// entryCardOptions 是入口卡 Select 候选
	entryCardOptions,
	// onEntryCardIdChange 是入口卡写回会话
	onEntryCardIdChange,
	// onAssetRefsChange 是包级 assetRefs 写回会话
	onAssetRefsChange,
	// onWorldFactsChange 是 worldFacts 写回会话
	onWorldFactsChange,
	// onPackageMetaChange 是 meta 写回会话
	onPackageMetaChange,
	// canUseAsPlaybackClip 控制资源浮窗回填按钮
	canUseAsPlaybackClip,
	// onUseAsPlaybackClip 回填当前卡 playbackClipId
	onUseAsPlaybackClip,
}) {
	return (
		<div className={styles.canvasWrap}>
			{/* 引用了StoryCanvasStage组件，用于 React Flow 画布 */}
			<StoryCanvasStage
				graphSeed={graphSeed}
				onSelectionChange={onSelectionChange}
				onOpenPropertyPanel={onOpenPropertyPanel}
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
				packageId={packageId}
				selection={propertyPanelOpen ? selection : null}
				onClose={onCloseSelection}
				onApplyNodeData={onApplyNodeData}
				onApplyChapterNodeData={onApplyChapterNodeData}
				characterAnchors={characterAnchors}
				effectPanelSources={effectPanelSources}
				chapterDiskCtx={chapterDiskCtx}
				chapterPackageOptions={chapterPackageOptions}
				onAssignOwner={onAssignOwner}
			/>
			{/* 引用了AssetPickerFloat组件，用于资源引用浮窗与 playbackClipId 回填 */}
			<AssetPickerFloat
				open={assetFloat}
				onClose={onCloseAssetFloat}
				assets={assets}
				onCreate={onCreateAsset}
				onEdit={onEditAsset}
				onRequestDelete={onRequestDeleteAsset}
				canUseAsPlaybackClip={canUseAsPlaybackClip}
				onUseAsPlaybackClip={onUseAsPlaybackClip}
			/>
			{/* 引用了PackageConfigFloat组件，用于包配置（入口卡 + assetRefs + meta） */}
			<PackageConfigFloat
				bundle={bundle}
				entryCardOptions={entryCardOptions}
				assetOptions={effectPanelSources.clips}
				open={packageFloat}
				onClose={onClosePackageFloat}
				onEntryCardIdChange={onEntryCardIdChange}
				onAssetRefsChange={onAssetRefsChange}
				onWorldFactsChange={onWorldFactsChange}
				onPackageMetaChange={onPackageMetaChange}
			/>
		</div>
	);
};
