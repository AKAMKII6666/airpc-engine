/**
 * 动态 schedule_recurring_call：解析卡引用后写入 Profile（REST-E2）。
 */
import type { PlayerProfile } from "../schema/identity/profile.js";
import type { Effect } from "../schema/call/outcome.js";
import {
  resolveScheduledCardReference,
  type ScheduledCardLookup,
} from "./scheduleCardReferenceResolver.js";
import { resolveChapterId } from "../chapter/resolveChapterId.js";

function clampHour(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v)
    ? Math.min(23, Math.max(0, Math.trunc(v)))
    : 9;
}

function clampMinute(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v)
    ? Math.min(59, Math.max(0, Math.trunc(v)))
    : 0;
}

function pickRef(effect: Effect): {
  scheduleCardId?: string;
  cardId?: string;
  chapterId?: string;
} {
  return {
    scheduleCardId:
      typeof effect.scheduleCardId === "string" && effect.scheduleCardId
        ? effect.scheduleCardId
        : undefined,
    cardId:
      typeof effect.cardId === "string" && effect.cardId
        ? effect.cardId
        : undefined,
    chapterId: (() => {
      const id = resolveChapterId(effect as Record<string, unknown>);
      return id || undefined;
    })(),
  };
}

function assertRecurringRef(
	ref: ReturnType<typeof pickRef>,
	lookupCard: ScheduledCardLookup | null | undefined,
): ScheduledCardLookup {
	if (!ref.scheduleCardId && !(ref.cardId && ref.chapterId)) {
		throw new Error(
			"schedule_recurring_call requires scheduleCardId or cardId+chapterId",
		);
	}
	if (!lookupCard) {
		throw new Error(
			"schedule_recurring_call requires lookupCard for reference validation",
		);
	}
	return lookupCard;
}

function buildRecurringIntentRow(input: {
	effect: Effect;
	agentId: string;
	nowIso: string;
	ref: ReturnType<typeof pickRef>;
}): Record<string, unknown> {
	const intent: Record<string, unknown> = {
		kind: "recurring",
		intentId: input.effect.id,
		agentId: input.agentId,
		hour: clampHour(input.effect.hour),
		minute: clampMinute(input.effect.minute),
		scheduleMode: input.effect.scheduleMode === "weekly" ? "weekly" : "daily",
		status: "active",
		createdAt: input.nowIso,
		...input.ref,
	};
	if (typeof input.effect.topicHint === "string") {
		intent.topicHint = input.effect.topicHint;
	}
	intent.origin =
		typeof input.effect.scheduleOrigin === "string"
			? input.effect.scheduleOrigin
			: "recurring_schedule";
	if (Array.isArray(input.effect.weekdays)) {
		intent.weekdays = input.effect.weekdays;
	}
	if (input.effect.jobId !== undefined) intent.jobId = input.effect.jobId;
	return intent;
}

/**
 * @throws 缺引用或 lookup 解析失败时抛错；不写 intent
 */
export function writeRecurringIntentFromEffect(input: {
	effect: Effect;
	profile: PlayerProfile;
	agentId: string;
	nowIso: string;
	lookupCard: ScheduledCardLookup | null | undefined;
}): void {
	const { effect, profile, agentId, nowIso, lookupCard } = input;
	if (!profile.schedule) {
		profile.schedule = { clockMs: 0, intents: [] };
	}
	const ref = pickRef(effect);
	const lookup = assertRecurringRef(ref, lookupCard);
	const resolved = resolveScheduledCardReference({ agentId, ...ref }, lookup);
	if (!resolved.ok) {
		throw new Error(
			`schedule_recurring_call ${resolved.code}: ${resolved.reason}`,
		);
	}
	profile.schedule.intents.push(
		buildRecurringIntentRow({ effect, agentId, nowIso, ref }),
	);
}
