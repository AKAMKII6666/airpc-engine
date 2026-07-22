/**
	* 故事画布壳层命令口类型。
	* 与 React Flow 舞台解耦，避免类型循环依赖。
	*/
import type { Edge, Node } from "@xyflow/react";
import type {
	EditorCallCardProjection,
	EditorChapterNodeData,
	CharacterAnchorNodeData,
} from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";
import type {
	DockPlacementKind,
	DockToolMode,
	DockToolModeState,
} from "@studio-v2/typeFiles/story/editor/dock/dockToolMode";

/** 壳层调用的画布命令；仅会话内 mutate */
export type StoryCanvasStageApi = {
	applyNodeData: (nodeId: string, next: EditorCallCardProjection) => void;
	/**
		* 写回章节节点投影（含 chapter_end 下一包配置）。
		* 仅会话 mock；不写盘。
		*/
	applyChapterNodeData: (
		nodeId: string,
		next: EditorChapterNodeData,
	) => void;
	/**
		* 将选中 CallCard 归属到指定角色；同步 ownerDisplayName / ownerAgentId / role 边。
		* 无选中或非 callCard 时 no-op。
		*/
	assignCharacterToSelection: (
		agentId: string,
		displayName: string,
	) => void;
	/**
		* 按 nodeId 写归属；agentId 空串则清空归属并拆 role 边。
		* 与属性窗 Select 双向同步；仅会话 mock。
		*/
	assignOwnerToCallCard: (
		nodeId: string,
		agentId: string,
		displayName: string,
	) => void;
	/**
		* 删除节点及关联边；若删的是当前选中则清空 selection。
		* 仅会话 mock；不写盘。
		*/
	removeNode: (nodeId: string) => void;
	/** 画布是否已有 chapter_end（底栏禁用） */
	hasChapterEnd: () => boolean;
	/** 当前角色锚点列表；供归属 Select */
	listCharacterAnchors: () => CharacterAnchorNodeData[];
	/**
		* 在画布左侧追加角色锚点节点。
		* agentId 重复时 no-op。
		*/
	addCharacterAnchor: (anchor: CharacterAnchorNodeData) => void;
	/**
		* 按 agentId 更新已有锚点，并同步同角色 CallCard 的 ownerDisplayName。
		* 找不到锚点时 no-op。
		*/
	updateCharacterAnchor: (anchor: CharacterAnchorNodeData) => void;
	/**
		* 切换底栏 toolMode；select/placement 互斥；idle 为平移。
		* placement 须带 placementKind，否则回 idle。
		*/
	setToolMode: (
		mode: DockToolMode,
		placementKind?: DockPlacementKind | null,
	) => void;
	/** 读取当前 toolMode 快照；供底栏点击归约 */
	getToolMode: () => DockToolModeState;
	/**
		* 瞬时适配视图；不改变持久 toolMode。
		* 对应底栏 fit icon。
		*/
	fitView: () => void;
	/**
		* 在 flow 坐标放置节点：工厂生成 id → 追加 → 选中 → 回 idle。
		* CallCard / chapter_end 开属性浮窗；action / commentGroup 仅选中不进 CallCard 投影。
		*/
	addNodeAt: (
		kind: DockPlacementKind,
		position: { x: number; y: number },
	) => void;
	/** 保存用：当前 nodes/edges 快照（浅拷贝数组） */
	getGraphSnapshot: () => { nodes: Node[]; edges: Edge[] };
};
