/**
	* 工作台域 store 契约（FE）。
	* 右侧工程状态 / 最近调试为静态 mock 投影；故事包列表复用 packages store。
	*/
import type {
	EngineeringStatusItem,
	RecentDebugSummary,
} from "@studio-v2/typeFiles/story/summary/storyPackageSummary";

/**
	* 工作台右侧侧栏快照（静态 mock 阶段整包灌入）。
	* 非 Host / 磁盘真源；日后换真接口只改 load bis。
	*/
export type WorkbenchSideSnapshot = {
	/** 工程状态条 */
	engineeringStatus: readonly EngineeringStatusItem[];
	/** 最近调试摘要 */
	recentDebugs: readonly RecentDebugSummary[];
};

/** shell 灌侧栏成功 */
export type WorkbenchSideLoadOkPayload = {
	/** 判别成功 */
	ok: true;
	/** 侧栏快照 */
	side: WorkbenchSideSnapshot;
};

/** shell 灌侧栏失败；message 已人话化 */
export type WorkbenchSideLoadFailPayload = {
	/** 判别失败 */
	ok: false;
	/** 人话错误；空串不应出现 */
	message: string;
};

/**
	* 侧栏加载结果联合；shell 一次灌入，store 只消费结果。
	* 成功与失败互斥；禁止把 mock 模块细节塞进本契约。
	*/
export type WorkbenchSideLoadResult =
	| WorkbenchSideLoadOkPayload
	| WorkbenchSideLoadFailPayload;
