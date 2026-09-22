/**
	* background 槽单项贡献写入。
	*/
import type { ScheduleGate, TaskRegistrar, TaskTickHandler } from "@airpc/rpg-engine";
import type { PluginCapabilityApi } from "@airpc/pack-sdk";
import { emitPluginLog } from "@studio-v2/src/utils/server/plugins/log/pluginLog.server";
import { registerPluginTickHandler } from "@studio-v2/src/utils/server/plugins/tasks/pluginTaskScheduler.server";
import type { ScannedPluginContributions } from "@studio-v2/src/utils/server/plugins/load/scan/scannedPluginTypes.server";
import { runOutboundRequestContributions } from "./backgroundOutbound.server";

export function applyBackgroundItem(input: {
	slot: string;
	item: unknown;
	manifestId: string;
	api: PluginCapabilityApi;
	out: ScannedPluginContributions;
}): void {
	const handler = BACKGROUND_SLOT_HANDLERS[input.slot];
	if (handler) {
		handler(input);
		return;
	}
	emitPluginLog({
		type: "plugin.load_failed",
		pluginId: input.manifestId,
		reason: `unknown_background_slot:${input.slot}`,
	});
}

type BackgroundItemInput = {
	slot: string;
	item: unknown;
	manifestId: string;
	api: PluginCapabilityApi;
	out: ScannedPluginContributions;
};

const BACKGROUND_SLOT_HANDLERS: Record<
	string,
	(input: BackgroundItemInput) => void
> = {
	"tasks.register": function (input) {
		const reg = input.item as TaskRegistrar;
		input.out.taskRegistrars.push(reg);
		input.out.packIdByTaskId.set(reg.taskId, input.manifestId);
	},
	"tasks.onTick": function (input) {
		registerBackgroundTick(input);
	},
	"outbound.prepare": function (input) {
		input.out.outboundPrepare.push({
			pluginId: input.manifestId,
			run: input.item as (input: Record<string, unknown>) => unknown,
		});
	},
	"outbound.request": function (input) {
		input.out.outboundRequest.push({
			pluginId: input.manifestId,
			run: input.item as (input: Record<string, unknown>) => unknown,
		});
	},
	"schedule.gates": function (input) {
		const gate = input.item as ScheduleGate;
		input.out.scheduleGates.push(gate);
		input.out.packIdByGateId.set(gate.gateId, input.manifestId);
	},
	"schedule.topic": function (input) {
		emitPluginLog({
			type: "plugin.load_skipped",
			pluginId: input.manifestId,
			reason: "slot_not_wired:schedule.topic",
		});
	},
};

function registerBackgroundTick(input: BackgroundItemInput): void {
	const tick = input.item as TaskTickHandler;
	const { manifestId, api, out } = input;
	out.taskTickHandlers.push(tick);
	out.packIdByTaskId.set(tick.taskId, manifestId);
	registerPluginTickHandler(manifestId, tick.taskId, async function (ctx) {
		await tick.onTick({
			nowIso: ctx.nowIso,
			packId: manifestId,
		});
		await runOutboundRequestContributions({
			api,
			manifestId,
			out,
			taskId: ctx.taskId,
			nowIso: ctx.nowIso,
			payload: ctx.payload,
		});
	});
}
