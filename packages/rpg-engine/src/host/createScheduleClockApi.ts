import type { LogRecord } from "./types.js";
import type { EngineError } from "./errors.js";
import { engineError } from "./errors.js";
import type { PlayerProfile } from "../schema/profile.js";
import type {
  AdvanceToNextResult,
  FiredScheduleItem,
} from "../runtime/scheduleTick.js";
import {
  advanceClockWithCardLookup,
  advanceToNextWithCardLookup,
  setClockMsWithCardLookup,
} from "./scheduleClockWithLookup.js";
import type { ScheduledCardLookup } from "../schedule/scheduleCardReferenceResolver.js";

type PushLog = (rec: LogRecord) => void;

export function createScheduleClockApi(deps: {
  profiles: Map<string, PlayerProfile>;
  lookupCard: ScheduledCardLookup;
  pushLog: PushLog;
}) {
  return {
    advanceClock(
      userId: string,
      deltaMs: number,
    ): FiredScheduleItem[] | EngineError {
      const profile = deps.profiles.get(userId);
      if (!profile) {
        return engineError("USER_REQUIRED", "call ensureProfile first");
      }
      try {
        const fired = advanceClockWithCardLookup(
          profile,
          deltaMs,
          deps.lookupCard,
        );
        deps.pushLog({
          at: new Date().toISOString(),
          type: "schedule.advanced",
          userId,
          payload: { deltaMs, firedCount: fired.length, fired },
        });
        return fired;
      } catch (err) {
        return engineError(
          "VALIDATION_FAILED",
          err instanceof Error ? err.message : String(err),
        );
      }
    },

    setClockMs(
      userId: string,
      toClockMs: number,
    ): FiredScheduleItem[] | EngineError {
      const profile = deps.profiles.get(userId);
      if (!profile) {
        return engineError("USER_REQUIRED", "call ensureProfile first");
      }
      try {
        const fromClockMs = profile.schedule?.clockMs ?? 0;
        const fired = setClockMsWithCardLookup(
          profile,
          toClockMs,
          deps.lookupCard,
        );
        deps.pushLog({
          at: new Date().toISOString(),
          type: "schedule.set_clock",
          userId,
          payload: {
            fromClockMs,
            toClockMs,
            firedCount: fired.length,
            fired,
          },
        });
        return fired;
      } catch (err) {
        return engineError(
          "VALIDATION_FAILED",
          err instanceof Error ? err.message : String(err),
        );
      }
    },

    advanceClockToNextIntent(
      userId: string,
    ): AdvanceToNextResult | EngineError {
      const profile = deps.profiles.get(userId);
      if (!profile) {
        return engineError("USER_REQUIRED", "call ensureProfile first");
      }
      try {
        const result = advanceToNextWithCardLookup(profile, deps.lookupCard);
        deps.pushLog({
          at: new Date().toISOString(),
          type: "schedule.advance_to_next",
          userId,
          payload: {
            fromClockMs: result.fromClockMs,
            toClockMs: result.toClockMs,
            advancedMs: result.advancedMs,
            reason: result.reason,
            firedCount: result.fired.length,
          },
        });
        return result;
      } catch (err) {
        return engineError(
          "VALIDATION_FAILED",
          err instanceof Error ? err.message : String(err),
        );
      }
    },
  };
}
