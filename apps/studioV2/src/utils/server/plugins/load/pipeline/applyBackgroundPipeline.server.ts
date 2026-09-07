/**
	* 将 background 槽 entry 贡献写入扫描结果表。
	*/
import type { ScheduleGate, TaskRegistrar, TaskTickHandler } from "@airpc/rpg-engine";
import type {
	CapabilityPacksManifest,
	PluginCapabilityApi,
	PluginOutboundRequest,
} from "@airpc/pack-sdk";
import path from "node:path";
import { emitPluginLog } from "@studio-v2/src/utils/server/plugins/log/pluginLog.server";
import { loadPluginEntryModule } from "@studio-v2/src/utils/server/plugins/load/entry/loadPluginEntry.server";
import { registerPluginTickHandler } from "@studio-v2/src/utils/server/plugins/tasks/pluginTaskScheduler.server";
import {
	asArrayContribution,
	type ScannedPluginContributions,
} from "@studio-v2/src/utils/server/plugins/load/scan/scannedPluginTypes.server";

export async function applyBackgroundPipeline(input: {
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
		applyBackgroundItem({
			slot,
			item,
			manifestId: input.manifest.id,
			api: input.api,
			out: input.out,
		});
	}

	emitPluginLog({
		type: "plugin.slot_contrib",
		pluginId: input.manifest.id,
		slot,
		entry: input.pipe.entry,
		domain: "background",
	});
}

function applyBackgroundItem(input: {
	slot: string;
	item: unknown;
	manifestId: string;
	api: PluginCapabilityApi;
	out: ScannedPluginContributions;
}): void {
	const { slot, item, manifestId, api, out } = input;
	switch (slot) {
		case "tasks.register": {
			const reg = item as TaskRegistrar;
			out.taskRegistrars.push(reg);
			out.packIdByTaskId.set(reg.taskId, manifestId);
			return;
		}
		case "tasks.onTick": {
			const tick = item as TaskTickHandler;
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
			return;
		}
		case "outbound.prepare":
			out.outboundPrepare.push({
				pluginId: manifestId,
				run: item as (input: Record<string, unknown>) => unknown,
			});
			return;
		case "outbound.request":
			out.outboundRequest.push({
				pluginId: manifestId,
				run: item as (input: Record<string, unknown>) => unknown,
			});
			return;
		case "schedule.gates": {
			const gate = item as ScheduleGate;
			out.scheduleGates.push(gate);
			out.packIdByGateId.set(gate.gateId, manifestId);
			return;
		}
		case "schedule.topic":
			emitPluginLog({
				type: "plugin.load_skipped",
				pluginId: manifestId,
				reason: "slot_not_wired:schedule.topic",
			});
			return;
		default:
			emitPluginLog({
				type: "plugin.load_failed",
				pluginId: manifestId,
				reason: `unknown_background_slot:${slot}`,
			});
	}
}

function readString(value: unknown): string | undefined {
	return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function toOutboundRequest(input: {
	value: unknown;
	taskId: string;
	nowIso: string;
	payload?: Record<string, unknown>;
}): PluginOutboundRequest | null {
	if (!input.value || typeof input.value !== "object") return null;
	const raw = input.value as Record<string, unknown>;
	if (raw.shouldCall === false) return null;
	const userId = readString(raw.userId) ?? readString(input.payload?.userId);
	const characterId =
		readString(raw.characterId) ??
		readString(raw.agentId) ??
		readString(input.payload?.characterId) ??
		readString(input.payload?.agentId);
	const cardId = readString(raw.cardId) ?? readString(input.payload?.cardId);
	const chapterId =
		readString(raw.chapterId) ?? readString(input.payload?.chapterId);
	if (!userId || !characterId || !cardId || !chapterId) return null;
	return {
		userId,
		characterId,
		cardId,
		chapterId,
		reason: readString(raw.reason),
		extras: {
			taskId: input.taskId,
			nowIso: input.nowIso,
			decision: raw,
		},
	};
}

async function runOutboundRequestContributions(input: {
	api: PluginCapabilityApi;
	manifestId: string;
	out: ScannedPluginContributions;
	taskId: string;
	nowIso: string;
	payload?: Record<string, unknown>;
}): Promise<void> {
	for (const contribution of input.out.outboundRequest) {
		if (contribution.pluginId !== input.manifestId) continue;
		const decision = await contribution.run({
			taskId: input.taskId,
			nowIso: input.nowIso,
			payload: input.payload ?? {},
		});
		const req = toOutboundRequest({
			value: decision,
			taskId: input.taskId,
			nowIso: input.nowIso,
			payload: input.payload,
		});
		if (req) {
			await input.api.outbound.requestCall(req);
		}
	}
}
