/**
	* assembleCapabilityRuntime：合流 L1/L2 map 与结果对象组装。
	*/
import {
	createPromptProviderRegistry,
	createToolRegistry,
	type MergeCapabilityPacksResult,
	type PromptProviderRegistry,
	type ToolRegistry,
} from "@airpc/rpg-engine";
import type { ScannedPluginContributions } from "@studio-v2/src/utils/server/plugins/load/scan/scanPlugins.server";

export function mergeIdMaps(
	l1: ReadonlyMap<string, string>,
	l2: ReadonlyMap<string, string>,
): Map<string, string> {
	const out = new Map(l1);
	for (const [k, v] of l2) {
		out.set(k, v);
	}
	return out;
}

/** 组装 AssembledCapabilityRuntime 字段；返回值可直接赋给缓存。 */
export function buildAssembledCapabilityRuntime(input: {
	l1: MergeCapabilityPacksResult;
	plugins: ScannedPluginContributions;
}): {
	promptProviderRegistry: PromptProviderRegistry;
	afterHangupHooks: MergeCapabilityPacksResult["afterHangupHooks"][number][];
	packIdByHookId: Map<string, string>;
	scheduleGates: MergeCapabilityPacksResult["scheduleGates"][number][];
	packIdByGateId: Map<string, string>;
	softExtraEnrichers: MergeCapabilityPacksResult["softExtraEnrichers"][number][];
	taskRegistrars: MergeCapabilityPacksResult["taskRegistrars"][number][];
	packIdByTaskId: Map<string, string>;
	commitContextEnrichers: MergeCapabilityPacksResult["commitContextEnrichers"][number][];
	commitExtractContributors: MergeCapabilityPacksResult["commitExtractContributors"][number][];
	capabilityPackEvents: MergeCapabilityPacksResult["events"];
	plugins: ScannedPluginContributions;
	uiPanels: ScannedPluginContributions["uiPanels"];
	loadedPlugins: ScannedPluginContributions["loaded"];
	pluginFailures: ScannedPluginContributions["failures"];
	toolRegistry: ToolRegistry;
} {
	const { l1, plugins } = input;
	const promptProviderRegistry = createPromptProviderRegistry([
		...l1.promptProviderRegistry.providers,
		...plugins.extraProviders,
	]);
	const toolRegistry = createToolRegistry([
		...l1.registeredTools,
		...plugins.registeredTools,
	]);

	return {
		promptProviderRegistry,
		afterHangupHooks: [...l1.afterHangupHooks, ...plugins.afterHangupHooks],
		packIdByHookId: mergeIdMaps(l1.packIdByHookId, plugins.packIdByHookId),
		scheduleGates: [...l1.scheduleGates, ...plugins.scheduleGates],
		packIdByGateId: mergeIdMaps(l1.packIdByGateId, plugins.packIdByGateId),
		softExtraEnrichers: [
			...l1.softExtraEnrichers,
			...plugins.softExtraEnrichers,
		],
		taskRegistrars: [...l1.taskRegistrars, ...plugins.taskRegistrars],
		packIdByTaskId: mergeIdMaps(l1.packIdByTaskId, plugins.packIdByTaskId),
		commitContextEnrichers: [
			...l1.commitContextEnrichers,
			...plugins.commitContextEnrichers,
		],
		commitExtractContributors: [
			...l1.commitExtractContributors,
			...plugins.commitExtractContributors,
		],
		capabilityPackEvents: l1.events,
		plugins,
		uiPanels: plugins.uiPanels,
		loadedPlugins: plugins.loaded,
		pluginFailures: plugins.failures,
		toolRegistry,
	};
}
