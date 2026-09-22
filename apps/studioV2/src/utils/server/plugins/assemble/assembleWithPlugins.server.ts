/**
	* L1 静态 merge + L2 plugins 扫描合流 → Host / Orchestrator 注入物。
	*/
import {
	type AfterHangupHook,
	type SoftExtraEnricher,
	type ScheduleGate,
	type TaskRegistrar,
	type CommitContextEnricher,
	type CommitExtractContributor,
	type EngineHost,
	type PromptProviderRegistry,
	type ToolRegistry,
	type MergeCapabilityPacksResult,
} from "@airpc/rpg-engine";
import { assembleFirstPartyCapabilityPacks } from "@studio-v2/src/utils/server/capabilityPacks/assembleFirstPartyPacks.server";
import {
	scanAndLoadPlugins,
	type PluginLoadFailure,
	type PluginLoadedInfo,
	type PluginUiPanelDescriptor,
	type ScannedPluginContributions,
} from "@studio-v2/src/utils/server/plugins/load/scan/scanPlugins.server";
import { rejectL2ConflictsWithL1, collectL1ReservedIds } from "@studio-v2/src/utils/server/plugins/assemble/rejectL2ConflictsWithL1.server";
import type { PluginOutboundRequest } from "@airpc/pack-sdk";
import { buildAssembledCapabilityRuntime } from "./assembleCapabilityRuntimeHelpers.server";

export type AssembledCapabilityRuntime = {
	promptProviderRegistry: PromptProviderRegistry;
	afterHangupHooks: readonly AfterHangupHook[];
	packIdByHookId: ReadonlyMap<string, string>;
	scheduleGates: readonly ScheduleGate[];
	packIdByGateId: ReadonlyMap<string, string>;
	softExtraEnrichers: readonly SoftExtraEnricher[];
	taskRegistrars: readonly TaskRegistrar[];
	packIdByTaskId: ReadonlyMap<string, string>;
	commitContextEnrichers: readonly CommitContextEnricher[];
	commitExtractContributors: readonly CommitExtractContributor[];
	capabilityPackEvents: MergeCapabilityPacksResult["events"];
	plugins: ScannedPluginContributions;
	uiPanels: PluginUiPanelDescriptor[];
	loadedPlugins: PluginLoadedInfo[];
	pluginFailures: PluginLoadFailure[];
	toolRegistry: ToolRegistry;
};

let cached: AssembledCapabilityRuntime | null = null;

export function resetAssembledCapabilityRuntimeForTests(): void {
	cached = null;
}

/**
	* 装配 L1+L2；进程内缓存（通话中不热插包）。
	*/
export async function assembleCapabilityRuntime(input: {
	getHost: () => EngineHost | Promise<EngineHost>;
	requestOutbound?: (
		input: PluginOutboundRequest,
	) => Promise<{ accepted: boolean; reason?: string }>;
	pluginsRoot?: string;
	forceReload?: boolean;
}): Promise<AssembledCapabilityRuntime> {
	if (cached && !input.forceReload) {
		return cached;
	}
	const l1 = assembleFirstPartyCapabilityPacks();
	const reservedL1 = collectL1ReservedIds(l1);
	const plugins = await scanAndLoadPlugins({
		getHost: input.getHost,
		requestOutbound: input.requestOutbound,
		pluginsRoot: input.pluginsRoot,
		reservedL1,
	});
	rejectL2ConflictsWithL1({ l1, plugins });

	cached = buildAssembledCapabilityRuntime({ l1, plugins });
	return cached;
}

export function getCachedCapabilityRuntime(): AssembledCapabilityRuntime | null {
	return cached;
}
