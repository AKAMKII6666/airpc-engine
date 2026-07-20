/**
 * schedule once → outbound pending 挂载，含玩家 outboundWindow defer 判定。
 * 从 scheduleTick 拆出以降基线行数。
 */
import { randomUUID } from "node:crypto";
import type { CallCardInstance, PlayerProfile } from "../schema/profile.js";
import {
	isLocalHourInOutboundWindow,
	localHourFromIso,
} from "./outboundWindow.js";

/** 本模块所需 once 意图字段（与 scheduleTick.ScheduledOnceIntent 对齐） */
export type OutboundOnceIntentRef = {
	agentId: string;
	cardId: string;
	packageId: string;
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
 * 窗外则 defer（不挂卡）；窗内或无窗返回 false。
 */
export function shouldDeferOutboundForPlayerWindow(
	profile: PlayerProfile,
	nowIso: string,
): boolean {
	const localHour = localHourFromIso(nowIso);
	return !isLocalHourInOutboundWindow(
		localHour,
		profile.user?.outboundWindow,
	);
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
		if (!linked) {
			return null;
		}
		if (linked.status !== "pending") {
			return null;
		}
		return linked;
	}

	const board = ensureAgentBoard(profile, intent.agentId);
	const existing = board.pending.find(function (item) {
		return (
			item.cardId === intent.cardId &&
			item.packageId === intent.packageId &&
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
		instanceId: randomUUID(),
		cardId: intent.cardId,
		packageId: intent.packageId,
		agentId: intent.agentId,
		status: "pending",
		entryMode: "outbound_auto",
		createdAt: nowIso,
		updatedAt: nowIso,
	};
	board.pending.push(created);
	return created;
}
