/**
 * mergeCapabilityPacks 的贡献收集与校验助手（控函数行数）。
 */
import type { PromptProvider } from "../runtime/composer.js";
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

export type CapabilityPackLogEvent =
	| {
			type: "capabilityPack.merge";
			packIds: string[];
			apiVersion: 1;
	  }
	| {
			type: "capabilityPack.merge_rejected";
			packId: string;
			reason: string;
	  }
	| {
			type: "capabilityPack.disabled";
			packId: string;
	  }
	| {
			type: "capabilityPack.schedule_gate";
			packId: string;
			gateId: string;
			allowed: boolean;
	  }
	| {
			type: "capabilityPack.afterHangup";
			hookCount: number;
			packIds: string[];
	  }
	| {
			type: "capabilityPack.afterHangup_failed";
			packId: string;
			hookId: string;
			message: string;
	  };

export type CollectedPackContributions = {
	events: CapabilityPackLogEvent[];
	enabledPackIds: string[];
	disabledPackIds: string[];
	extraProviders: PromptProvider[];
	scheduleGates: ScheduleGate[];
	afterHangupHooks: AfterHangupHook[];
	packIdByHookId: Map<string, string>;
	/** gateId → packId，供 schedule_gate 日志 */
	packIdByGateId: Map<string, string>;
	taskRegistrars: TaskRegistrar[];
	/** taskId → packId，供 tasks.register 启动日志 */
	packIdByTaskId: Map<string, string>;
	taskTickHandlers: TaskTickHandler[];
	softExtraEnrichers: SoftExtraEnricher[];
	commitContextEnrichers: CommitContextEnricher[];
	commitExtractContributors: CommitExtractContributor[];
};

function asPromptProviders(value: unknown, packId: string): PromptProvider[] {
	if (value === undefined) return [];
	if (!Array.isArray(value)) {
		throw new Error(
			`capabilityPack ${packId}: compose.providers must be PromptProvider[]`,
		);
	}
	for (const item of value) {
		if (
			typeof item !== "object" ||
			item === null ||
			typeof (item as PromptProvider).providerId !== "string" ||
			typeof (item as PromptProvider).apply !== "function"
		) {
			throw new Error(
				`capabilityPack ${packId}: compose.providers entries must be PromptProvider`,
			);
		}
	}
	return value as PromptProvider[];
}

function asScheduleGates(value: unknown, packId: string): ScheduleGate[] {
	if (value === undefined) return [];
	if (!Array.isArray(value)) {
		throw new Error(
			`capabilityPack ${packId}: schedule.gates must be ScheduleGate[]`,
		);
	}
	for (const item of value) {
		if (
			typeof item !== "object" ||
			item === null ||
			typeof (item as ScheduleGate).gateId !== "string" ||
			typeof (item as ScheduleGate).allow !== "function"
		) {
			throw new Error(
				`capabilityPack ${packId}: schedule.gates entries must be ScheduleGate`,
			);
		}
	}
	return value as ScheduleGate[];
}

function asAfterHangupHooks(value: unknown, packId: string): AfterHangupHook[] {
	if (value === undefined) return [];
	if (!Array.isArray(value)) {
		throw new Error(
			`capabilityPack ${packId}: call.afterHangup must be AfterHangupHook[]`,
		);
	}
	for (const item of value) {
		if (
			typeof item !== "object" ||
			item === null ||
			typeof (item as AfterHangupHook).hookId !== "string" ||
			typeof (item as AfterHangupHook).run !== "function"
		) {
			throw new Error(
				`capabilityPack ${packId}: call.afterHangup entries must be AfterHangupHook`,
			);
		}
	}
	return value as AfterHangupHook[];
}

function asTaskRegistrars(value: unknown, packId: string): TaskRegistrar[] {
	if (value === undefined) return [];
	if (!Array.isArray(value)) {
		throw new Error(
			`capabilityPack ${packId}: tasks.register must be TaskRegistrar[]`,
		);
	}
	return value as TaskRegistrar[];
}

function asTaskTickHandlers(value: unknown, packId: string): TaskTickHandler[] {
	if (value === undefined) return [];
	if (!Array.isArray(value)) {
		throw new Error(
			`capabilityPack ${packId}: tasks.onTick must be TaskTickHandler[]`,
		);
	}
	return value as TaskTickHandler[];
}

function asSoftExtraEnrichers(
	value: unknown,
	packId: string,
): SoftExtraEnricher[] {
	if (value === undefined) return [];
	if (!Array.isArray(value)) {
		throw new Error(
			`capabilityPack ${packId}: begin.softExtras must be SoftExtraEnricher[]`,
		);
	}
	return value as SoftExtraEnricher[];
}

function asCommitContextEnrichers(
	value: unknown,
	packId: string,
): CommitContextEnricher[] {
	if (value === undefined) return [];
	if (!Array.isArray(value)) {
		throw new Error(
			`capabilityPack ${packId}: commit.context must be CommitContextEnricher[]`,
		);
	}
	return value as CommitContextEnricher[];
}

function asCommitExtractContributors(
	value: unknown,
	packId: string,
): CommitExtractContributor[] {
	if (value === undefined) return [];
	if (!Array.isArray(value)) {
		throw new Error(
			`capabilityPack ${packId}: commit.extract must be CommitExtractContributor[]`,
		);
	}
	return value as CommitExtractContributor[];
}

export function assertUniquePackIds(packs: readonly FirstPartyPack[]): void {
	const seen = new Set<string>();
	for (const pack of packs) {
		const id = pack.manifest.packId;
		if (seen.has(id)) {
			throw new Error(`duplicate capability pack id: ${id}`);
		}
		seen.add(id);
	}
}

export function assertUniqueIds(ids: readonly string[], label: string): void {
	const seen = new Set<string>();
	for (const id of ids) {
		if (seen.has(id)) {
			throw new Error(`duplicate ${label}: ${id}`);
		}
		seen.add(id);
	}
}

function appendPackContribute(
	pack: FirstPartyPack,
	out: CollectedPackContributions,
): void {
	const packId = pack.manifest.packId;
	for (const provider of asPromptProviders(
		pack.contribute.realtime?.["compose.providers"],
		packId,
	)) {
		out.extraProviders.push(provider);
	}
	for (const gate of asScheduleGates(
		pack.contribute.background?.["schedule.gates"],
		packId,
	)) {
		out.scheduleGates.push(gate);
		out.packIdByGateId.set(gate.gateId, packId);
	}
	for (const hook of asAfterHangupHooks(
		pack.contribute.realtime?.["call.afterHangup"],
		packId,
	)) {
		out.afterHangupHooks.push(hook);
		out.packIdByHookId.set(hook.hookId, packId);
	}
	for (const reg of asTaskRegistrars(
		pack.contribute.background?.["tasks.register"],
		packId,
	)) {
		out.taskRegistrars.push(reg);
		out.packIdByTaskId.set(reg.taskId, packId);
	}
	for (const tick of asTaskTickHandlers(
		pack.contribute.background?.["tasks.onTick"],
		packId,
	)) {
		out.taskTickHandlers.push(tick);
	}
	for (const enricher of asSoftExtraEnrichers(
		pack.contribute.realtime?.["begin.softExtras"],
		packId,
	)) {
		out.softExtraEnrichers.push(enricher);
	}
	for (const enricher of asCommitContextEnrichers(
		pack.contribute.realtime?.["commit.context"],
		packId,
	)) {
		out.commitContextEnrichers.push(enricher);
	}
	for (const contributor of asCommitExtractContributors(
		pack.contribute.realtime?.["commit.extract"],
		packId,
	)) {
		out.commitExtractContributors.push(contributor);
	}
}

export function collectPackContributions(
	packs: readonly FirstPartyPack[],
	enabledPackIds: readonly string[] | null | undefined,
): CollectedPackContributions {
	const enableAll =
		enabledPackIds === undefined || enabledPackIds === null;
	const enabledSet = enableAll ? null : new Set(enabledPackIds);
	const out: CollectedPackContributions = {
		events: [],
		enabledPackIds: [],
		disabledPackIds: [],
		extraProviders: [],
		scheduleGates: [],
		afterHangupHooks: [],
		packIdByHookId: new Map(),
		packIdByGateId: new Map(),
		taskRegistrars: [],
		packIdByTaskId: new Map(),
		taskTickHandlers: [],
		softExtraEnrichers: [],
		commitContextEnrichers: [],
		commitExtractContributors: [],
	};

	for (const pack of packs) {
		const packId = pack.manifest.packId;
		if (enabledSet && !enabledSet.has(packId)) {
			out.disabledPackIds.push(packId);
			out.events.push({ type: "capabilityPack.disabled", packId });
			continue;
		}
		if (pack.manifest.apiVersion !== 1) {
			out.events.push({
				type: "capabilityPack.merge_rejected",
				packId,
				reason: `unsupported apiVersion: ${String(pack.manifest.apiVersion)}`,
			});
			continue;
		}
		out.enabledPackIds.push(packId);
		appendPackContribute(pack, out);
	}
	return out;
}
