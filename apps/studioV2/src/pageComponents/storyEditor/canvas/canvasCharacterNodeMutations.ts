/**
	* 画布角色锚点节点 mutate 纯函数：追加锚点 / 同步显示名。
	* 从 useStoryCanvasGraph 拆出以控制单函数行数；不写盘。
	*/
import type { Node } from "@xyflow/react";
import { syncCallCardCharacterName } from "@studio-v2/src/bis/pageBis/storyEditor/canvas/canvasCharacterAnchor";
import {
	readCallCardData,
	readCharacterAnchorData,
} from "@studio-v2/src/bis/pageBis/storyEditor/role/roleConnection";
import type { CharacterAnchorNodeData } from "@studio-v2/typeFiles/story/editor/storyEditorMock";

/**
* 追加角色锚点节点；agentId 已存在时返回原数组。
* 新节点纵坐标取现有锚点最大 Y + 120。
*/
export function appendCharacterAnchorNode(
	prev: Node[],
	anchor: CharacterAnchorNodeData,
): Node[] {
	if (prev.some((node) => node.id === `anchor_${anchor.agentId}`)) {
		return prev;
	}
	const anchorNodes = prev.filter((node) => node.type === "characterAnchor");
	const maxY = anchorNodes.reduce(
		(max, node) => Math.max(max, node.position.y),
		40,
	);
	const nextNode: Node = {
		id: `anchor_${anchor.agentId}`,
		type: "characterAnchor",
		position: { x: -40, y: maxY + 120 },
		data: anchor,
		draggable: false,
		selectable: true,
	};
	return [...prev, nextNode];
}

/**
* 按 agentId 更新锚点 data，并同步同角色 CallCard 的 ownerDisplayName。
*/
export function mapNodesForCharacterAnchorUpdate(
	prev: Node[],
	anchor: CharacterAnchorNodeData,
): Node[] {
	return prev.map((node) => {
		if (node.type === "characterAnchor") {
			const data = readCharacterAnchorData(node);
			if (data?.agentId === anchor.agentId) {
				return { ...node, data: anchor };
			}
			return node;
		}
		if (node.type === "callCard") {
			const card = readCallCardData(node);
			if (!card) return node;
			const next = syncCallCardCharacterName(
				card,
				anchor.agentId,
				anchor.displayName,
			);
			if (next === card) return node;
			return { ...node, data: next };
		}
		return node;
	});
}
