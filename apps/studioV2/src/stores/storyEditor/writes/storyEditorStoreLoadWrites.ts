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

const emptySlice = createStoryEditorSessionSlice();

/** 打开失败：清空业务切片，保留失败包/章定位 */
function packageLoadFailurePatch(
	result: Extract<StoryEditorLoadResult, { ok: false }>,
): Partial<StoryEditorStoreState> {
	return {
		packageId: result.packageId.trim(),
		chapterId: result.chapterId?.trim() ?? "",
		loading: false,
		loadError: result.message,
		bundle: null,
		graphSeed: null,
		flushedGraph: null,
		canvasPendingFlush: false,
		confDirty: false,
		graphDirty: false,
		diskPackages: [],
		cardIndex: emptySlice.cardIndex,
		entryCardIdByChapter: emptySlice.entryCardIdByChapter,
		chapterSummaries: [],
	};
}

/** 打开成功：灌 bundle / 索引 / 章摘要并清 dirty·save */
function packageLoadSuccessPatch(
	result: Extract<StoryEditorLoadResult, { ok: true }>,
): Partial<StoryEditorStoreState> {
	return {
		packageId: result.packageId.trim(),
		chapterId: result.chapterId.trim(),
		loading: false,
		loadError: undefined,
		diskPackages: [...result.diskPackages],
		bundle: result.bundle,
		graphSeed: result.graphSeed,
		cardIndex: { ...result.cardIndex },
		entryCardIdByChapter: { ...result.entryCardIdByChapter },
		chapterSummaries: [...result.chapterSummaries],
		flushedGraph: null,
		canvasPendingFlush: false,
		confDirty: false,
		graphDirty: false,
		savePhase: "idle",
		saveError: undefined,
		saveValidation: null,
	};
}

/** 打开包开始 / 结果 */
function createStoryEditorPackageLoadActions(
	set: StoryEditorSet,
): Pick<
	StoryEditorStoreState,
	"applyPackageLoadStarted" | "applyPackageLoadResult"
> {
	return {
		applyPackageLoadStarted(packageId, chapterId) {
			set({
				packageId: packageId.trim(),
				chapterId: chapterId.trim(),
				loading: true,
				loadError: undefined,
				savePhase: "idle",
				saveError: undefined,
				saveValidation: null,
			});
		},

		applyPackageLoadResult(result: StoryEditorLoadResult) {
			if (!result.ok) {
				set(packageLoadFailurePatch(result));
				return;
			}
			set(packageLoadSuccessPatch(result));
		},
	};
}

/** stamp / reset */
function createStoryEditorSessionStampActions(
	set: StoryEditorSet,
): Pick<
	StoryEditorStoreState,
	"bumpStoryEditorRefreshStamp" | "resetStoryEditorSession"
> {
	return {
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
		...createStoryEditorPackageLoadActions(set),
		...createStoryEditorSessionStampActions(set),
	};
}
