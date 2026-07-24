/**
	* 故事编辑器 domain store 契约（FE）。
	* 非磁盘真源；shell / feature bis 灌写；UI 经 bis 读。
	* 与 bis `EditorGraphSeed` 字段同构处用 unknown 节点边，避免 store/typeFiles 依赖 xyflow。
	*/
import type { DiskStoryPackageBundle } from "@studio-v2/typeFiles/story/package/diskStoryPackage";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";
import type { ValidationReport } from "@studio-v2/typeFiles/story/validate/engineValidation";

/** 保存进度相位；仅 UI 会话，非 Host */
export type StoryEditorSavePhase = "idle" | "saving" | "saved" | "error";

/**
	* 打开包时的画布初始图快照。
	* nodes/edges 形状与 React Flow 同构，由 bis 注入；store 不解析内部字段。
	*/
export type StoryEditorGraphSeedSnapshot = {
	/** 初始节点列表；打开后由画布自管，本字段仅 seed */
	nodes: readonly unknown[];
	/** 初始边列表 */
	edges: readonly unknown[];
	/** 打开后默认选中节点 id；无则 null */
	initialSelectionNodeId: string | null;
};

/**
	* 画布 → store 的业务图 flush 结果。
	* 保存须先 flush；组 bundle 以本快照为准（LY-4）。
	*/
export type StoryEditorFlushedGraph = {
	/** 业务结构节点快照；不含每帧 viewport */
	nodes: readonly unknown[];
	/** 业务结构边快照 */
	edges: readonly unknown[];
};

/** 包内卡下拉摘要；非 CallCard 全文 */
export type StoryEditorCardIndexEntry = {
	/** 卡稳定 id */
	cardId: string;
	/** 展示标题；可缺省 */
	title?: string;
};

/** shell 打开包成功后一次灌入的载荷 */
export type StoryEditorLoadOkPayload = {
	/** 判别成功 */
	ok: true;
	/** 路由包 id；须与 bundle.conf.packageId 对齐 */
	packageId: string;
	/** 磁盘包列表；chapter 下拉等 */
	diskPackages: readonly StoryPackageSummary[];
	/** 会话整包工作副本 */
	bundle: DiskStoryPackageBundle;
	/** 画布 seed；保存路径不重建 */
	graphSeed: StoryEditorGraphSeedSnapshot;
	/** packageId → 卡摘要 */
	cardIndex: Readonly<Record<string, readonly StoryEditorCardIndexEntry[]>>;
	/** packageId → 默认入口卡 id */
	entryCardIdByPackage: Readonly<Record<string, string>>;
};

/** 打开失败；message 已人话化 */
export type StoryEditorLoadFailPayload = {
	/** 判别失败 */
	ok: false;
	/** 目标包 id（便于顶栏展示） */
	packageId: string;
	/** 人话错误；空串不应出现 */
	message: string;
};

/**
	* 打开包结果联合；shell 一次灌入，store 只消费结果。
	* 成功与失败互斥；禁止把 xhr 细节塞进本契约。
	*/
export type StoryEditorLoadResult =
	| StoryEditorLoadOkPayload
	| StoryEditorLoadFailPayload;

/** 保存成功结果型载荷 */
export type StoryEditorSaveSuccessPayload = {
	/** 写盘后回读/归一的整包 */
	bundle: DiskStoryPackageBundle;
	/** 保存路径 validate 报告；无校验步骤时可为 null */
	validation: ValidationReport | null;
};

/** 保存失败结果型载荷 */
export type StoryEditorSaveFailurePayload = {
	/** 人话错误 */
	message: string;
	/** PACKAGE_VALIDATION_FAILED 时携带；其它失败为 null */
	validation: ValidationReport | null;
};
