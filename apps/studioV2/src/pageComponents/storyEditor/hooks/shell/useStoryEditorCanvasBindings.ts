/**
	* 壳层画布写回与图元元数据：从 useStoryEditorShellController 拆出。
	* 结构变更 scheduleFlush；属性/归属写回后 sync flush。
	*/
"use client";

import { useCallback, useState, type MutableRefObject } from "react";
import type { StoryCanvasStageApi } from "@studio-v2/src/pageComponents/storyEditor/canvas/storyCanvasTypes";
import type { StoryCanvasGraphMeta } from "@studio-v2/src/pageComponents/storyEditor/canvas/useStoryCanvasGraph";
import type {
	CharacterAnchorNodeData,
	EditorCallCardProjection,
	EditorChapterNodeData,
} from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";

type CanvasFlushFns = {
	/** 同步 flush；画布 ready / 属性提交 / 切选中 */
	flushNow: () => boolean;
	/** 结构变更节流 flush */
	scheduleFlush: () => void;
};

export function useStoryEditorCanvasBindings(
	canvasApiRef: MutableRefObject<StoryCanvasStageApi | null>,
	flush: CanvasFlushFns,
) {
	const [chapterEndDisabled, setChapterEndDisabled] = useState(true);
	const [characterAnchors, setCharacterAnchors] = useState<
		CharacterAnchorNodeData[]
	>([]);
	// 画布 CallCard 投影快照；供 Effect 面板卡下拉候选，随 graph meta 刷新
	const [callCards, setCallCards] = useState<EditorCallCardProjection[]>([]);

	const onCanvasReady = useCallback(
		function (api: StoryCanvasStageApi) {
			canvasApiRef.current = api;
			setChapterEndDisabled(api.hasChapterEnd());
			setCharacterAnchors(api.listCharacterAnchors());
			// 首屏灌 flushedGraph；相对 seed 无变更则不抬 dirty
			flush.flushNow();
		},
		[canvasApiRef, flush],
	);

	const onGraphMetaChange = useCallback(
		function (meta: StoryCanvasGraphMeta) {
			setChapterEndDisabled(meta.hasChapterEnd);
			setCharacterAnchors(meta.characterAnchors);
			setCallCards(meta.callCards);
			flush.scheduleFlush();
		},
		[flush],
	);

	const onApplyNodeData = useCallback(
		function (nodeId: string, next: EditorCallCardProjection) {
			canvasApiRef.current?.applyNodeData(nodeId, next);
			flush.flushNow();
		},
		[canvasApiRef, flush],
	);

	const onApplyChapterNodeData = useCallback(
		function (nodeId: string, next: EditorChapterNodeData) {
			canvasApiRef.current?.applyChapterNodeData(nodeId, next);
			flush.flushNow();
		},
		[canvasApiRef, flush],
	);

	const onAssignOwner = useCallback(
		function (nodeId: string, agentId: string, displayName: string) {
			canvasApiRef.current?.assignOwnerToCallCard(
				nodeId,
				agentId,
				displayName,
			);
			flush.flushNow();
		},
		[canvasApiRef, flush],
	);

	return {
		chapterEndDisabled,
		characterAnchors,
		callCards,
		onCanvasReady,
		onGraphMetaChange,
		onApplyNodeData,
		onApplyChapterNodeData,
		onAssignOwner,
	};
}
