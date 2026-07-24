/**
	* storyEditor store 状态形状与会话初值。
	* 与 writes / create 分离，避免循环 import。
	*/
import type { DiskStoryPackageBundle } from "@studio-v2/typeFiles/story/package/diskStoryPackage";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";
import type { ValidationReport } from "@studio-v2/typeFiles/story/validate/engineValidation";
import type {
	StoryEditorCardIndexEntry,
	StoryEditorFlushedGraph,
	StoryEditorGraphSeedSnapshot,
	StoryEditorLoadResult,
	StoryEditorSaveFailurePayload,
	StoryEditorSavePhase,
	StoryEditorSaveSuccessPayload,
} from "@studio-v2/typeFiles/story/editor/store/storyEditorStoreState";

export type StoryEditorStoreState = {
	/** 当前路由包 id；空串表示未打开或已 reset */
	packageId: string;
	/** 打开 / refresh 进行中 */
	loading: boolean;
	/** 打开失败人话；成功时 undefined */
	loadError: string | undefined;
	/**
		* shell 有界重拉计数。
		* feature bump 后 shell 再拉；store 自身不发请求。
		*/
	refreshStamp: number;
	/** 磁盘包列表摘要；chapter 下拉等只读投影 */
	diskPackages: StoryPackageSummary[];
	/** packageId → 卡摘要 */
	cardIndex: Record<string, readonly StoryEditorCardIndexEntry[]>;
	/** packageId → 默认入口卡 */
	entryCardIdByPackage: Record<string, string>;
	/** 打开时画布 seed；保存不重建 */
	graphSeed: StoryEditorGraphSeedSnapshot | null;
	/** 会话整包工作副本（含 conf）；非磁盘真源 */
	bundle: DiskStoryPackageBundle | null;
	/** 最近一次 flush 的业务图；null=尚未 flush；保存以本字段为准（LY-4） */
	flushedGraph: StoryEditorFlushedGraph | null;
	/** 画布有未 flush 变更（验收：dirty 含未同步画布） */
	canvasPendingFlush: boolean;
	/** conf/cards 相对上次成功打开或保存有未落盘变更 */
	confDirty: boolean;
	/** flushedGraph 相对上次成功打开或保存有未落盘变更 */
	graphDirty: boolean;
	/** 保存进度相位 */
	savePhase: StoryEditorSavePhase;
	/** 保存失败人话 */
	saveError: string | undefined;
	/** 最近一次保存相关 ValidationReport；未保存或非校验失败时可为 null */
	saveValidation: ValidationReport | null;

	/** shell 开始拉包：清错误、置 loading，保留 stamp */
	applyPackageLoadStarted: (packageId: string) => void;
	/** shell 拉包结果：成功灌会话；失败只记 loadError */
	applyPackageLoadResult: (result: StoryEditorLoadResult) => void;
	/**
		* conf 字段写回结果（entryCardId / assetRefs / meta 等）。
		* 调用方须已算出下一 bundle；本 action 只记账并标 confDirty。
		*/
	applyBundleWriteResult: (bundle: DiskStoryPackageBundle) => void;
	/**
		* 画布 flush 结果：写入业务图投影并清 pending。
		* 标 graphDirty；不碰 confDirty。
		*/
	applyCanvasFlushResult: (graph: StoryEditorFlushedGraph) => void;
	/** 画布结构已变、尚未 flush */
	markCanvasPendingFlush: () => void;
	/** bis 已进入保存中（结果型相位） */
	applySaveStarted: () => void;
	/** 保存成功：更新 bundle、清全部 dirty、记 validation */
	applySaveSuccess: (payload: StoryEditorSaveSuccessPayload) => void;
	/** 保存失败：记错误与可选 validation；保留 dirty */
	applySaveFailure: (payload: StoryEditorSaveFailurePayload) => void;
	/** 关闭校验浮层；不改 dirty */
	clearSaveValidation: () => void;
	/** feature 请求 shell 有界重拉 */
	bumpStoryEditorRefreshStamp: () => void;
	/** 离页或强制清空会话 */
	resetStoryEditorSession: () => void;
};

const emptyCardIndex: Record<string, readonly StoryEditorCardIndexEntry[]> = {};
const emptyEntryByPackage: Record<string, string> = {};

/** 会话初值（不含 refreshStamp / actions）；reset 时复用 */
export function createStoryEditorSessionSlice(): Pick<
	StoryEditorStoreState,
	| "packageId"
	| "loading"
	| "loadError"
	| "diskPackages"
	| "cardIndex"
	| "entryCardIdByPackage"
	| "graphSeed"
	| "bundle"
	| "flushedGraph"
	| "canvasPendingFlush"
	| "confDirty"
	| "graphDirty"
	| "savePhase"
	| "saveError"
	| "saveValidation"
> {
	return {
		packageId: "",
		loading: false,
		loadError: undefined,
		diskPackages: [],
		cardIndex: emptyCardIndex,
		entryCardIdByPackage: emptyEntryByPackage,
		graphSeed: null,
		bundle: null,
		flushedGraph: null,
		canvasPendingFlush: false,
		confDirty: false,
		graphDirty: false,
		savePhase: "idle",
		saveError: undefined,
		saveValidation: null,
	};
}

/**
	* 是否有未落盘或未同步变更（含 canvasPendingFlush）。
	* 供 feature bis / 顶栏提示；勿在 UI 直订 store。
	*/
export function selectStoryEditorIsDirty(state: StoryEditorStoreState): boolean {
	return state.confDirty || state.graphDirty || state.canvasPendingFlush;
}
