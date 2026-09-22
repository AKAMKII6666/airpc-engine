/**
	* 调试器通话请求体、SSE 流事件与挂机摘要类型。
	* 与 server/engine 字段对齐但不 import，遵守 Client/Server 隔离。
	*/

import type { DebuggerMemoryCommitTraceView } from "../memoryTrace/memoryTrace";
import type { DebuggerCallSessionView } from "./callSessionViews";

/** 表示外部调试器拨号入口，只允许进入角色 free card */
export type StartDebuggerFreeCallBody = {
	/** 外部调试器入口：只能拨角色 free card */
	mode: "free_call";
	/** 当前调试用户 id；由 UI 选择，server 用于 ensureProfile */
	userId: string;
	/** 被拨角色 id；server 用它 resolve free_call */
	agentId: string;
};

/** 表示编辑器精准调试入口，允许指定章节与起始卡 */
export type StartDebuggerSimulateCallBody = {
	/** 编辑器入口：精准定位章节与起始卡 */
	mode: "simulate_start";
	/** 当前调试用户 id；由 UI 选择，server 用于 ensureProfile */
	userId: string;
	/** 章节 id；server 传给 Host simulate_start */
	chapterId: string;
	/** 起始通话卡 id；server 传给 Host simulate_start */
	cardId: string;
};

/** 表示编辑器章节级调试入口，起始卡由 server 按 entryCardId 解析 */
export type StartDebuggerSimulateChapterBody = {
	/** 编辑器入口：只指定章节，不允许用户手选通话卡 */
	mode: "simulate_chapter_start";
	/** 当前调试用户 id；由 UI 选择，server 用于 ensureProfile */
	userId: string;
	/** 章节 id；server 解析该章 entryCardId 后启动 Host */
	chapterId: string;
};

/** 表示创建调试通话的两种合法入口，避免 UI 手填 sessionId */
export type StartDebuggerCallBody =
	| StartDebuggerFreeCallBody
	| StartDebuggerSimulateCallBody
	| StartDebuggerSimulateChapterBody;

/** 表示接听/挂断真实外呼 modal 的请求 */
export type DebuggerIncomingCallCommandBody = {
	/** 当前调试用户 id */
	userId: string;
	/** Host incoming event id */
	eventId: string;
};

/** 表示一次玩家文本输入，请求生命周期仅覆盖当前 server session */
export type SendDebuggerMessageBody = {
	/** Host CallSession id */
	sessionId: string;
	/** 玩家输入文本 */
	text: string;
};

/**
	* SSE tool_start 载荷；流式一轮工具调用开始时推给 UI。
	* 生命周期仅覆盖当前 messageId 的本轮 tool call。
	*/
export type DebuggerMessageStreamToolStart = {
	/** 本通 assistant 消息 id；与 message_start 对齐 */
	messageId: string;
	/** LLM tool_call id；与后续 tool_end 配对 */
	toolCallId: string;
	/** 工具稳定 id */
	toolId: string;
	/** 工具循环轮次；从 0 起 */
	round: number;
	/** 参数 JSON 预览（已裁剪）；勿当完整入参真源 */
	argumentsPreview: string;
};

/**
	* SSE tool_end 载荷；工具执行结束（成功或失败）时推给 UI。
	*/
export type DebuggerMessageStreamToolEnd = {
	/** 本通 assistant 消息 id */
	messageId: string;
	/** 与 tool_start 配对的 tool_call id */
	toolCallId: string;
	/** 工具稳定 id */
	toolId: string;
	/** 工具循环轮次；与 tool_start 一致 */
	round: number;
	/** 结果摘要预览（已裁剪）；失败时可为错误文案 */
	resultPreview: string;
	/** true=工具执行成功；false=失败仍继续主链 */
	ok: boolean;
};

/**
	* 调试消息 SSE 事件联合体；client EventSource 按 event 字段分发。
	* 不含 LLM Key；session_snapshot 为 Host 投影刷新点。
	*/
export type DebuggerMessageStreamEvent =
	| {
			event: "message_start";
			data: {
				sessionId: string;
				messageId: string;
				role: "assistant";
			};
		}
	| {
			event: "thinking_start";
			data: { messageId: string; text: string };
		}
	| {
			event: "thinking_delta";
			data: { messageId: string; text: string };
		}
	| {
			event: "thinking_end";
			data: { messageId: string };
		}
	| {
			event: "text_delta";
			data: { messageId: string; text: string };
		}
	| {
			event: "tool_start";
			data: DebuggerMessageStreamToolStart;
		}
	| {
			event: "tool_end";
			data: DebuggerMessageStreamToolEnd;
		}
	| {
			event: "session_snapshot";
			data: { session: DebuggerCallSessionView };
		}
	| {
			event: "error";
			data: { code: string; message: string };
		}
	| {
			event: "done";
			data: Record<string, never>;
		};

/** 表示挂断当前 Host session 的请求，生命周期仅覆盖当前通话 */
export type EndDebuggerCallBody = {
	/** Host CallSession id；禁止按 userId 猜测并结束其它页面的会话。 */
	sessionId: string;
	/** true 表示早挂；false/缺省表示完成接听后挂断 */
	hangupEarly?: boolean;
	/**
		* 本通已完成节拍；对齐卡 requiredBeats。
		* v1 调试器手勾，缺省空数组。
		*/
	completedBeats?: string[];
	/** 断线来源与可选 NPC 原因；随 endCall 请求写入本通 Outcome。 */
	termination?: {
		/** 谁触发断线；用户按钮、NPC FC 或系统收口三选一。 */
		source: "user" | "npc" | "system";
		/** NPC 主动挂机原因；用户/系统断线通常省略。 */
		reasonKind?: "natural" | "policy" | "handoff";
		/** 仅用于调试与审计的简短原因，不驱动工具授权。 */
		reason?: string;
	};
};

/** 表示 Host endCall 后的调试摘要，供 UI/后续日志面板展示 */
export type DebuggerCallEndView = {
	/** 已结束 session id */
	sessionId: string;
	/** Host 终态，如 completed / aborted */
	status: string;
	/** 命中出口；free 无 candidate 或无出口时为 null */
	selectedExitId: string | null;
	/** Effect plan 终态；没有 plan 时为 null */
	planStatus: string | null;
	/**
		* Free pipeline 记忆是否已提交。
		* 后台未完成时为 false（见 memoryTrace.skippedReason=background_pending），勿当最终失败。
		*/
	freeCommitted: boolean | null;
	/** 挂机后后台副作用 job id；用于轮询详情与占线状态 */
	postCallJobId: string;
	/** 挂机记忆提交摘要；异步未完成时 committed=false 且 skippedReason=background_pending */
	memoryTrace: DebuggerMemoryCommitTraceView | null;
};
