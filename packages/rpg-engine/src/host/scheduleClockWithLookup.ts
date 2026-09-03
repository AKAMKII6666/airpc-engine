/**
 * Host 时钟推进前先 reconcile recurring（REST-E3），避免 scheduleTick 继续膨胀。
 */
import type { PlayerProfile } from "../schema/profile.js";
import {
  advanceProfileClock,
  advanceProfileClockToNextIntent,
  setProfileClockMs,
  type AdvanceToNextResult,
  type FiredScheduleItem,
} from "../runtime/scheduleTick.js";
import type { ScheduleFireOptions } from "../runtime/scheduleFireOptions.js";
import { reconcileRecurringIntents } from "../schedule/reconcileRecurringIntents.js";
import type { ScheduledCardLookup } from "../schedule/scheduleCardReferenceResolver.js";

export function advanceClockWithCardLookup(
  profile: PlayerProfile,
  deltaMs: number,
  lookupCard: ScheduledCardLookup,
  fireOpts?: ScheduleFireOptions | null,
): FiredScheduleItem[] {
  reconcileRecurringIntents(profile, lookupCard);
  return advanceProfileClock(profile, deltaMs, undefined, lookupCard, fireOpts);
}

export function setClockMsWithCardLookup(
  profile: PlayerProfile,
  toClockMs: number,
  lookupCard: ScheduledCardLookup,
  fireOpts?: ScheduleFireOptions | null,
): FiredScheduleItem[] {
  reconcileRecurringIntents(profile, lookupCard);
  return setProfileClockMs(profile, toClockMs, undefined, lookupCard, fireOpts);
}

export function advanceToNextWithCardLookup(
  profile: PlayerProfile,
  lookupCard: ScheduledCardLookup,
  fireOpts?: ScheduleFireOptions | null,
): AdvanceToNextResult {
  reconcileRecurringIntents(profile, lookupCard);
  return advanceProfileClockToNextIntent(
    profile,
    undefined,
    lookupCard,
    fireOpts,
  );
}
