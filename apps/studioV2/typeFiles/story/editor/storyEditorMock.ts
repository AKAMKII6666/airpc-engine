/**
	* 故事编辑器静态画布图数据与角色锚点投影。
	* 仅 UI 投影；不接保存事务 / Host；不做泳道布局。
	*/
import type {
	EditorCallCardProjection,
	EditorChapterNodeData,
} from "@studio-v2/typeFiles/story/editor/editorCallCardProjection";

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
} from "@studio-v2/typeFiles/story/editor/editorCallCardProjection";
export { exitCountFromProjection } from "@studio-v2/typeFiles/story/editor/editorCallCardProjection";
export {
	cardKindLabel,
	entryModeLabel,
	exitKindLabel,
	interactionModeLabel,
} from "@studio-v2/typeFiles/story/callCardLabels";

/** 画布角色锚点种子投影；用于 CanvasMockGraph 初始节点 */
export type EditorCharacterAnchor = {
	/** 角色系统键；主界面用 displayName，不手填 */
	agentId: string;
	/** 人类可读角色名 */
	displayName: string;
	/** 锚点状态人话（自由 / 待呼入 / 延迟外呼等） */
	statusLabel: string;
	/** 当前挂在该角色上的卡数量；0 表示无挂卡 */
	pendingCardCount: number;
	/** 是否与当前选中卡同角色，用于高亮归属线示意 */
	relatedToSelection: boolean;
};

/**
	* 画布内角色锚点节点 data。
	* 供 role handle 连线；选中后打开角色库同款编辑 FormModal。
	*/
export type CharacterAnchorNodeData = {
	/** 角色系统键；与角色库 agentId 对齐 */
	agentId: string;
	/** 人类可读角色名；同步到 CallCard ownerDisplayName */
	displayName: string;
	/** 锚点状态人话；仅 UI 展示 */
	statusLabel: string;
	/** 当前挂在该角色上的卡数量；0 表示无挂卡 */
	pendingCardCount: number;
};

/**
	* 属性浮窗：选中通话卡。
	* patch 只改会话内节点 data，不写盘。
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
	* chapter_end 可配下一包 / 起点卡；仅会话 mock。
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
	* null 表示浮窗收起；CallCard 或章节；patch 只改会话内节点 data，不写盘。
	*/
export type StoryEditorSelection =
	| StoryEditorCallCardSelection
	| StoryEditorChapterSelection;

/**
	* 画布初始锚点 mock；agentId 对齐 data/characters，便于点选编辑落盘。
	* 顺序即画布从上到下。
	*/
export const MOCK_EDITOR_CHARACTERS: readonly EditorCharacterAnchor[] = [
	{
		agentId: "doubao-sister",
		displayName: "澜星",
		statusLabel: "有待呼入卡",
		pendingCardCount: 2,
		relatedToSelection: true,
	},
	{
		agentId: "xiaoyu",
		displayName: "小雨",
		statusLabel: "延迟外呼中",
		pendingCardCount: 1,
		relatedToSelection: false,
	},
];
