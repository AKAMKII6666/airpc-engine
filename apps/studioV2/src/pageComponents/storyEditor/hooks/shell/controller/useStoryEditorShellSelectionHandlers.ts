/**
	* 故事编辑器壳层选择态回调：角色锚点与画布 flush 编排。
	*/
"use client";

import { useCallback } from "react";
import type { CharacterAnchorNodeData } from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";
import type { StoryEditorSelection } from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";

export function useStoryEditorShellSelectionHandlers(input: {
	flushNow: () => void;
	onSelectionChangeBase: (next: StoryEditorSelection | null) => void;
	openEditForAnchor: (anchor: CharacterAnchorNodeData) => void | Promise<void>;
}) {
	const onCharacterAnchorSelect = useCallback(
		function (anchor: CharacterAnchorNodeData | null) {
			if (!anchor) return;
			void input.openEditForAnchor(anchor);
		},
		[input.openEditForAnchor],
	);

	const onSelectionChange = useCallback(
		function (next: StoryEditorSelection | null) {
			input.flushNow();
			input.onSelectionChangeBase(next);
		},
		[input.flushNow, input.onSelectionChangeBase],
	);

	return { onCharacterAnchorSelect, onSelectionChange };
}
