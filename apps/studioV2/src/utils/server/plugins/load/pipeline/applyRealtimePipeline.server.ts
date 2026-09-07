/**
	* 将 realtime 槽 entry 贡献写入扫描结果表。
	*/
import type {
	AfterHangupHook,
	CommitContextEnricher,
	CommitExtractContributor,
	PromptProvider,
	ScheduleGate,
	SoftExtraEnricher,
} from "@airpc/rpg-engine";
import type {
	CapabilityPacksManifest,
	PluginCapabilityApi,
} from "@airpc/pack-sdk";
import path from "node:path";
import { emitPluginLog } from "@studio-v2/src/utils/server/plugins/log/pluginLog.server";
import { loadPluginEntryModule } from "@studio-v2/src/utils/server/plugins/load/entry/loadPluginEntry.server";
import {
	asArrayContribution,
	type ScannedPluginContributions,
} from "@studio-v2/src/utils/server/plugins/load/scan/scannedPluginTypes.server";

export async function applyRealtimePipeline(input: {
	pkgDir: string;
	manifest: CapabilityPacksManifest;
	pipe: { slot: string; entry: string };
	api: PluginCapabilityApi;
	out: ScannedPluginContributions;
	slots: string[];
}): Promise<void> {
	const entryPath = path.join(input.pkgDir, input.pipe.entry);
	const loaded = await loadPluginEntryModule({
		absoluteEntryPath: entryPath,
		api: input.api,
		packageRoot: input.pkgDir,
	});
	const items = asArrayContribution(loaded.contribution);
	const slot = input.pipe.slot;
	input.slots.push(slot);

	for (const item of items) {
		applyRealtimeItem({
			slot,
			item,
			manifestId: input.manifest.id,
			out: input.out,
		});
	}

	emitPluginLog({
		type: "plugin.slot_contrib",
		pluginId: input.manifest.id,
		slot,
		entry: input.pipe.entry,
		domain: "realtime",
	});
}

function applyRealtimeItem(input: {
	slot: string;
	item: unknown;
	manifestId: string;
	out: ScannedPluginContributions;
}): void {
	const { slot, item, manifestId, out } = input;
	switch (slot) {
		case "compose.providers": {
			const provider = item as PromptProvider;
			out.extraProviders.push(provider);
			out.packIdByProviderId.set(provider.providerId, manifestId);
			return;
		}
		case "begin.softExtras": {
			const enricher = item as SoftExtraEnricher;
			out.softExtraEnrichers.push(enricher);
			out.packIdByEnricherId.set(enricher.enricherId, manifestId);
			return;
		}
		case "call.afterHangup": {
			const hook = item as AfterHangupHook;
			out.afterHangupHooks.push(hook);
			out.packIdByHookId.set(hook.hookId, manifestId);
			return;
		}
		case "schedule.gates": {
			const gate = item as ScheduleGate;
			out.scheduleGates.push(gate);
			out.packIdByGateId.set(gate.gateId, manifestId);
			return;
		}
		case "commit.context": {
			const enricher = item as CommitContextEnricher;
			out.commitContextEnrichers.push(enricher);
			out.packIdByEnricherId.set(enricher.enricherId, manifestId);
			return;
		}
		case "commit.extract": {
			const contributor = item as CommitExtractContributor;
			out.commitExtractContributors.push(contributor);
			out.packIdByContributorId.set(contributor.contributorId, manifestId);
			return;
		}
		case "tools.register":
		case "effects.register":
		case "dialogue.events":
			emitPluginLog({
				type: "plugin.load_skipped",
				pluginId: manifestId,
				reason: `slot_not_wired:${slot}`,
			});
			return;
		default:
			emitPluginLog({
				type: "plugin.load_failed",
				pluginId: manifestId,
				reason: `unknown_realtime_slot:${slot}`,
			});
	}
}
