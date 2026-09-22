/**
	* realtime 槽单项贡献写入。
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
	PluginCapabilityApi,
	PluginToolContribution,
} from "@airpc/pack-sdk";
import { assertPluginToolContribution } from "@airpc/pack-sdk";
import { emitPluginLog } from "@studio-v2/src/utils/server/plugins/log/pluginLog.server";
import type { ScannedPluginContributions } from "@studio-v2/src/utils/server/plugins/load/scan/scannedPluginTypes.server";

export function applyRealtimeItem(input: {
	slot: string;
	item: unknown;
	manifestId: string;
	manifestDisplayName: string;
	api: PluginCapabilityApi;
	out: ScannedPluginContributions;
}): void {
	const handler = REALTIME_SLOT_HANDLERS[input.slot];
	if (handler) {
		handler(input);
		return;
	}
	if (input.slot === "effects.register" || input.slot === "dialogue.events") {
		emitPluginLog({
			type: "plugin.load_skipped",
			pluginId: input.manifestId,
			reason: `slot_not_wired:${input.slot}`,
		});
		return;
	}
	emitPluginLog({
		type: "plugin.load_failed",
		pluginId: input.manifestId,
		reason: `unknown_realtime_slot:${input.slot}`,
	});
}

type RealtimeItemInput = {
	slot: string;
	item: unknown;
	manifestId: string;
	manifestDisplayName: string;
	api: PluginCapabilityApi;
	out: ScannedPluginContributions;
};

const REALTIME_SLOT_HANDLERS: Record<
	string,
	(input: RealtimeItemInput) => void
> = {
	"tools.register": function (input) {
		registerPluginTool(input);
	},
	"compose.providers": function (input) {
		const provider = input.item as PromptProvider;
		input.out.extraProviders.push(provider);
		input.out.packIdByProviderId.set(provider.providerId, input.manifestId);
	},
	"begin.softExtras": function (input) {
		const enricher = input.item as SoftExtraEnricher;
		input.out.softExtraEnrichers.push(enricher);
		input.out.packIdByEnricherId.set(enricher.enricherId, input.manifestId);
	},
	"call.afterHangup": function (input) {
		const hook = input.item as AfterHangupHook;
		input.out.afterHangupHooks.push(hook);
		input.out.packIdByHookId.set(hook.hookId, input.manifestId);
	},
	"schedule.gates": function (input) {
		const gate = input.item as ScheduleGate;
		input.out.scheduleGates.push(gate);
		input.out.packIdByGateId.set(gate.gateId, input.manifestId);
	},
	"commit.context": function (input) {
		const enricher = input.item as CommitContextEnricher;
		input.out.commitContextEnrichers.push(enricher);
		input.out.packIdByEnricherId.set(enricher.enricherId, input.manifestId);
	},
	"commit.extract": function (input) {
		const contributor = input.item as CommitExtractContributor;
		input.out.commitExtractContributors.push(contributor);
		input.out.packIdByContributorId.set(
			contributor.contributorId,
			input.manifestId,
		);
	},
};

function registerPluginTool(input: RealtimeItemInput): void {
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
