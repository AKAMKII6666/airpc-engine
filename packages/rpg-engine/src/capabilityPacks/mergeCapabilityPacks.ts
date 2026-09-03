/**
 * 合并第一方 CapabilityPack：独立于 createEngineHost，避免 Host 巨石净增。
 * 见技术设计 24 §0 / §4；日志类型供 Host pushLog 或测试断言。
 */
import type { PromptProvider } from "../runtime/composer.js";
import {
	createPromptProviderRegistry,
	type PromptProviderRegistry,
} from "../runtime/promptProviderRegistry.js";
import { DEFAULT_PROMPT_PROVIDERS } from "../runtime/defaultPromptProviders.js";
import type {
	AfterHangupHook,
	CommitContextEnricher,
	CommitExtractContributor,
	ScheduleGate,
	SoftExtraEnricher,
	TaskRegistrar,
	TaskTickHandler,
} from "./contributeTypes.js";
import type { FirstPartyPack } from "./types.js";
import {
	assertUniqueIds,
	assertUniquePackIds,
	collectPackContributions,
	type CapabilityPackLogEvent,
} from "./mergeCapabilityPacksCollect.js";

export type { CapabilityPackLogEvent };

export interface MergeCapabilityPacksInput {
	packs: readonly FirstPartyPack[];
	/**
	 * 启用白名单；`undefined` / `null` = 全部启用。
	 * 未列入的 pack 记 `capabilityPack.disabled` 并跳过贡献。
	 */
	enabledPackIds?: readonly string[] | null;
	/** 包贡献之前的默认 Prompt Provider 链；缺省为引擎 DEFAULT_PROMPT_PROVIDERS */
	baseProviders?: readonly PromptProvider[];
}

export interface MergeCapabilityPacksResult {
	promptProviderRegistry: PromptProviderRegistry;
	scheduleGates: ScheduleGate[];
	afterHangupHooks: AfterHangupHook[];
	/** hookId → packId，供 afterHangup 日志 */
	packIdByHookId: ReadonlyMap<string, string>;
	/** gateId → packId，供 schedule_gate 日志 */
	packIdByGateId: ReadonlyMap<string, string>;
	taskRegistrars: TaskRegistrar[];
	/** taskId → packId */
	packIdByTaskId: ReadonlyMap<string, string>;
	taskTickHandlers: TaskTickHandler[];
	softExtraEnrichers: SoftExtraEnricher[];
	commitContextEnrichers: CommitContextEnricher[];
	commitExtractContributors: CommitExtractContributor[];
	enabledPackIds: string[];
	disabledPackIds: string[];
	events: CapabilityPackLogEvent[];
}

/**
 * 静态合并第一方包 → registries / 钩子表（及日志事件）。
 * 重复 packId / providerId / gateId / hookId → 抛错。
 */
export function mergeCapabilityPacks(
	input: MergeCapabilityPacksInput,
): MergeCapabilityPacksResult {
	assertUniquePackIds(input.packs);
	const collected = collectPackContributions(
		input.packs,
		input.enabledPackIds,
	);
	assertUniqueIds(
		collected.scheduleGates.map(function (g) {
			return g.gateId;
		}),
		"schedule gate id",
	);
	assertUniqueIds(
		collected.afterHangupHooks.map(function (h) {
			return h.hookId;
		}),
		"afterHangup hook id",
	);

	const base = input.baseProviders ?? DEFAULT_PROMPT_PROVIDERS;
	const promptProviderRegistry = createPromptProviderRegistry([
		...base,
		...collected.extraProviders,
	]);

	collected.events.push({
		type: "capabilityPack.merge",
		packIds: [...collected.enabledPackIds],
		apiVersion: 1,
	});

	return {
		promptProviderRegistry,
		scheduleGates: collected.scheduleGates,
		afterHangupHooks: collected.afterHangupHooks,
		packIdByHookId: collected.packIdByHookId,
		packIdByGateId: collected.packIdByGateId,
		taskRegistrars: collected.taskRegistrars,
		packIdByTaskId: collected.packIdByTaskId,
		taskTickHandlers: collected.taskTickHandlers,
		softExtraEnrichers: collected.softExtraEnrichers,
		commitContextEnrichers: collected.commitContextEnrichers,
		commitExtractContributors: collected.commitExtractContributors,
		enabledPackIds: collected.enabledPackIds,
		disabledPackIds: collected.disabledPackIds,
		events: collected.events,
	};
}
