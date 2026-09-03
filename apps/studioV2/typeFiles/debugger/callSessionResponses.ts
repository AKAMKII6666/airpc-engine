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
	/** Host endCall 投影；浏览器展示用，不持久化 */
	end: DebuggerCallEndView;
};
