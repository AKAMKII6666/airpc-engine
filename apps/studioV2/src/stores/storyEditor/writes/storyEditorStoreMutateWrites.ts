/**
	* storyEditor conf / flush / save / dirty 结果型 write。
	*/
import type { StoreApi } from "zustand";
import type { DiskStoryPackageBundle } from "@studio-v2/typeFiles/story/package/diskStoryPackage";
import type {
	StoryEditorFlushedGraph,
	StoryEditorSaveFailurePayload,
	StoryEditorSaveSuccessPayload,
} from "@studio-v2/typeFiles/story/editor/store/storyEditorStoreState";
import type { StoryEditorStoreState } from "@studio-v2/src/stores/storyEditor/model/storyEditorStoreModel";

type StoryEditorSet = StoreApi<StoryEditorStoreState>["setState"];

/** 入口卡变更时同步 entryCardIdByPackage；空串不写 */
function withEntryCardSync(
	prev: StoryEditorStoreState,
	bundle: DiskStoryPackageBundle,
): Record<string, string> {
	const entry = bundle.conf.entryCardId?.trim() ?? "";
	if (entry === "") return prev.entryCardIdByPackage;
	return {
		...prev.entryCardIdByPackage,
		[bundle.conf.packageId]: entry,
	};
}

/**
	* 业务图结构是否同构（序列化比较）。
	* 用于 flush：相对上次 flush / seed 无变更则不抬 graphDirty。
	*/
function flushedGraphEqual(
	left: StoryEditorFlushedGraph | null,
	right: StoryEditorFlushedGraph,
): boolean {
	if (!left) return false;
	return (
		JSON.stringify(left.nodes) === JSON.stringify(right.nodes) &&
		JSON.stringify(left.edges) === JSON.stringify(right.edges)
	);
}

/** flush 对比基线：优先上次 flush，否则打开 seed */
function flushBaseline(
	prev: StoryEditorStoreState,
): StoryEditorFlushedGraph | null {
	if (prev.flushedGraph) return prev.flushedGraph;
	if (!prev.graphSeed) return null;
	return {
		nodes: prev.graphSeed.nodes,
		edges: prev.graphSeed.edges,
	};
}

/** conf 写回、画布 flush、保存相位 */
export function createStoryEditorMutateActions(
	set: StoryEditorSet,
): Pick<
	StoryEditorStoreState,
	| "applyBundleWriteResult"
	| "applyCanvasFlushResult"
	| "markCanvasPendingFlush"
	| "applySaveStarted"
	| "applySaveSuccess"
	| "applySaveFailure"
	| "clearSaveValidation"
> {
	return {
		applyBundleWriteResult(bundle: DiskStoryPackageBundle) {
			set(function (prev) {
				return {
					bundle,
					confDirty: true,
					entryCardIdByPackage: withEntryCardSync(prev, bundle),
					savePhase:
						prev.savePhase === "saved" ? "idle" : prev.savePhase,
				};
			});
		},

		applyCanvasFlushResult(graph: StoryEditorFlushedGraph) {
			set(function (prev) {
				const next: StoryEditorFlushedGraph = {
					nodes: [...graph.nodes],
					edges: [...graph.edges],
				};
				const changed = !flushedGraphEqual(flushBaseline(prev), next);
				return {
					flushedGraph: next,
					canvasPendingFlush: false,
					graphDirty: prev.graphDirty || changed,
				};
			});
		},

		markCanvasPendingFlush() {
			set({ canvasPendingFlush: true });
		},

		applySaveStarted() {
			set({
				savePhase: "saving",
				saveError: undefined,
				saveValidation: null,
			});
		},

		applySaveSuccess(payload: StoryEditorSaveSuccessPayload) {
			set(function (prev) {
				return {
					bundle: payload.bundle,
					entryCardIdByPackage: withEntryCardSync(prev, payload.bundle),
					saveValidation: payload.validation,
					savePhase: "saved",
					saveError: undefined,
					confDirty: false,
					graphDirty: false,
					canvasPendingFlush: false,
				};
			});
		},

		applySaveFailure(payload: StoryEditorSaveFailurePayload) {
			set({
				savePhase: "error",
				saveError: payload.message,
				saveValidation: payload.validation,
			});
		},

		clearSaveValidation() {
			set({ saveValidation: null });
		},
	};
}
