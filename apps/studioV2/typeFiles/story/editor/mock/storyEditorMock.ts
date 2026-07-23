/**
	* 故事编辑器会话投影类型聚合；画布图真源为磁盘整包（diskBundleGraph）。
	* 属性浮窗改动画布节点 data，经顶栏整包保存写回 cards/layout。
	*/
import type {
	EditorCallCardProjection,
	EditorChapterNodeData,
} from "@studio-v2/typeFiles/story/editor/callCard/editorCallCardProjection";

export type {
	EditorCallCardContextProjection,
	EditorCallCardExitProjection,
	EditorCallCardProjection,
	EditorChapterKind,
	EditorChapterNodeData,
	EditorEntryMode,
	EditorExitKind,
	EditorInteractionMode,
	EditorNodeValidationBadge,
	EditorScheduleMetaProjection,
	EditorToolPolicyProjection,
} from "@studio-v2/typeFiles/story/editor/callCard/editorCallCardProjection";
export type {
	EditorActionNodeData,
	EditorCommentGroupNodeData,
} from "@studio-v2/typeFiles/story/editor/mock/editorLightweightNodes";
export { exitCountFromProjection } from "@studio-v2/typeFiles/story/editor/callCard/editorCallCardProjection";
export {
	cardKindLabel,
	entryModeLabel,
	exitKindLabel,
	interactionModeLabel,
} from "@studio-v2/typeFiles/story/callCardLabels";

/**
	* 画布内角色锚点节点 data。
	* 打开时由角色库全量（/api/characters）+ 本包挂卡统计生成；pendingCardCount=0 可灰显；选中后打开角色库同款 FormModal。
	*/
export type CharacterAnchorNodeData = {
	/** 角色系统键；与 data/characters agentId 对齐 */
	agentId: string;
	/** 人类可读角色名；来自 /api/characters，同步到 CallCard ownerDisplayName */
	displayName: string;
	/** 锚点状态人话：有卡「本包 · N 卡」，无「本章未挂卡」 */
	statusLabel: string;
	/** 当前挂在该角色上的本包卡数量；0 表示未挂卡（UI 灰显） */
	pendingCardCount: number;
};

/**
	* 属性浮窗：选中通话卡。
	* 提交写回会话图节点 data；整包保存时落盘 cards。
	*/
export type StoryEditorCallCardSelection = {
	/** 判别：通话卡属性浮窗 */
	selectionKind: "callCard";
	/** 画布内 React Flow 节点 id */
	nodeId: string;
	/** 选中 CallCard 的可编辑投影；与 FloatingPanelShell Formik 对齐 */
	data: EditorCallCardProjection;
};

/**
	* 属性浮窗：选中章节起止节点。
	* chapter_end 可配下一包 / 起点卡；保存时写回 layout 节点字段。
	*/
export type StoryEditorChapterSelection = {
	/** 判别：章节属性浮窗 */
	selectionKind: "chapter";
	/** 画布内 React Flow 节点 id */
	nodeId: string;
	/** 章节节点投影；与 ChapterPropertyForm 对齐 */
	data: EditorChapterNodeData;
};

/**
	* 属性浮窗当前选中投影。
	* null 表示浮窗收起；CallCard 或章节；patch 写会话图，保存时落盘。
	*/
export type StoryEditorSelection =
	| StoryEditorCallCardSelection
	| StoryEditorChapterSelection;
