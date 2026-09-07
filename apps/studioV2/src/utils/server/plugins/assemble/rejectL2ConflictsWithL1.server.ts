/**
	* L1 保留 id 与 L2 贡献冲突检测 / 剥除。
	*/
import type { MergeCapabilityPacksResult } from "@airpc/rpg-engine";
import { emitPluginLog } from "@studio-v2/src/utils/server/plugins/log/pluginLog.server";
import {
	clearPluginTasksForPlugin,
	unregisterPluginTickHandlersForPlugin,
} from "@studio-v2/src/utils/server/plugins/tasks/pluginTaskScheduler.server";
import {
	emptyContributions,
	type ScannedPluginContributions,
} from "@studio-v2/src/utils/server/plugins/load/scan/scannedPluginTypes.server";

export type L1ReservedIds = {
	packIds: ReadonlySet<string>;
	hookIds: ReadonlySet<string>;
	gateIds: ReadonlySet<string>;
	taskIds: ReadonlySet<string>;
	providerIds: ReadonlySet<string>;
};

export function collectL1ReservedIds(
	l1: MergeCapabilityPacksResult,
): L1ReservedIds {
	return {
		packIds: new Set(l1.enabledPackIds),
		hookIds: new Set(l1.packIdByHookId.keys()),
		gateIds: new Set(l1.packIdByGateId.keys()),
		taskIds: new Set(l1.packIdByTaskId.keys()),
		providerIds: new Set(l1.promptProviderRegistry.getProviderIds()),
	};
}

function firstOwnedConflict(
	pluginId: string,
	owned: Map<string, string>,
	reserved: ReadonlySet<string>,
	prefix: string,
): string | null {
	for (const [id, owner] of owned) {
		if (owner === pluginId && reserved.has(id)) {
			return `${prefix}:${id}`;
		}
	}
	return null;
}

export function conflictReasonForPlugin(
	pluginId: string,
	plugins: ScannedPluginContributions,
	reserved: L1ReservedIds,
): string | null {
	if (reserved.packIds.has(pluginId)) {
		return `conflict_l1_pack_id:${pluginId}`;
	}
	return (
		firstOwnedConflict(
			pluginId,
			plugins.packIdByHookId,
			reserved.hookIds,
			"conflict_l1_hook_id",
		) ??
		firstOwnedConflict(
			pluginId,
			plugins.packIdByGateId,
			reserved.gateIds,
			"conflict_l1_gate_id",
		) ??
		firstOwnedConflict(
			pluginId,
			plugins.packIdByTaskId,
			reserved.taskIds,
			"conflict_l1_task_id",
		) ??
		firstOwnedConflict(
			pluginId,
			plugins.packIdByProviderId,
			reserved.providerIds,
			"conflict_l1_provider_id",
		)
	);
}

function firstCrossPluginDuplicate(
	pluginId: string,
	staging: Map<string, string>,
	accepted: Map<string, string>,
	prefix: string,
): string | null {
	for (const [id, owner] of staging) {
		if (owner !== pluginId) continue;
		const prev = accepted.get(id);
		if (prev && prev !== pluginId) {
			return `${prefix}:${id}:owned_by:${prev}`;
		}
	}
	return null;
}

/**
	* staging 相对已接受 L2 贡献的重复 id（跨插件）。
	*/
export function conflictReasonAgainstAcceptedL2(
	pluginId: string,
	staging: ScannedPluginContributions,
	accepted: ScannedPluginContributions,
): string | null {
	const checks: Array<[Map<string, string>, Map<string, string>, string]> = [
		[staging.packIdByHookId, accepted.packIdByHookId, "conflict_l2_hook_id"],
		[staging.packIdByGateId, accepted.packIdByGateId, "conflict_l2_gate_id"],
		[staging.packIdByTaskId, accepted.packIdByTaskId, "conflict_l2_task_id"],
		[
			staging.packIdByProviderId,
			accepted.packIdByProviderId,
			"conflict_l2_provider_id",
		],
		[
			staging.packIdByEnricherId,
			accepted.packIdByEnricherId,
			"conflict_l2_enricher_id",
		],
		[
			staging.packIdByContributorId,
			accepted.packIdByContributorId,
			"conflict_l2_contributor_id",
		],
	];
	for (const [st, ac, prefix] of checks) {
		const hit = firstCrossPluginDuplicate(pluginId, st, ac, prefix);
		if (hit) return hit;
	}
	return null;
}

function deleteOwnedKeys(map: Map<string, string>, pluginId: string): void {
	for (const [k, owner] of [...map]) {
		if (owner === pluginId) map.delete(k);
	}
}

export function stripPluginContributions(
	plugins: ScannedPluginContributions,
	pluginId: string,
): void {
	unregisterPluginTickHandlersForPlugin(pluginId);
	clearPluginTasksForPlugin(pluginId);
	plugins.extraProviders = plugins.extraProviders.filter(function (p) {
		return plugins.packIdByProviderId.get(p.providerId) !== pluginId;
	});
	plugins.softExtraEnrichers = plugins.softExtraEnrichers.filter(function (e) {
		return plugins.packIdByEnricherId.get(e.enricherId) !== pluginId;
	});
	plugins.afterHangupHooks = plugins.afterHangupHooks.filter(function (h) {
		return plugins.packIdByHookId.get(h.hookId) !== pluginId;
	});
	plugins.scheduleGates = plugins.scheduleGates.filter(function (g) {
		return plugins.packIdByGateId.get(g.gateId) !== pluginId;
	});
	plugins.taskRegistrars = plugins.taskRegistrars.filter(function (t) {
		return plugins.packIdByTaskId.get(t.taskId) !== pluginId;
	});
	plugins.taskTickHandlers = plugins.taskTickHandlers.filter(function (t) {
		return plugins.packIdByTaskId.get(t.taskId) !== pluginId;
	});
	plugins.commitContextEnrichers = plugins.commitContextEnrichers.filter(
		function (e) {
			return plugins.packIdByEnricherId.get(e.enricherId) !== pluginId;
		},
	);
	plugins.commitExtractContributors = plugins.commitExtractContributors.filter(
		function (c) {
			return plugins.packIdByContributorId.get(c.contributorId) !== pluginId;
		},
	);
	plugins.outboundPrepare = plugins.outboundPrepare.filter(function (h) {
		return h.pluginId !== pluginId;
	});
	plugins.outboundRequest = plugins.outboundRequest.filter(function (h) {
		return h.pluginId !== pluginId;
	});
	plugins.uiPanels = plugins.uiPanels.filter(function (p) {
		return p.pluginId !== pluginId;
	});
	deleteOwnedKeys(plugins.packIdByHookId, pluginId);
	deleteOwnedKeys(plugins.packIdByGateId, pluginId);
	deleteOwnedKeys(plugins.packIdByTaskId, pluginId);
	deleteOwnedKeys(plugins.packIdByEnricherId, pluginId);
	deleteOwnedKeys(plugins.packIdByProviderId, pluginId);
	deleteOwnedKeys(plugins.packIdByContributorId, pluginId);
	plugins.loaded = plugins.loaded.filter(function (l) {
		return l.pluginId !== pluginId;
	});
}

export function mergePluginStagingInto(
	target: ScannedPluginContributions,
	staging: ScannedPluginContributions,
): void {
	target.extraProviders.push(...staging.extraProviders);
	target.softExtraEnrichers.push(...staging.softExtraEnrichers);
	target.afterHangupHooks.push(...staging.afterHangupHooks);
	target.scheduleGates.push(...staging.scheduleGates);
	target.taskRegistrars.push(...staging.taskRegistrars);
	target.taskTickHandlers.push(...staging.taskTickHandlers);
	target.commitContextEnrichers.push(...staging.commitContextEnrichers);
	target.commitExtractContributors.push(...staging.commitExtractContributors);
	target.outboundPrepare.push(...staging.outboundPrepare);
	target.outboundRequest.push(...staging.outboundRequest);
	target.uiPanels.push(...staging.uiPanels);
	target.loaded.push(...staging.loaded);
	for (const [k, v] of staging.packIdByHookId) target.packIdByHookId.set(k, v);
	for (const [k, v] of staging.packIdByGateId) target.packIdByGateId.set(k, v);
	for (const [k, v] of staging.packIdByTaskId) target.packIdByTaskId.set(k, v);
	for (const [k, v] of staging.packIdByEnricherId) {
		target.packIdByEnricherId.set(k, v);
	}
	for (const [k, v] of staging.packIdByProviderId) {
		target.packIdByProviderId.set(k, v);
	}
	for (const [k, v] of staging.packIdByContributorId) {
		target.packIdByContributorId.set(k, v);
	}
}

/**
	* 就地剔除与 L1 冲突的 L2 包（安全网；主路径应在 merge 前拒载）。
	*/
export function rejectL2ConflictsWithL1(input: {
	l1: MergeCapabilityPacksResult;
	plugins: ScannedPluginContributions;
}): void {
	const reserved = collectL1ReservedIds(input.l1);
	const pluginIds = new Set<string>(
		input.plugins.loaded.map(function (l) {
			return l.pluginId;
		}),
	);
	for (const owner of input.plugins.packIdByHookId.values()) {
		pluginIds.add(owner);
	}
	for (const owner of input.plugins.packIdByGateId.values()) {
		pluginIds.add(owner);
	}
	for (const owner of input.plugins.packIdByTaskId.values()) {
		pluginIds.add(owner);
	}
	for (const owner of input.plugins.packIdByEnricherId.values()) {
		pluginIds.add(owner);
	}
	for (const owner of input.plugins.packIdByProviderId.values()) {
		pluginIds.add(owner);
	}
	for (const pluginId of pluginIds) {
		const reason = conflictReasonForPlugin(pluginId, input.plugins, reserved);
		if (!reason) continue;
		input.plugins.failures.push({ pluginId, reason });
		emitPluginLog({
			type: "plugin.load_failed",
			pluginId,
			reason,
		});
		stripPluginContributions(input.plugins, pluginId);
	}
}

export function createEmptyStaging(): ScannedPluginContributions {
	return emptyContributions();
}
