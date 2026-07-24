/**
	* 调试器域 store 契约（FE）。
	* 非 Host CallSession 真源；shell 灌叙事快照与信箱投影；UI 经 feature bis 读写。
	*/
import type {
	DebugAdvancedSnapshot,
	DebugCallRunView,
	DebugEffectItem,
	DebugExitHitView,
	DebugRoleBoardItem,
	DebugSceneSetup,
	DebugTimelineItem,
} from "@studio-v2/typeFiles/debugger/debugSessionView";
import type { DebuggerMailboxSnapshot } from "@studio-v2/typeFiles/debugger/mailboxView";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";
import type { ValidationReport } from "@studio-v2/typeFiles/story/validate/engineValidation";

/**
	* 调试器叙事会话快照（静态 mock 阶段整包灌入）。
	* 字段均为 UI 投影；禁止把 Host session 原文塞进本结构。
	*/
export type DebuggerSessionSnapshot = {
	/** 顶部/左侧场景设置 */
	scene: DebugSceneSetup;
	/** 中部通话运行区 */
	callRun: DebugCallRunView;
	/** 出口命中叙事 */
	exitHit: DebugExitHitView;
	/** Effect 执行结果列表 */
	effects: readonly DebugEffectItem[];
	/** 右侧角色挂卡/外呼板 */
	roleBoard: readonly DebugRoleBoardItem[];
	/** 底部 WET / Effect 时间线 */
	timeline: readonly DebugTimelineItem[];
	/** 高级抽屉：raw JSON + 日志行 */
	advanced: DebugAdvancedSnapshot;
};

/** shell 灌会话成功 */
export type DebuggerSessionLoadOkPayload = {
	/** 判别成功 */
	ok: true;
	/** 整包叙事快照 */
	session: DebuggerSessionSnapshot;
};

/** shell 灌会话失败；message 已人话化 */
export type DebuggerSessionLoadFailPayload = {
	/** 判别失败 */
	ok: false;
	/** 人话错误；空串不应出现 */
	message: string;
};

/**
	* 会话加载结果联合；shell 一次灌入，store 只消费结果。
	* 成功与失败互斥；禁止把 xhr/mock 细节塞进本契约。
	*/
export type DebuggerSessionLoadResult =
	| DebuggerSessionLoadOkPayload
	| DebuggerSessionLoadFailPayload;

/** shell 拉信箱成功 */
export type DebuggerMailboxLoadOkPayload = {
	/** 判别成功 */
	ok: true;
	/** 信箱快照；可空槽 */
	mailbox: DebuggerMailboxSnapshot;
};

/** 拉信箱失败 */
export type DebuggerMailboxLoadFailPayload = {
	/** 判别失败 */
	ok: false;
	/** 人话错误 */
	message: string;
};

/** 信箱加载结果联合 */
export type DebuggerMailboxLoadResult =
	| DebuggerMailboxLoadOkPayload
	| DebuggerMailboxLoadFailPayload;

/** 读盘 validate 包列表加载结果 */
export type DebuggerValidatePackagesLoadResult =
	| {
			/** 判别成功 */
			ok: true;
			/** 磁盘包摘要 */
			packages: readonly StoryPackageSummary[];
		}
	| {
			/** 判别失败 */
			ok: false;
			/** 人话错误 */
			message: string;
		};

/** 单次读盘 validate 结果 */
export type DebuggerValidateRunResult =
	| {
			/** 判别成功 */
			ok: true;
			/** 引擎校验报告 */
			report: ValidationReport;
		}
	| {
			/** 判别失败 */
			ok: false;
			/** 人话错误 */
			message: string;
		};
