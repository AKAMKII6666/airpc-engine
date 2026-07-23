/**
 * 模块名称：attach_call_card 普通 Board 路径
 * 从 effectExecutor 拆出以降基线行数。
 */
import { randomUUID } from "node:crypto";
import { FREE_PACKAGE_ID } from "../constants.js";
import type { CallCardInstance, PlayerProfile } from "../schema/profile.js";
import type { Effect } from "../schema/outcome.js";
import type { CallSession } from "../host/types.js";

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

/** 普通卡：写 Board.pending（幂等同 cardId pending） */
export function applyAttachCallCardToBoard(
	effect: Effect,
	profile: PlayerProfile,
	session: CallSession,
	nowIso: string,
): void {
	const agentId = String(effect.agentId ?? "");
	const cardId = String(effect.cardId ?? "");
	if (!agentId || !cardId) {
		throw new Error("attach_call_card missing agentId/cardId");
	}
	const board = ensureAgentBoard(profile, agentId);
	const already = board.pending.some(function (item) {
		return item.cardId === cardId && item.status === "pending";
	});
	if (already) {
		return;
	}
	board.pending.push({
		instanceId: randomUUID(),
		cardId,
		packageId:
			typeof effect.packageId === "string"
				? effect.packageId
				: session.packageId === FREE_PACKAGE_ID
					? FREE_PACKAGE_ID
					: session.packageId,
		agentId,
		status: "pending",
		entryMode:
			typeof effect.activation === "string" ? effect.activation : undefined,
		createdAt: nowIso,
		updatedAt: nowIso,
	});
}
