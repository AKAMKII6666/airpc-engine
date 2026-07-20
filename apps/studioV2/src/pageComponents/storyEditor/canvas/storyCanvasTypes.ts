/**
	* 故事画布壳层命令口类型。
	* 与 React Flow 舞台解耦，避免类型循环依赖。
	*/
import type {
	EditorCallCardProjection,
	EditorChapterNodeData,
	CharacterAnchorNodeData,
} from "@studio-v2/typeFiles/story/editor/storyEditorMock";

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
		* 在画布左侧追加角色锚点节点。
		* agentId 重复时 no-op。
		*/
	addCharacterAnchor: (anchor: CharacterAnchorNodeData) => void;
	/**
		* 按 agentId 更新已有锚点，并同步同角色 CallCard 的 ownerDisplayName。
		* 找不到锚点时 no-op。
		*/
	updateCharacterAnchor: (anchor: CharacterAnchorNodeData) => void;
};
