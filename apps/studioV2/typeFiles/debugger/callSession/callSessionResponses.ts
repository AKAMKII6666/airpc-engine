/**
	* 调试器通话 API 响应包类型。
	*/
import type { DebuggerCallEndView } from "./callSessionStream";
import type { DebuggerCallSessionView } from "./callSessionViews";
import type { DebuggerIncomingCallView } from "../incoming/incomingCall";

/** 表示调试通话 API 的统一响应包，session 为最新 Host 投影 */
export type DebuggerCallSessionResponse = {
	/** 最新 Host CallSession 投影；浏览器展示用，不持久化 */
	session: DebuggerCallSessionView;
};

/** 表示调试器外呼列表响应包 */
export type DebuggerIncomingCallsResponse = {
	/** 当前仍 pending 的外呼事件 */
	incomingCalls: DebuggerIncomingCallView[];
};

/** 表示调试通话挂断 API 的统一响应包 */
export type DebuggerCallEndResponse = {
	/** Host endCall 投影；浏览器展示用，不持久化。 */
	end: DebuggerCallEndView;
};

/** 章节开局响铃：已 delay=0 调度并派发来电 */
export type DebuggerChapterEntryOutboundRingView = {
	/** 响应分支标识；表示应展示 Host 已派发的来电。 */
	mode: "outbound_ring";
	/** 本请求创建来电，或复用了同一章节入口的 pending 来电。 */
	outcome: "created" | "reused_pending";
	/** 本次来电锁定的故事卡 id；由 server 解析章节入口。 */
	cardId: string;
	/** 本次来电角色 id；来自入口故事卡 ownerAgentId。 */
	agentId: string;
	/** Host incoming event id；仅当前 Host 生命周期内用于精确接听。 */
	incomingEventId: string;
};

/** 章节开局非外呼：回落 simulate_start */
export type DebuggerChapterEntrySimulateView = {
	/** 响应分支标识；表示客户端应走显式模拟开局。 */
	mode: "simulate_start";
	/** 非 outbound_auto 入口的确定性回落结果。 */
	outcome: "simulate_start";
	/** server 已校验的章节 id；用于 simulate_start 请求。 */
	chapterId: string;
	/** server 已解析的章节入口卡 id；用于 simulate_start 请求。 */
	cardId: string;
};

/** Host 已有活动通话；恢复该权威 session，不终止它。 */
export type DebuggerChapterEntryActiveView = {
	/** 响应分支标识；表示 Host 已持有该用户的活动通话。 */
	mode: "already_active";
	/** 章节入口没有新建或结束通话，而是恢复现有投影。 */
	outcome: "already_active";
	/** 当前 Host 权威会话的只读浏览器投影；不由客户端持久化。 */
	session: DebuggerCallSessionView;
};

/** 另一通来电等待处理；章节进入不覆盖或删除它。 */
export type DebuggerChapterEntryBlockedView = {
	/** 响应分支标识；表示必须先处理已有 pending 来电。 */
	mode: "blocked";
	/** 章节入口保持无副作用，并向 UI 暴露阻塞状态。 */
	outcome: "blocked";
	/** 当前唯一阻塞原因；禁止章节入口覆盖另一通来电。 */
	reason: "other_incoming_pending";
	/** 已存在的 Host incoming event id；供 UI 定位而非自动接听。 */
	incomingEventId: string;
};

/** 章节入口协调结果；四个分支互斥，客户端必须按 mode 穷尽处理。 */
export type DebuggerChapterEntryRingView =
	| DebuggerChapterEntryOutboundRingView
	| DebuggerChapterEntrySimulateView
	| DebuggerChapterEntryActiveView
	| DebuggerChapterEntryBlockedView;

/** POST /api/debug/call/chapter-entry-ring 响应 */
export type DebuggerChapterEntryRingResponse = {
	/** server 权威协调结果；请求重试不会额外创建同目标来电。 */
	ring: DebuggerChapterEntryRingView;
};
