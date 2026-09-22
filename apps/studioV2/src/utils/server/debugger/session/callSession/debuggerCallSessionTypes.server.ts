/**
	* 调试器通话 session / 挂机 / Memory Trace 的 server 投影契约。
	* 与 Client typeFiles 字段对齐，但禁止交叉 import。
	*/
import type { CallSession } from "@airpc/rpg-engine";
import type { ServerLlmChatResult } from "@studio-v2/src/utils/server/llm/client/llmClient.server";
import type { DebuggerShellEventView } from "@studio-v2/src/utils/server/debugger/session/projectors/shellEventProject.server";
import type {
	DebuggerPromptTraceView,
} from "@studio-v2/src/utils/server/debugger/session/projectors/promptTraceProject.server";
import type { DebuggerAvailableToolView } from "@studio-v2/src/utils/server/debugger/session/projectors/availableToolsProject.server";

export type DebuggerCallTurnView = {
	/** speaker 展示角色；system 不进入聊天窗口 */
	role: "user" | "assistant";
	/** 消息文本；已 trim */
	text: string;
};

export type DebuggerCallSessionView = {
	/** Host CallSession id；浏览器只持引用，不作为真源 */
	sessionId: string;
	/** 当前 userId；来自 UserGate/调试器选择 */
	userId: string;
	/** 运行时章节 id；free_call 时为 __free__ */
	chapterId: string;
	/** 当前卡 id；来自 Host resolve */
	cardId: string;
	/** 当前角色 agentId */
	agentId: string;
	/** Host resolve source；用于 UI 区分 free/story/simulate */
	source: CallSession["resolve"]["source"];
	/** 当前卡标题 */
	cardTitle: string;
	/** 当前通话目标摘要 */
	objective: string;
	/**
		* 本卡 requiredBeats；调试器手勾后写入挂机 Outcome。
		* 空数组表示无节拍门槛。
		*/
	requiredBeats: string[];
	/** 当前交互阶段；playback 阶段不允许文本聊天 */
	interactionPhase: CallSession["interactionPhase"];
	/** 已登记聊天轮次；只投影 user/assistant */
	turns: DebuggerCallTurnView[];
	/** 最近一次模型调用信息；用于调试核对 */
	llm: ServerLlmChatResult | null;
	/** 当前通话卡开放给 LLM 的工具；来自 engine toolPolicy 解析 */
	availableTools: DebuggerAvailableToolView[];
	/** Host Composer Prompt Trace；用于核对 Provider 化和开场来源 */
	promptTrace: DebuggerPromptTraceView;
	/** 最近一次 LLM 回复触发的工具调用过程 */
	recentToolEvents: DebuggerToolEventView[];
	/** Host session 累积工具轨迹；用于核对引擎侧副作用 */
	toolTrace: DebuggerToolTraceView[];
	/** 通话中登记的候选出口；挂机时才进入正式出口选择 */
	exitCandidates: DebuggerExitCandidateView[];
	/** Host shell-control FC 产生的电话壳事件；供 UI 响应远端挂断等动作 */
	shellEvents: DebuggerShellEventView[];
};

export type DebuggerToolEventView = {
	/** 供应商 tool_call id */
	toolCallId: string;
	/** 引擎 toolId */
	toolId: string;
	/** 第几轮工具循环；从 1 开始 */
	round: number;
	/** 参数摘要；server 已裁剪，避免 UI 被大 JSON 撑爆 */
	argumentsPreview: string;
	/** 工具结果摘要；server 已裁剪 */
	resultPreview: string;
	/** 工具执行是否成功 */
	ok: boolean;
};

export type DebuggerToolTraceView = {
	/** trace 时间；来自 Host session.toolTrace */
	at: string | null;
	/** 引擎 toolId */
	toolId: string;
	/** 工具行为；未知旧 trace 用 unknown */
	behavior: string;
	/** register_exit 时的候选 id；其他工具为空 */
	candidateId: string | null;
	/** search_memory 等工具返回的 entry ids；用于核对 MemoryCommit 排除来源 */
	resultEntryIds: string[];
	/** 工具结果短 seed；挂机记忆抽取会纳入 exclusionSeeds */
	resultSeeds: string[];
};

export type DebuggerExitCandidateView = {
	/** RuntimeExitCandidate id；挂机出口选择的候选项 */
	candidateId: string;
	/** 由哪个 tool 登记 */
	toolId: string;
	/** 静态出口 id；动态候选为空 */
	exitId: string | null;
	/** 候选优先级；数值越高越优先 */
	priority: number;
	/** 登记时间 ISO 字符串 */
	registeredAt: string;
	/** 候选 effect 数量 */
	effectCount: number;
	/** 参数摘要；server 已裁剪 */
	argsPreview: string;
};

export type StartDebuggerCallInput =
	| {
			/** 外部调试器入口：只能拨角色 free card */
			mode: "free_call";
			userId: string;
			agentId: string;
		}
	| {
			/** 编辑器入口：精准定位章节与起始卡 */
			mode: "simulate_start";
			userId: string;
			chapterId: string;
			cardId: string;
		}
	| {
			/** 编辑器章节入口：由 server 解析章节 entryCardId */
			mode: "simulate_chapter_start";
			userId: string;
			chapterId: string;
		};

export type SendDebuggerMessageInput = {
	/** Host CallSession id */
	sessionId: string;
	/** 玩家输入文本 */
	text: string;
};

export type EndDebuggerCallInput = {
	/** Host CallSession id；挂机只能结束 UI 明确持有的会话。 */
	sessionId: string;
	/** 是否按早挂处理；false/缺省按已完成接听处理 */
	hangupEarly?: boolean;
	/**
		* 本通已完成节拍 id；对齐卡 objectives.requiredBeats。
		* v1 由调试器手勾，不接 LLM 自动打拍。
		*/
	completedBeats?: string[];
	termination?: {
		source: "user" | "npc" | "system";
		reasonKind?: "natural" | "policy" | "handoff";
		reason?: string;
	};
};

export type DebuggerCallEndView = {
	/** 已结束 session id */
	sessionId: string;
	/** Host 终态 */
	status: CallSession["status"];
	/** 命中的出口；无出口或 free 无 candidate 时为空 */
	selectedExitId: string | null;
	/** Effect plan 终态；无 plan 时为空 */
	planStatus: string | null;
	/** Free pipeline 是否执行了记忆 commit；Story 为 null */
	freeCommitted: boolean | null;
	/** 挂机后后台副作用 job id */
	postCallJobId: string;
	/** 挂机记忆提交摘要；供 UI/console 展示 Memory Trace */
	memoryTrace: DebuggerMemoryCommitTraceView | null;
};

export type DebuggerMemoryCommitTraceView = {
	/** DTO trace id；对应 debug-dto indexes/by-trace */
	traceId: string;
	/** DTO id；对应 debug-dto/memory-commits/<dtoId>.json */
	dtoId: string;
	/** 记忆提交策略来源 */
	policy: "free_post_pipeline" | "story_call";
	/** 是否提交成功 */
	committed: boolean;
	/** 本次提交写入/命中的 entry ids */
	entryIds: string[];
	/** 跳过原因；Free 成功/失败路径可为空 */
	skippedReason: string | null;
	/** 提交错误；无则为空 */
	error: string | null;
};
