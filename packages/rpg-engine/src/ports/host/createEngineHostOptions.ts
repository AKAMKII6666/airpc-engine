/**
 * CreateEngineHostOptions 与 Port 注入辅助；从 engineHostApi 拆出以降文件行数。
 */
import type { LogRecord } from "../../host/types.js";
import type { LoreBootstrapPort } from "../../lore/types.js";
import type { MemoryPort } from "../../memory/types.js";
import type { EffectSink } from "../../runtime/effect/effectSink.js";
import type {
	GenerateVoicemailPort,
	OnVoicemailUnreadChanged,
} from "../../runtime/voicemail/core/ports/voicemailPorts.js";
import type { PromptProviderRegistry } from "../../runtime/prompt/providers/promptProviderRegistry.js";
import type {
	AfterHangupHook,
	ScheduleGate,
	SoftExtraEnricher,
	TaskRegistrar,
} from "../../capabilityPacks/types/contributeTypes.js";
import type { CapabilityPackLogEvent } from "../../capabilityPacks/merge/mergeCapabilityPacks.js";
import type { ToolRegistry } from "../../tools/types.js";
import type { ContentPort } from "../persist/contentPort.js";
import type { EngineLogPort } from "./engineLogPort.js";
import type { ProfilePort } from "../persist/profilePort.js";
import type { PostCallJobStorePort } from "../jobs/postCallJobStorePort.js";
import type { EngineHost } from "./engineHostSurface.js";

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
	/** Studio Server 合流内置、L1 与已启用 L2 后注入；引擎不扫描插件目录。 */
	toolRegistry?: ToolRegistry | null;
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
	/** Prompt Provider Registry；未注入则使用引擎内置默认链。 */
	promptProviderRegistry?: PromptProviderRegistry | null;
	/** L1 call.afterHangup 钩子；来自 mergeCapabilityPacks */
	afterHangupHooks?: readonly AfterHangupHook[] | null;
	/** hookId → packId，供 afterHangup 日志 */
	packIdByHookId?: ReadonlyMap<string, string> | null;
	/**
	 * L1 schedule.gates；Studio 应传入 merge 结果。
	 * `undefined`/`null` → 回退内置 outbound-window-gate；显式 `[]` → 无闸。
	 */
	scheduleGates?: readonly ScheduleGate[] | null;
	/** gateId → packId，供 schedule_gate 日志 */
	packIdByGateId?: ReadonlyMap<string, string> | null;
	/** L1 begin.softExtras；缺省空 */
	softExtraEnrichers?: readonly SoftExtraEnricher[] | null;
	/**
	 * L1 tasks.register；Host 创建时各 register 一次。
	 * 完整宿主定时 / onTick 属后续；本字段只保证形状可挂。
	 */
	taskRegistrars?: readonly TaskRegistrar[] | null;
	/** taskId → packId */
	packIdByTaskId?: ReadonlyMap<string, string> | null;
	/**
	 * 装配期 CapabilityPack 事件（merge/disabled/rejected）；
	 * Host 创建时写入 log ring，便于 Trace 对齐 packId。
	 */
	capabilityPackEvents?: readonly CapabilityPackLogEvent[] | null;
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
	/**
	 * 挂机后副作用 job 持久化口；未注入时仅 Host 内存态（测试用）。
	 * 本机实现：engineIOModule 的 createFsPostCallJobStorePort。
	 */
	postCallJob?: PostCallJobStorePort | null;
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
