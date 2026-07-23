/**
 * 模块名称：schedule_call_card 普通 Board + once 路径
 * 从 effectExecutor 拆出以降基线行数。
 */
import { randomUUID } from "node:crypto";
import type { CallCardInstance, PlayerProfile } from "../schema/profile.js";
import type { Effect } from "../schema/outcome.js";

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

function resolveScheduleDelayMs(effect: Effect): number {
	if (typeof effect.minMs === "number") {
		return effect.minMs;
	}
	const delayMinutes =
		typeof effect.delayMinutes === "number" ? effect.delayMinutes : 5;
	return delayMinutes * 60_000;
}

function upsertEitherPending(
	board: { pending: CallCardInstance[] },
	args: {
		instanceId: string;
		cardId: string;
		packageId: string;
		agentId: string;
		effectId: string;
		nowIso: string;
		existing: CallCardInstance | undefined;
	},
): void {
	if (!args.existing) {
		board.pending.push({
			instanceId: args.instanceId,
			cardId: args.cardId,
			packageId: args.packageId,
			agentId: args.agentId,
			status: "pending",
			entryMode: "either",
			activationHint: "outbound_auto",
			scheduledIntentId: args.effectId,
			createdAt: args.nowIso,
			updatedAt: args.nowIso,
		});
		return;
	}
	args.existing.entryMode = args.existing.entryMode ?? "either";
	args.existing.activationHint =
		args.existing.activationHint ?? "outbound_auto";
	args.existing.scheduledIntentId = args.effectId;
	args.existing.updatedAt = args.nowIso;
}

/**
 * 普通卡：挂 either pending + once intent（到点 agent_outbound）。
 * 禁止仅 topicHint 推进。
 */
export function applyScheduleCallCardToBoard(
	effect: Effect,
	profile: PlayerProfile,
	nowIso: string,
): void {
	const agentId = String(effect.agentId ?? "");
	const cardId = String(effect.cardId ?? "");
	const packageId = String(effect.packageId ?? "");
	if (!agentId || !cardId || !packageId) {
		throw new Error(
			"schedule_call_card requires agentId + packageId + cardId（禁止仅 topicHint 推进）",
		);
	}
	const minMs = resolveScheduleDelayMs(effect);
	if (!profile.schedule) {
		profile.schedule = { clockMs: 0, intents: [] };
	}
	const clockMs = profile.schedule.clockMs ?? 0;
	const board = ensureAgentBoard(profile, agentId);
	const existing = board.pending.find(function (item) {
		return (
			item.cardId === cardId &&
			item.packageId === packageId &&
			item.status === "pending"
		);
	});
	const instanceId = existing?.instanceId ?? randomUUID();
	upsertEitherPending(board, {
		instanceId,
		cardId,
		packageId,
		agentId,
		effectId: effect.id,
		nowIso,
		existing,
	});
	profile.schedule.intents.push({
		kind: "once",
		intentId: effect.id,
		agentId,
		cardId,
		packageId,
		topicHint:
			typeof effect.topicHint === "string" ? effect.topicHint : undefined,
		fireAtMs: clockMs + minMs,
		status: "pending",
		linkedInstanceId: instanceId,
		createdAt: nowIso,
	});
}
