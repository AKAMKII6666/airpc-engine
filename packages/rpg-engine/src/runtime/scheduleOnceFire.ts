/**
 * 模块名称：due once 点火（outbound 或 voicemail）
 * 从 scheduleTick.tickScheduleOnce 拆出以降基线复杂度／行数。
 */
import type { PlayerProfile } from "../schema/profile.js";
import type { ScheduledCardLookup } from "../schedule/scheduleCardReferenceResolver.js";
import {
	ensureOutboundPending,
	resolveOutboundWindowDefer,
} from "./scheduleOutboundPending.js";
import type { ScheduleFireOptions } from "./scheduleFireOptions.js";
import {
	fireVoicemailMailboxOnce,
	isVoicemailMailboxOnce,
} from "./voicemail/voicemailDivert.js";

/** 与 scheduleTick.ScheduledOnceIntent 对齐（避免循环 import） */
export type DueOnceIntent = {
	kind: "once";
	intentId: string;
	agentId: string;
	cardId: string;
	chapterId: string;
	topicHint?: string;
	origin?: string;
	fireAtMs: number;
	status: "pending" | "fired" | "cancelled" | "consumed";
	createdAt?: string;
	sourcedFromRecurringId?: string;
	linkedInstanceId?: string;
	delivery?: string;
};

export type OutboundFiredItem = {
	intentId: string;
	agentId: string;
	cardId: string;
	chapterId: string;
	instanceId: string;
};

export type OnceFireResult =
	| { kind: "defer"; once: DueOnceIntent }
	| { kind: "consumed"; once: DueOnceIntent }
	| { kind: "voicemail"; once: DueOnceIntent }
	| { kind: "outbound"; once: DueOnceIntent; fired: OutboundFiredItem };

/**
 * 处理一条已到期的 pending once。
 * voicemail：入 GenStack；outbound：挂 Board 或 defer／consumed。
 */
export function fireDueOnceIntent(
	profile: PlayerProfile,
	once: DueOnceIntent,
	raw: unknown,
	nowIso: string,
	lookupCard?: ScheduledCardLookup | null,
	fireOpts?: ScheduleFireOptions | null,
): OnceFireResult {
	if (isVoicemailMailboxOnce(once, raw, lookupCard)) {
		fireVoicemailMailboxOnce(profile, once, nowIso);
		return { kind: "voicemail", once: { ...once, status: "fired" } };
	}

	const gateResult = resolveOutboundWindowDefer(profile, nowIso, fireOpts);
	if (fireOpts?.onScheduleGateEvent) {
		for (const event of gateResult.events) {
			fireOpts.onScheduleGateEvent(event);
		}
	}
	if (gateResult.defer) {
		return { kind: "defer", once };
	}

	const instance = ensureOutboundPending(profile, once, nowIso);
	if (!instance) {
		return { kind: "consumed", once: { ...once, status: "consumed" } };
	}

	return {
		kind: "outbound",
		once: {
			...once,
			linkedInstanceId: once.linkedInstanceId ?? instance.instanceId,
			status: "fired",
		},
		fired: {
			intentId: once.intentId,
			agentId: once.agentId,
			cardId: once.cardId,
			chapterId: once.chapterId,
			instanceId: instance.instanceId,
		},
	};
}
