/**
 * beginCall：从 Profile pending / schedule intent 抽主题与未接外呼提示。
 * 从 createEngineHost 拆出以降 beginCall 行数与复杂度基线。
 */
import type { BeginCallContext, ResolveResult } from "./types.js";
import type { PlayerProfile } from "../schema/profile.js";

function readPendingForResolve(
	profile: PlayerProfile | undefined,
	result: ResolveResult,
) {
	if (!profile) return null;
	const board = profile.callCards.board.byAgent[result.agentId];
	return (
		board?.pending.find(function (item) {
			return item.instanceId === result.instanceId;
		}) ?? null
	);
}

function readScheduleIntent(
	profile: PlayerProfile | undefined,
	intentId: string | undefined,
): Record<string, unknown> | null {
	if (!profile || !intentId) return null;
	const hit = profile.schedule?.intents?.find(function (item) {
		const row = item as { intentId?: unknown };
		return row.intentId === intentId;
	});
	return hit && typeof hit === "object"
		? (hit as Record<string, unknown>)
		: null;
}

export function buildBeginCallScheduleHints(input: {
	profile: PlayerProfile | undefined;
	result: ResolveResult;
}): {
	scheduledIntentId: string | undefined;
	topicHint: string | undefined;
	scheduleOrigin: string | undefined;
	missedOutbound: BeginCallContext["missedOutbound"];
} {
	const pendingForBegin = readPendingForResolve(input.profile, input.result);
	const scheduledIntentId = pendingForBegin?.scheduledIntentId;
	const scheduleIntent = readScheduleIntent(input.profile, scheduledIntentId);
	const topicHint =
		typeof scheduleIntent?.topicHint === "string" &&
		scheduleIntent.topicHint.trim()
			? scheduleIntent.topicHint.trim()
			: undefined;
	const scheduleOrigin =
		typeof scheduleIntent?.origin === "string" &&
		scheduleIntent.origin.trim()
			? scheduleIntent.origin.trim()
			: undefined;
	const missedOutbound =
		pendingForBegin?.status === "missed" ||
		pendingForBegin?.missedOutboundAt
			? {
					at: pendingForBegin.missedOutboundAt,
					reason: pendingForBegin.missedOutboundReason,
					eventId: pendingForBegin.missedIncomingEventId,
				}
			: undefined;
	return {
		scheduledIntentId,
		topicHint,
		scheduleOrigin,
		missedOutbound,
	};
}
