/**
	* 调试器通话 API 响应包类型。
	*/
import type { DebuggerCallEndView, DebuggerCallSessionView } from "./callSession";
import type { DebuggerIncomingCallView } from "./incomingCall";

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
	/**
		* Host endCall 投影；浏览器展示用，不持久化。
		* 按 userId 强制收口且当时无 active call 时为 null。
		*/
	end: DebuggerCallEndView | null;
};

/** 章节开局响铃：已 delay=0 调度并派发来电 */
export type DebuggerChapterEntryOutboundRingView = {
	mode: "outbound_ring";
	cardId: string;
	agentId: string;
	/** Host incoming event id；接听用 */
	incomingEventId: string | null;
};

/** 章节开局非外呼：回落 simulate_start */
export type DebuggerChapterEntrySimulateView = {
	mode: "simulate_start";
	chapterId: string;
	cardId: string;
};

export type DebuggerChapterEntryRingView =
	| DebuggerChapterEntryOutboundRingView
	| DebuggerChapterEntrySimulateView;

/** POST /api/debug/call/chapter-entry-ring 响应 */
export type DebuggerChapterEntryRingResponse = {
	ring: DebuggerChapterEntryRingView;
};
