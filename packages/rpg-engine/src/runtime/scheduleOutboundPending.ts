/**
 * schedule once → outbound pending 挂载，含玩家 outboundWindow defer 判定。
 * 从 scheduleTick 拆出以降基线行数。
 * outboundWindow 判定经 L1 schedule.gates 样板（outbound-window-gate）。
 */
import { randomUUID } from "node:crypto";
import type { CallCardInstance, PlayerProfile } from "../schema/profile.js";
import { outboundWindowScheduleGate } from "../capabilityPacks/background/outbound-window-gate/outboundWindowGatePack.js";
import type { ScheduleGate } from "../capabilityPacks/contributeTypes.js";
import { evaluateScheduleGatesDetailed } from "../capabilityPacks/evaluateScheduleGates.js";
import type { CapabilityPackLogEvent } from "../capabilityPacks/mergeCapabilityPacksCollect.js";
import type { ScheduleFireOptions } from "./scheduleFireOptions.js";

/** 本模块所需 once 意图字段（与 scheduleTick.ScheduledOnceIntent 对齐） */
export type OutboundOnceIntentRef = {
	agentId: string;
	cardId: string;
	chapterId: string;
	linkedInstanceId?: string;
};

function ensureAgentBoard(
	profile: PlayerProfile,
	agentId: string,
): { pending: CallCardInstance[] } {
	const byAgent = profile.callCards.board.byAgent;
	if (!byAgent[agentId]) {
		byAgent[agentId] = { pending: [] };
	}
	return byAgent[agentId]!;
}

function findPendingByInstanceId(
	profile: PlayerProfile,
	instanceId: string,
): CallCardInstance | null {
	const byAgent = profile.callCards.board.byAgent;
	for (const agentId of Object.keys(byAgent)) {
		const board = byAgent[agentId];
		if (!board) continue;
		const hit = board.pending.find(function (item) {
			return item.instanceId === instanceId;
		});
		if (hit) return hit;
	}
	return null;
}

/**
 * 解析 outbound 窗闸：返回是否 defer 与 schedule_gate 事件。
 * - `gates` 缺省（undefined/null）→ 回退内置 outbound-window-gate
 * - 显式空数组 → 不 defer、无事件（关包生效）
 */
export function resolveOutboundWindowDefer(
	profile: PlayerProfile,
	nowIso: string,
	opts?: ScheduleFireOptions | null,
): { defer: boolean; events: CapabilityPackLogEvent[] } {
	const gates = opts?.scheduleGates;
	if (gates === undefined || gates === null) {
		return evaluateScheduleGatesDetailed(
			[outboundWindowScheduleGate],
			profile,
			nowIso,
			opts?.packIdByGateId,
		);
	}
	if (gates.length === 0) {
		return { defer: false, events: [] };
	}
	return evaluateScheduleGatesDetailed(
		gates,
		profile,
		nowIso,
		opts?.packIdByGateId,
	);
}

/**
 * 窗外则 defer（不挂卡）；窗内或无窗返回 false。
 * `gates` 缺省时使用 outbound-window-gate 样板门闩；显式 `[]` 表示无闸。
 */
export function shouldDeferOutboundForPlayerWindow(
	profile: PlayerProfile,
	nowIso: string,
	gates?: readonly ScheduleGate[] | null,
): boolean {
	return resolveOutboundWindowDefer(profile, nowIso, { scheduleGates: gates })
		.defer;
}

/**
 * 挂／复用 outbound pending；linked 已消费则返回 null。
 */
export function ensureOutboundPending(
	profile: PlayerProfile,
	intent: OutboundOnceIntentRef,
	nowIso: string,
): CallCardInstance | null {
	if (intent.linkedInstanceId) {
		const linked = findPendingByInstanceId(profile, intent.linkedInstanceId);
		if (linked && linked.status !== "pending") {
			return null;
		}
		if (linked) return linked;
	}

	const board = ensureAgentBoard(profile, intent.agentId);
	const existing = board.pending.find(function (item) {
		return (
			item.cardId === intent.cardId &&
			item.chapterId === intent.chapterId &&
			item.status === "pending"
		);
	});
	if (existing) {
		if (!existing.entryMode) {
			existing.entryMode = "outbound_auto";
		}
		return existing;
	}
	const created: CallCardInstance = {
		instanceId: intent.linkedInstanceId ?? randomUUID(),
		cardId: intent.cardId,
		chapterId: intent.chapterId,
		agentId: intent.agentId,
		status: "pending",
		entryMode: "outbound_auto",
		createdAt: nowIso,
		updatedAt: nowIso,
	};
	board.pending.push(created);
	return created;
}
