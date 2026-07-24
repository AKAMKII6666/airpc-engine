/**
	* 故事编辑器域账本（Zustand）。
	* 切片：会话 / conf(bundle) / dirty / validation·save；只结果型 write。
	* 禁网络、禁 import bis / ajaxProxy / next/navigation（STRUCT-022）。
	* 画布高频 nodes/edges 不进本 store；经 applyCanvasFlushResult 写入 flushedGraph。
	* 灌账 / 保存编排在 LY-3～4 的 shell·feature bis；本文件不挂 UI。
	*/
import { create } from "zustand";
import {
	createStoryEditorSessionSlice,
	type StoryEditorStoreState,
} from "@studio-v2/src/stores/storyEditor/model/storyEditorStoreModel";
import { createStoryEditorLoadActions } from "@studio-v2/src/stores/storyEditor/writes/storyEditorStoreLoadWrites";
import { createStoryEditorMutateActions } from "@studio-v2/src/stores/storyEditor/writes/storyEditorStoreMutateWrites";

export type { StoryEditorStoreState } from "@studio-v2/src/stores/storyEditor/model/storyEditorStoreModel";
export { selectStoryEditorIsDirty } from "@studio-v2/src/stores/storyEditor/model/storyEditorStoreModel";

export const useStoryEditorStore = create<StoryEditorStoreState>((set) => ({
	...createStoryEditorSessionSlice(),
	refreshStamp: 0,
	...createStoryEditorLoadActions(set),
	...createStoryEditorMutateActions(set),
}));
