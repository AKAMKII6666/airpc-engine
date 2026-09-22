/**
 * EngineHost 表面契约与 LoadWorkspaceOptions；从 engineHostApi 拆出。
 */
import type { EngineError } from "../../host/errors.js";
import type {
	BeginCallOpts,
	CallIntent,
	CallSession,
	ConsumeOpeningFirstTurnResult,
	EndCallResult,
	LogRecord,
	PostCallJob,
	PostCallJobSummary,
	ResolveResult,
	SaveReason,
} from "../../host/types.js";
import type {
	IncomingCallShellEvent,
	IncomingCallShellEventStatus,
} from "../../host/shellControl/shellControlTypes.js";
import type {
	WetAppendInput,
	WetQueryOpts,
	WetReplayView,
} from "../../host/wet/wet.js";
import type { MemoryPort } from "../../memory/types.js";
import type {
	AdvanceToNextResult,
	FiredScheduleItem,
} from "../../runtime/schedule/scheduleTick.js";
import type { CallFlowSimEventKind } from "../../runtime/prompt/blocks/selectCallFlowPrompt.js";
import type { Outcome } from "../../schema/call/outcome.js";
import type { PlayerProfile } from "../../schema/identity/profile.js";
import type { WorldLoreDoc } from "../../schema/world/worldLore.js";
import type { ToolInvokeResult, ToolRegistry } from "../../tools/types.js";
import type { ValidationReport } from "../../validation/types.js";
import type { ContentPort } from "../persist/contentPort.js";
import type { EngineLogPort } from "./engineLogPort.js";
import type { ProfilePort } from "../persist/profilePort.js";
import type { PostCallJobListFilter } from "../jobs/postCallJobStorePort.js";

export interface LoadWorkspaceOptions {
	/**
	 * 为 true 时清空 profiles / sessions / activeByUser。
	 * 默认 false：仅刷 Content 缓存，保留本通调试 Session 与已载 Profile。
	 * rootDir 变更时强制视为 true。
	 */
	resetRuntime?: boolean;
}

export interface EngineHost {
	loadWorkspace(
		rootDir: string,
		opts?: LoadWorkspaceOptions,
	): Promise<void>;
	/** 显式踢会话／清 Profile 缓存；不重读 Content。禁与普通 Content 保存绑定。 */
	resetRuntime(): void;
	preloadCard(
		chapterId: string,
		cardId: string,
	): Promise<void | EngineError>;
	ensureProfile(userId: string): Promise<PlayerProfile>;
	/** 踢单用户 Profile 内存缓存；删档后调用，避免后续 saveProfile 写回幽灵档。 */
	evictProfileCache(userId: string): void;
	/**
	 * 踢缓存后从 ProfilePort 重载。
	 * Studio 经 usersFs 直写 profile.save.json 后须调用，否则 autosave 会用旧内存覆盖磁盘。
	 */
	reloadProfileFromPort(userId: string): Promise<PlayerProfile>;
	saveProfile(userId: string, reason: SaveReason): Promise<void>;
	resolve(userId: string, intent: CallIntent): ResolveResult | EngineError;
	resolveAsync(
		userId: string,
		intent: CallIntent,
	): Promise<ResolveResult | EngineError>;
	beginCall(
		userId: string,
		result: ResolveResult,
		opts: BeginCallOpts,
	): Promise<CallSession | EngineError>;
	endCall(
		sessionId: string,
		outcome: Outcome,
	): Promise<EndCallResult | EngineError>;
	getPostCallJob(jobId: string): PostCallJob | null;
	listPostCallJobs(filter?: PostCallJobListFilter): PostCallJob[];
	recoverPostCallJobs(): Promise<PostCallJobSummary[] | EngineError>;
	/**
	 * 仅 `failed_retryable`：自第一个未完成后台步续跑。
	 * 同步段未 committed 时拒绝（须新通话或人工处理）。
	 */
	retryPostCallJob(
		jobId: string,
	): Promise<PostCallJobSummary | EngineError>;
	drainPostCallJobs(): Promise<void>;
	invokeTool(
		sessionId: string,
		toolId: string,
		args?: Record<string, unknown>,
	): Promise<ToolInvokeResult | EngineError>;
	/**
	 * 播放完成（桩）：置 playback_completed；
	 * hybrid → dialogue；playback_only 仍可挂机收 Outcome。
	 */
	completePlayback(sessionId: string): CallSession | EngineError;
	/**
	 * 过程话术模拟：壳／Studio 上报事件，引擎选型注入 lastSimEvent（不计时、不写 Profile）。
	 */
	simEvent(
		sessionId: string,
		kind: CallFlowSimEventKind,
	): CallSession | EngineError;
	/**
	 * 文本调试轮次登记（通话中）；不跑 Effect、不写 Profile。
	 */
	recordChatTurn(
		sessionId: string,
		turn: { role: "user" | "assistant" | "system"; text: string },
	): CallSession | EngineError;
	/**
	 * 消费电话接通第一声。direct opening 由引擎登记 assistant turn；
	 * LLM opening 只返回 request_llm_opening，外层再按消息策略调用模型。
	 */
	consumeOpeningFirstTurn(
		sessionId: string,
	): ConsumeOpeningFirstTurnResult | EngineError;
	getActiveSession(userId: string): CallSession | null;
	getSession(sessionId: string): CallSession | null;
	getRecentLogs(opts?: { userId?: string; limit?: number }): LogRecord[];
	/** 读 data/logs/engine-YYYYMMDD.jsonl 切片（已脱敏写入） */
	readLogFileSlice(opts?: {
		day?: string;
		limit?: number;
	}): Promise<{
		file: string;
		lines: LogRecord[];
		truncated: boolean;
	} | EngineError>;
	/**
	 * WET 查询：合并 ring（+可选当日 jsonl），按 type／session／时间过滤。
	 */
	queryWet(opts?: WetQueryOpts & { includeFile?: boolean }): Promise<{
		events: LogRecord[];
		storageNote: string;
		file?: string;
		truncated?: boolean;
	} | EngineError>;
	/**
	 * 受控追加：仅 wet.annotation／wet.compensation；禁止改写历史／冒充 effect 账本。
	 */
	appendWet(input: WetAppendInput): LogRecord | EngineError;
	/** 重放视图：session 相关事件 + exit／effect plan 摘要（只读） */
	getWetReplay(sessionId: string): Promise<WetReplayView | EngineError>;
	getLoadedCardCount(chapterId: string): number;
	getMemoryPort(): MemoryPort | null;
	/** 已注入的 ProfilePort；未注入为 null（须宿主注入后方可 ensure/save） */
	getProfilePort(): ProfilePort | null;
	/** 已注入的 ContentPort；未注入为 null（须宿主注入后方可 loadWorkspace） */
	getContentPort(): ContentPort | null;
	/** 已注入的 EngineLogPort；未注入为 null（无则仅内存 ring，不落盘） */
	getEngineLogPort(): EngineLogPort | null;
	/** Host 当前统一工具目录；活动通话仍使用 beginCall 时冻结的 revision。 */
	getToolRegistry(): ToolRegistry;
	validatePackage(chapterId: string): Promise<ValidationReport>;
	/**
	 * 推进 Profile.schedule.clockMs：物化到期 recurring→once，再 tick once → outbound pending。
	 * 返回本拍 fired 列表，供调试台再 resolve(agent_outbound)。
	 */
	advanceClock(
		userId: string,
		deltaMs: number,
	): FiredScheduleItem[] | EngineError;
	/** 跳到绝对逻辑时刻（仅前进）并 Tick */
	setClockMs(
		userId: string,
		toClockMs: number,
	): FiredScheduleItem[] | EngineError;
	/** 推到下一意图（pending once 或 recurring 下次 occurrence） */
	advanceClockToNextIntent(
		userId: string,
	): AdvanceToNextResult | EngineError;
	/** 壳/UI 轮询真实调度外呼；只返回仍待接听/拒接的 pending event */
	listIncomingCallEvents(userId: string): IncomingCallShellEvent[];
	/** 壳/UI 接听外呼 modal；只消费 event，实际通话仍需 resolve/beginCall */
	acceptIncomingCallEvent(
		userId: string,
		eventId: string,
	): IncomingCallShellEvent | EngineError;
	/** 壳/UI 关闭外呼 modal；拒接/忽略均不推进剧情 */
	dismissIncomingCallEvent(
		userId: string,
		eventId: string,
		status: Extract<IncomingCallShellEventStatus, "rejected" | "dismissed">,
	): IncomingCallShellEvent | EngineError;
	/**
	 * Lore bootstrap：有 location 或 force 时写入 Profile.world.lore；
	 * port 失败降级 fallback；不阻塞调用方。
	 */
	bootstrapLore(
		userId: string,
		opts?: { force?: boolean },
	): Promise<
		| {
				lore: WorldLoreDoc;
				usedFallback: boolean;
				errorMessage?: string;
		  }
		| EngineError
	>;
}
