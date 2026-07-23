/**
 * 模块名称：EngineHost 公共 API 与存取 Port 注入选项（技术设计 19 / 23）
 * 模块说明：从 createEngineHost 实现文件拆出，避免遗留超限文件净增。
 */
import type { EngineError } from "../host/errors.js";
import type {
	BeginCallOpts,
	CallIntent,
	CallSession,
	EndCallResult,
	LogRecord,
	ResolveResult,
	SaveReason,
} from "../host/types.js";
import type {
	WetAppendInput,
	WetQueryOpts,
	WetReplayView,
} from "../host/wet.js";
import type { LoreBootstrapPort } from "../lore/types.js";
import type { MemoryPort } from "../memory/types.js";
import type {
	AdvanceToNextResult,
	FiredScheduleItem,
} from "../runtime/scheduleTick.js";
import type { EffectSink } from "../runtime/effectSink.js";
import type { CallFlowSimEventKind } from "../runtime/selectCallFlowPrompt.js";
import type {
	GenerateVoicemailPort,
	OnVoicemailUnreadChanged,
} from "../runtime/voicemail/voicemailPorts.js";
import type { Outcome } from "../schema/outcome.js";
import type { PlayerProfile } from "../schema/profile.js";
import type { WorldLoreDoc } from "../schema/worldLore.js";
import type { ToolInvokeResult } from "../tools/types.js";
import type { ValidationReport } from "../validation/types.js";
import type { ContentPort } from "./contentPort.js";
import type { EngineLogPort } from "./engineLogPort.js";
import type { ProfilePort } from "./profilePort.js";

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
		packageId: string,
		cardId: string,
	): Promise<void | EngineError>;
	ensureProfile(userId: string): Promise<PlayerProfile>;
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
	getLoadedCardCount(packageId: string): number;
	getMemoryPort(): MemoryPort | null;
	/** 已注入的 ProfilePort；未注入为 null（须宿主注入后方可 ensure/save） */
	getProfilePort(): ProfilePort | null;
	/** 已注入的 ContentPort；未注入为 null（须宿主注入后方可 loadWorkspace） */
	getContentPort(): ContentPort | null;
	/** 已注入的 EngineLogPort；未注入为 null（无则仅内存 ring，不落盘） */
	getEngineLogPort(): EngineLogPort | null;
	validatePackage(packageId: string): Promise<ValidationReport>;
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

/**
 * Host 装配选项（存取 Port 合同见技术设计 23）。
 *
 * ## 注入缺省策略（迁出已收口）
 *
 * | Port | 选项 | 未注入时 | 定稿语义 |
 * |------|------|----------|----------|
 * | Memory | `memory` | **null**（须宿主注入；禁引擎内 sqlite） | 须由宿主注入 |
 * | Profile | `profile` | **null**（须宿主注入；禁引擎内直写 fs） | 必注入；Host 不拼磁盘路径 |
 * | Content | `content` | **null**（须宿主注入；禁引擎内 fs 扫描） | 必注入 |
 * | EngineLog | `engineLog` | **null**（仅内存 ring；禁引擎内 jsonl fs） | 可选；无则仅内存 ring |
 *
 * 本机 Studio：`engineIOModule` 工厂创建 Sqlite Memory 等并注入。
 * 测试：注入内存假 Port。引擎包内无 fs/sqlite 实现残留。
 */
export interface CreateEngineHostOptions {
	persist?: boolean;
	/**
	 * Memory Port。未注入 → null（Host 跳过投影/commit/工具记忆口）。
	 * 本机实现：`apps/studioV2/engineIOModule` 的 `createSqliteMemoryPort`。
	 */
	memory?: MemoryPort | null;
	/**
	 * 薄 Profile 读写。未注入 → null（ensureProfile/saveProfile 抛 ENGINE_INTERNAL）。
	 * 本机实现：`engineIOModule` 的 `createFsProfilePort`。
	 */
	profile?: ProfilePort | null;
	/**
	 * Content / Workspace 只读。未注入 → null（loadWorkspace/preloadCard 抛 ENGINE_INTERNAL）。
	 * 本机实现：`engineIOModule` 的 `createFsContentPort`。
	 */
	content?: ContentPort | null;
	/**
	 * 旁路 jsonl。未注入 → 仅 Host 内存 ring（不落盘）。
	 * 本机实现：`engineIOModule` 的 `createFsEngineLogPort`。
	 */
	engineLog?: EngineLogPort | null;
	/** 媒介 EffectSink；缺省 Noop 桩 */
	effectSink?: EffectSink | null;
	/** Lore 生成端口；null／缺省 → 直接 fallback */
	loreBootstrap?: LoreBootstrapPort | null;
	/**
	 * 语音留言外置生成口（LLM/TTS）。
	 * 与 EffectSink / LED 分端口；未注入 → Materialize 标 generate_failed，不炸 Host。
	 */
	generateVoicemail?: GenerateVoicemailPort | null;
	/**
	 * 信箱未读变化通知（壳 LED/角标）。
	 * 真源仍为 Profile.telephony.voicemails[]；未注入则跳过回调。
	 */
	onVoicemailUnreadChanged?: OnVoicemailUnreadChanged | null;
}

/** undefined 与 null 均视为未注入。 */
export function resolveOptionalPort<T>(value: T | null | undefined): T | null {
	return value === undefined ? null : value;
}

/**
 * Port getter 面：从 createEngineHost 闭包拆出，避免 Host 组合函数 maxFnLines 净增。
 */
export function createInjectedPortAccessorsFromOptions(
	options: CreateEngineHostOptions,
	getMemory: () => MemoryPort | null,
): Pick<
	EngineHost,
	"getMemoryPort" | "getProfilePort" | "getContentPort" | "getEngineLogPort"
> {
	return {
		getMemoryPort: getMemory,
		getProfilePort() {
			return resolveOptionalPort(options.profile);
		},
		getContentPort() {
			return resolveOptionalPort(options.content);
		},
		getEngineLogPort() {
			return resolveOptionalPort(options.engineLog);
		},
	};
}

/**
 * Host 内存 ring +（可选）EngineLogPort 旁路落盘；从 createEngineHost 拆出以控 maxFnLines。
 */
export function createHostPushLog(input: {
	logs: LogRecord[];
	isPersist: () => boolean;
	getEngineLogPort: () => EngineLogPort | null;
	redact: (record: LogRecord) => LogRecord;
}): (record: LogRecord) => void {
	return function pushLog(record: LogRecord): void {
		const safe = input.redact(record);
		input.logs.push(safe);
		if (input.logs.length > 500) {
			input.logs.shift();
		}
		if (!input.isPersist()) {
			return;
		}
		const port = input.getEngineLogPort();
		if (!port) {
			return;
		}
		void port.append({ record: safe }).catch(function () {
			// 旁路失败不打断主路径
		});
	};
}
