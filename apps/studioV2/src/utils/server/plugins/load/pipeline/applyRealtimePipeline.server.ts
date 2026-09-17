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
	RegisteredTool,
} from "@airpc/rpg-engine";
import type {
	CapabilityPacksManifest,
	PluginCapabilityApi,
	PluginToolContribution,
} from "@airpc/pack-sdk";
import { assertPluginToolContribution } from "@airpc/pack-sdk";
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
			manifestDisplayName: input.manifest.name ?? input.manifest.id,
			api: input.api,
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
	manifestDisplayName: string;
	api: PluginCapabilityApi;
	out: ScannedPluginContributions;
}): void {
	const { slot, item, manifestId, manifestDisplayName, out } = input;
	switch (slot) {
		case "tools.register": {
			registerPluginTool({
				item,
				manifestId,
				manifestDisplayName,
				api: input.api,
				out,
			});
			return;
		}
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

function registerPluginTool(input: {
	item: unknown;
	manifestId: string;
	manifestDisplayName: string;
	api: PluginCapabilityApi;
	out: ScannedPluginContributions;
}): void {
	assertPluginToolContribution(input.item);
	const contribution: PluginToolContribution = input.item;
	const toolId = `plugin:${input.manifestId}:${contribution.localToolId}`;
	if (input.out.packIdByToolId.has(toolId)) {
		throw new Error(`plugin_tool_conflict:${toolId}`);
	}
	const registration: RegisteredTool = {
		definition: {
			toolId,
			displayName: contribution.displayName.trim(),
			description: contribution.description.trim(),
			inputSchema: contribution.inputSchema,
			allowedCardKinds: [...contribution.allowedCardKinds],
			allowedInPlayback: contribution.allowedInPlayback,
			behavior: "external",
		},
		source: {
			kind: "plugin",
			providerId: input.manifestId,
			displayName: input.manifestDisplayName,
		},
		inheritByDefault: false,
		invoke(call) {
			return contribution.invoke({
				session: {
					sessionId: call.sessionId,
					userId: call.userId,
					agentId: call.agentId,
					chapterId: call.chapterId,
					cardId: call.cardId,
				},
				args: call.args,
				capabilities: input.api,
			});
		},
	};
	input.out.registeredTools.push(registration);
	input.out.packIdByToolId.set(toolId, input.manifestId);
}
