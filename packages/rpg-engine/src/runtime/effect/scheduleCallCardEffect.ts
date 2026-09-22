/**
 * 模块名称：schedule_call_card 普通 Board + once 路径
 * 从 effectExecutor 拆出以降基线行数。
 */
import { randomUUID } from "node:crypto";
import type { CallCardInstance, PlayerProfile } from "../../schema/identity/profile.js";
import type { Effect } from "../../schema/call/outcome.js";
import { resolveChapterId } from "../../chapter/resolveChapterId.js";
import type { ScheduledCardLookup } from "../../schedule/scheduleCardReferenceResolver.js";

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

function validateScheduleTarget(input: {
	lookupCard?: ScheduledCardLookup | null;
	agentId: string;
	cardId: string;
	chapterId: string;
}): void {
	if (!input.lookupCard) return;
	const card = input.lookupCard(input.chapterId, input.cardId);
	if (!card) {
		throw new Error(
			`schedule_call_card target not found: ${input.chapterId}/${input.cardId}`,
		);
	}
	if (card.ownerAgentId !== input.agentId) {
		throw new Error(
			`schedule_call_card target owner ${card.ownerAgentId} !== agentId ${input.agentId}`,
		);
	}
}

function upsertEitherPending(
	board: { pending: CallCardInstance[] },
	args: {
		instanceId: string;
		cardId: string;
		chapterId: string;
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
			chapterId: args.chapterId,
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

function requireScheduleTargetIds(effect: Effect): {
	agentId: string;
	cardId: string;
	chapterId: string;
} {
	const agentId = String(effect.agentId ?? "");
	const cardId = String(effect.cardId ?? "");
	const chapterId = resolveChapterId(effect as Record<string, unknown>);
	if (!agentId || !cardId || !chapterId) {
		throw new Error(
			"schedule_call_card requires agentId + chapterId + cardId（禁止仅 topicHint 推进）",
		);
	}
	return { agentId, cardId, chapterId };
}

function findMatchingPending(
	board: { pending: CallCardInstance[] },
	cardId: string,
	chapterId: string,
): CallCardInstance | undefined {
	return board.pending.find(function (item) {
		return (
			item.cardId === cardId &&
			item.chapterId === chapterId &&
			item.status === "pending"
		);
	});
}

function pushOnceScheduleIntent(input: {
	profile: PlayerProfile;
	effect: Effect;
	agentId: string;
	cardId: string;
	chapterId: string;
	instanceId: string;
	minMs: number;
	nowIso: string;
}): void {
	if (!input.profile.schedule) {
		input.profile.schedule = { clockMs: 0, intents: [] };
	}
	const clockMs = input.profile.schedule.clockMs ?? 0;
	input.profile.schedule.intents.push({
		kind: "once",
		intentId: input.effect.id,
		agentId: input.agentId,
		cardId: input.cardId,
		chapterId: input.chapterId,
		topicHint:
			typeof input.effect.topicHint === "string"
				? input.effect.topicHint
				: undefined,
		origin:
			typeof input.effect.scheduleOrigin === "string"
				? input.effect.scheduleOrigin
				: "story_scheduled_call",
		fireAtMs: clockMs + input.minMs,
		status: "pending",
		linkedInstanceId: input.instanceId,
		createdAt: input.nowIso,
	});
}

/**
 * 普通卡：挂 either pending + once intent（到点 agent_outbound）。
 * 禁止仅 topicHint 推进。
 */
export function applyScheduleCallCardToBoard(
	effect: Effect,
	profile: PlayerProfile,
	nowIso: string,
	lookupCard?: ScheduledCardLookup | null,
): void {
	const { agentId, cardId, chapterId } = requireScheduleTargetIds(effect);
	validateScheduleTarget({ lookupCard, agentId, cardId, chapterId });
	const minMs = resolveScheduleDelayMs(effect);
	const board = ensureAgentBoard(profile, agentId);
	const existing = findMatchingPending(board, cardId, chapterId);
	const instanceId = existing?.instanceId ?? randomUUID();
	upsertEitherPending(board, {
		instanceId,
		cardId,
		chapterId,
		agentId,
		effectId: effect.id,
		nowIso,
		existing,
	});
	pushOnceScheduleIntent({
		profile,
		effect,
		agentId,
		cardId,
		chapterId,
		instanceId,
		minMs,
		nowIso,
	});
}
