/**
 * 动态 schedule_recurring_call：解析卡引用后写入 Profile（REST-E2）。
 */
import type { PlayerProfile } from "../schema/profile.js";
import type { Effect } from "../schema/outcome.js";
import {
  resolveScheduledCardReference,
  type ScheduledCardLookup,
} from "./scheduleCardReferenceResolver.js";

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
  packageId?: string;
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
    packageId:
      typeof effect.packageId === "string" && effect.packageId
        ? effect.packageId
        : undefined,
  };
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
  if (!ref.scheduleCardId && !(ref.cardId && ref.packageId)) {
    throw new Error(
      "schedule_recurring_call requires scheduleCardId or cardId+packageId",
    );
  }
  if (!lookupCard) {
    throw new Error(
      "schedule_recurring_call requires lookupCard for reference validation",
    );
  }
  const resolved = resolveScheduledCardReference(
    { agentId, ...ref },
    lookupCard,
  );
  if (!resolved.ok) {
    throw new Error(
      `schedule_recurring_call ${resolved.code}: ${resolved.reason}`,
    );
  }
  const intent: Record<string, unknown> = {
    kind: "recurring",
    intentId: effect.id,
    agentId,
    hour: clampHour(effect.hour),
    minute: clampMinute(effect.minute),
    scheduleMode: effect.scheduleMode === "weekly" ? "weekly" : "daily",
    status: "active",
    createdAt: nowIso,
    ...ref,
  };
  if (typeof effect.topicHint === "string") intent.topicHint = effect.topicHint;
  if (Array.isArray(effect.weekdays)) intent.weekdays = effect.weekdays;
  if (effect.jobId !== undefined) intent.jobId = effect.jobId;
  profile.schedule.intents.push(intent);
}
