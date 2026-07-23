/**
	* 按 cardId 选中画布 CallCard 并打开属性浮窗（validate 错误定位用）。
	*/
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { Node } from "@xyflow/react";
import { readCallCardData } from "@studio-v2/src/bis/pageBis/storyEditor/role/roleConnection";
import { toStoryCanvasSelection } from "@studio-v2/src/pageComponents/storyEditor/canvas/storyCanvasSelection";
import type { StoryEditorSelection } from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";

export type CreateSelectCallCardByCardIdArgs = {
	nodesRef: MutableRefObject<Node[]>;
	selectedIdRef: MutableRefObject<string | null>;
	setNodes: Dispatch<SetStateAction<Node[]>>;
	/** 定位时打开属性浮窗 */
	onOpenPropertyPanel: (selection: StoryEditorSelection | null) => void;
};

/**
	* 构造 selectCallCardByCardId；找不到卡返回 false。
	* 选中后同步 selected 标志并打开属性浮窗。
	*/
export function createSelectCallCardByCardId(
	args: CreateSelectCallCardByCardIdArgs,
): (cardId: string) => boolean {
	const { nodesRef, selectedIdRef, setNodes, onOpenPropertyPanel } = args;
	return function selectCallCardByCardId(cardId: string): boolean {
		const target = cardId.trim();
		if (target === "") return false;
		const node = nodesRef.current.find(function (n) {
			const card = readCallCardData(n);
			return card?.cardId === target;
		});
		if (!node) return false;
		selectedIdRef.current = node.id;
		setNodes(function (prev) {
			return prev.map(function (n) {
				return { ...n, selected: n.id === node.id };
			});
		});
		onOpenPropertyPanel(toStoryCanvasSelection(node));
		return true;
	};
}
