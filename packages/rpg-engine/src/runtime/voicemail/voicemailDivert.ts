/**
 * 模块名称：voicemail attach / schedule / once 到点分流
 * 模块说明：Effect 入栈与 schedule tick 入栈；禁止 Board / agent_outbound。
 * 需求：语音留言改造 §3.3；执行索引 V2-VM-4 / V2-VM-5
 */
import { randomUUID } from "node:crypto";
import { FREE_PACKAGE_ID } from "../../constants.js";
import type { CallSession } from "../../host/types.js";
import type { Effect } from "../../schema/outcome.js";
import type { PlayerProfile } from "../../schema/profile.js";
import type { ScheduledCardLookup } from "../../schedule/scheduleCardReferenceResolver.js";
import {
	isLookupVoicemailCard,
	pushVoicemailGenStack,
	VOICEMAIL_MAILBOX_DELIVERY,
} from "./voicemailGenStack.js";

export type VoicemailAttachCtx = {
	profile: PlayerProfile;
	session: CallSession;
	nowIso: string;
	lookupCard?: ScheduledCardLookup | null;
};

export type VoicemailScheduleCtx = {
	profile: PlayerProfile;
	nowIso: string;
	lookupCard?: ScheduledCardLookup | null;
};

export type VoicemailOnceIntentRef = {
	intentId: string;
	agentId: string;
	cardId: string;
	packageId: string;
	topicHint?: string;
	delivery?: string;
};

function resolveAttachPackageId(
	effect: Effect,
	session: CallSession,
): string {
	if (typeof effect.packageId === "string" && effect.packageId) {
		return effect.packageId;
	}
	return session.packageId === FREE_PACKAGE_ID
		? FREE_PACKAGE_ID
		: session.packageId;
}

/**
 * @returns true 已按留言路径处理；false 应由调用方走普通 Board attach
 */
export function tryAttachVoicemailCallCard(
	effect: Effect,
	ctx: VoicemailAttachCtx,
): boolean {
	const agentId = String(effect.agentId ?? "");
	const cardId = String(effect.cardId ?? "");
	if (!agentId || !cardId) {
		return false;
	}
	const packageId = resolveAttachPackageId(effect, ctx.session);
	if (!isLookupVoicemailCard(ctx.lookupCard, packageId, cardId)) {
		return false;
	}
	pushVoicemailGenStack(ctx.profile, {
		id: typeof effect.id === "string" && effect.id ? effect.id : randomUUID(),
		agentId,
		cardId,
		packageId,
		source: "attach",
		createdAt: ctx.nowIso,
		topicHint:
			typeof effect.topicHint === "string" ? effect.topicHint : undefined,
	});
	return true;
}

function resolveScheduleDelayMs(effect: Effect): number {
	if (typeof effect.minMs === "number") {
		return effect.minMs;
	}
	const delayMinutes =
		typeof effect.delayMinutes === "number" ? effect.delayMinutes : 5;
	return delayMinutes * 60_000;
}

/**
 * @returns true 已登记留言延迟 intent；false 走普通 schedule（Board + outbound）
 */
export function tryScheduleVoicemailCallCard(
	effect: Effect,
	ctx: VoicemailScheduleCtx,
): boolean {
	const agentId = String(effect.agentId ?? "");
	const cardId = String(effect.cardId ?? "");
	const packageId = String(effect.packageId ?? "");
	if (!agentId || !cardId || !packageId) {
		return false;
	}
	if (!isLookupVoicemailCard(ctx.lookupCard, packageId, cardId)) {
		return false;
	}
	const { profile, nowIso } = ctx;
	if (!profile.schedule) {
		profile.schedule = { clockMs: 0, intents: [] };
	}
	const clockMs = profile.schedule.clockMs ?? 0;
	profile.schedule.intents.push({
		kind: "once",
		intentId: effect.id,
		agentId,
		cardId,
		packageId,
		topicHint:
			typeof effect.topicHint === "string" ? effect.topicHint : undefined,
		fireAtMs: clockMs + resolveScheduleDelayMs(effect),
		status: "pending",
		delivery: VOICEMAIL_MAILBOX_DELIVERY,
		createdAt: nowIso,
	});
	return true;
}

function onceMarkedVoicemailMailbox(raw: unknown): boolean {
	if (!raw || typeof raw !== "object") return false;
	return (
		(raw as { delivery?: unknown }).delivery === VOICEMAIL_MAILBOX_DELIVERY
	);
}

/**
 * delivery 标记优先；否则依赖 lookupCard 的 cardKind。
 */
export function isVoicemailMailboxOnce(
	once: VoicemailOnceIntentRef,
	raw: unknown,
	lookupCard?: ScheduledCardLookup | null,
): boolean {
	if (
		once.delivery === VOICEMAIL_MAILBOX_DELIVERY ||
		onceMarkedVoicemailMailbox(raw)
	) {
		return true;
	}
	return isLookupVoicemailCard(lookupCard, once.packageId, once.cardId);
}

/** 留言 once 到点：入 GenStack（调用方标 fired，勿挂 Board） */
export function fireVoicemailMailboxOnce(
	profile: PlayerProfile,
	once: VoicemailOnceIntentRef,
	nowIso: string,
): void {
	pushVoicemailGenStack(profile, {
		id: once.intentId,
		agentId: once.agentId,
		cardId: once.cardId,
		packageId: once.packageId,
		source: "schedule",
		createdAt: nowIso,
		topicHint: once.topicHint,
		intentId: once.intentId,
	});
}
