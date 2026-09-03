/**
 * 运行 schedule.gates 链：任一 gate.allow === false → 应 defer。
 * 无 gate 时返回 false（不 defer），由调用方决定是否回退旧路径。
 */
import type { PlayerProfile } from "../schema/profile.js";
import type { ScheduleGate } from "./contributeTypes.js";
import type { CapabilityPackLogEvent } from "./mergeCapabilityPacksCollect.js";

export function shouldDeferByScheduleGates(
	gates: readonly ScheduleGate[],
	profile: PlayerProfile,
	nowIso: string,
): boolean {
	return evaluateScheduleGatesDetailed(gates, profile, nowIso).defer;
}

/**
 * 逐闸判定并产出 capabilityPack.schedule_gate 事件（供 Host pushLog）。
 */
export function evaluateScheduleGatesDetailed(
	gates: readonly ScheduleGate[],
	profile: PlayerProfile,
	nowIso: string,
	packIdByGateId?: ReadonlyMap<string, string>,
): { defer: boolean; events: CapabilityPackLogEvent[] } {
	const events: CapabilityPackLogEvent[] = [];
	let defer = false;
	for (const gate of gates) {
		const allowed = gate.allow({ profile, nowIso });
		events.push({
			type: "capabilityPack.schedule_gate",
			packId: packIdByGateId?.get(gate.gateId) ?? "unknown",
			gateId: gate.gateId,
			allowed,
		});
		if (!allowed) {
			defer = true;
		}
	}
	return { defer, events };
}
