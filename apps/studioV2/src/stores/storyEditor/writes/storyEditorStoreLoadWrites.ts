/**
	* storyEditor 打开包 / refresh 相关结果型 write。
	*/
import type { StoreApi } from "zustand";
import type { StoryEditorLoadResult } from "@studio-v2/typeFiles/story/editor/store/storyEditorStoreState";
import {
	createStoryEditorSessionSlice,
	type StoryEditorStoreState,
} from "@studio-v2/src/stores/storyEditor/model/storyEditorStoreModel";

type StoryEditorSet = StoreApi<StoryEditorStoreState>["setState"];

const emptyCardIndex = createStoryEditorSessionSlice().cardIndex;
const emptyEntryByPackage = createStoryEditorSessionSlice().entryCardIdByPackage;

/** 打开包开始 / 结果 / stamp / reset */
export function createStoryEditorLoadActions(
	set: StoryEditorSet,
): Pick<
	StoryEditorStoreState,
	| "applyPackageLoadStarted"
	| "applyPackageLoadResult"
	| "bumpStoryEditorRefreshStamp"
	| "resetStoryEditorSession"
> {
	return {
		applyPackageLoadStarted(packageId) {
			set({
				packageId: packageId.trim(),
				loading: true,
				loadError: undefined,
				savePhase: "idle",
				saveError: undefined,
				saveValidation: null,
			});
		},

		applyPackageLoadResult(result: StoryEditorLoadResult) {
			if (!result.ok) {
				set({
					packageId: result.packageId.trim(),
					loading: false,
					loadError: result.message,
					bundle: null,
					graphSeed: null,
					flushedGraph: null,
					canvasPendingFlush: false,
					confDirty: false,
					graphDirty: false,
					diskPackages: [],
					cardIndex: emptyCardIndex,
					entryCardIdByPackage: emptyEntryByPackage,
				});
				return;
			}
			set({
				packageId: result.packageId.trim(),
				loading: false,
				loadError: undefined,
				diskPackages: [...result.diskPackages],
				bundle: result.bundle,
				graphSeed: result.graphSeed,
				cardIndex: { ...result.cardIndex },
				entryCardIdByPackage: { ...result.entryCardIdByPackage },
				flushedGraph: null,
				canvasPendingFlush: false,
				confDirty: false,
				graphDirty: false,
				savePhase: "idle",
				saveError: undefined,
				saveValidation: null,
			});
		},

		bumpStoryEditorRefreshStamp() {
			set(function (prev) {
				return { refreshStamp: prev.refreshStamp + 1 };
			});
		},

		resetStoryEditorSession() {
			set(function (prev) {
				return {
					...createStoryEditorSessionSlice(),
					refreshStamp: prev.refreshStamp,
				};
			});
		},
	};
}
