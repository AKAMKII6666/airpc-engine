/**
	* 画布选中投影与 onReady 注册；从 useStoryCanvasGraph 拆出以控 hook 行数。
	*/
import { useCallback, useEffect, useRef, type MutableRefObject } from "react";
import type { Node, OnSelectionChangeParams } from "@xyflow/react";
import {
	readCallCardData,
	readChapterNodeData,
	readCharacterAnchorData,
} from "@studio-v2/src/bis/pageBis/storyEditor/role/roleConnection";
import type {
	CharacterAnchorNodeData,
	StoryEditorSelection,
} from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";
import type { StoryCanvasStageApi } from "@studio-v2/src/pageComponents/storyEditor/canvas/storyCanvasTypes";

/** 将 RF 节点投影为属性浮窗选中；CallCard 或章节，其它返回 null */
export function toStoryCanvasSelection(
	node: Node | undefined,
): StoryEditorSelection | null {
	if (!node) return null;
	const card = readCallCardData(node);
	if (card) {
		return { selectionKind: "callCard", nodeId: node.id, data: card };
	}
	const chapter = readChapterNodeData(node);
	if (chapter) {
		return { selectionKind: "chapter", nodeId: node.id, data: chapter };
	}
	return null;
}

export function useStoryCanvasSelection(args: {
	onSelectionChange: (selection: StoryEditorSelection | null) => void;
	onCharacterAnchorSelect: (anchor: CharacterAnchorNodeData | null) => void;
	initialSelection: StoryEditorSelection | null;
	/** 与归属命令共享的选中节点 id；选中变化时同步写入 */
	selectedIdRef: MutableRefObject<string | null>;
}) {
	const {
		onSelectionChange,
		onCharacterAnchorSelect,
		initialSelection,
		selectedIdRef,
	} = args;
	const seededRef = useRef(false);

	useEffect(() => {
		if (seededRef.current) return;
		seededRef.current = true;
		onSelectionChange(initialSelection);
	}, [initialSelection, onSelectionChange]);

	return useCallback(
		(params: OnSelectionChangeParams) => {
			// 框选多卡仅用于整体挪位置，不做批量编辑，也不弹属性面板；
			// 只有恰好单选时才投影为属性浮窗选中，避免多选竞态读到不完整 values。
			const node = params.nodes.length === 1 ? params.nodes[0] : undefined;
			selectedIdRef.current = node?.id ?? null;
			const anchor = readCharacterAnchorData(node);
			if (anchor) {
				onSelectionChange(null);
				onCharacterAnchorSelect(anchor);
				return;
			}
			onCharacterAnchorSelect(null);
			onSelectionChange(toStoryCanvasSelection(node));
		},
		[onCharacterAnchorSelect, onSelectionChange, selectedIdRef],
	);
}

export function useRegisterStoryCanvasApi(
	api: StoryCanvasStageApi,
	onReady: (next: StoryCanvasStageApi) => void,
): void {
	useEffect(() => {
		onReady(api);
	}, [api, onReady]);
}
