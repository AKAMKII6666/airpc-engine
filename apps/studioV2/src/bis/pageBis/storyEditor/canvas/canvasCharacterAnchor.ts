/**
	* 画布角色锚点与角色库投影的会话内同步助手。
	* 落盘经 characters bis；本文件不写 storis-packages。
	*/
import type {
	CharacterAnchorNodeData,
	EditorCallCardProjection,
} from "@studio-v2/typeFiles/story/editor/storyEditorMock";
import type { CharacterSummary } from "@studio-v2/typeFiles/library/characters/form/characterSummary";

/**
	* 由角色库 Summary 生成画布锚点 data；新建落盘后挂到画布。
	*/
export function characterSummaryToAnchorData(
	summary: CharacterSummary,
): CharacterAnchorNodeData {
	return {
		agentId: summary.agentId,
		displayName: summary.displayName,
		statusLabel: "待挂卡",
		pendingCardCount: 0,
	};
}

/**
	* 编辑落盘后同步锚点显示名；挂卡数与状态标签保留会话值。
	*/
export function patchAnchorDisplayName(
	previous: CharacterAnchorNodeData,
	summary: CharacterSummary,
): CharacterAnchorNodeData {
	return {
		...previous,
		agentId: summary.agentId,
		displayName: summary.displayName,
	};
}

/**
	* 角色显示名变更后，同步本会话内同 ownerAgentId 的 CallCard 归属投影。
	*/
export function syncCallCardCharacterName(
	data: EditorCallCardProjection,
	agentId: string,
	displayName: string,
): EditorCallCardProjection {
	if (data.ownerAgentId !== agentId) return data;
	return {
		...data,
		ownerDisplayName: displayName,
	};
}
