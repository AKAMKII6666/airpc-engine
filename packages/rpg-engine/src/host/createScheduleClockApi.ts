/**
 * Host 时钟 API：advance / setClockMs / advanceToNext；注入 L1 schedule.gates。
 */
import type { LogRecord } from "./types.js";
import type { EngineError } from "./errors.js";
import { engineError } from "./errors.js";
import type { PlayerProfile } from "../schema/profile.js";
import type {
	AdvanceToNextResult,
	FiredScheduleItem,
} from "../runtime/scheduleTick.js";
import type { ScheduleFireOptions } from "../runtime/scheduleFireOptions.js";
import {
	advanceClockWithCardLookup,
	advanceToNextWithCardLookup,
	setClockMsWithCardLookup,
} from "./scheduleClockWithLookup.js";
import type { ScheduledCardLookup } from "../schedule/scheduleCardReferenceResolver.js";
import type { CapabilityPackLogEvent } from "../capabilityPacks/mergeCapabilityPacks.js";
import type { ScheduleGate } from "../capabilityPacks/contributeTypes.js";

type PushLog = (rec: LogRecord) => void;

export type ScheduleClockApiDeps = {
	profiles: Map<string, PlayerProfile>;
	lookupCard: ScheduledCardLookup;
	pushLog: PushLog;
	/**
	 * `undefined` → 回退内置窗闸；显式 `[]` → 无闸（关包）。
	 * Studio 装配应始终传入 merge 结果。
	 */
	scheduleGates?: readonly ScheduleGate[] | null;
	packIdByGateId?: ReadonlyMap<string, string>;
};

function buildFireOpts(
	deps: ScheduleClockApiDeps,
	userId: string,
): ScheduleFireOptions {
	return {
		scheduleGates: deps.scheduleGates,
		packIdByGateId: deps.packIdByGateId,
		onScheduleGateEvent(event: CapabilityPackLogEvent) {
			deps.pushLog({
				at: new Date().toISOString(),
				type: event.type,
				userId,
				payload: event,
			});
		},
	};
}

function runAdvanceClock(
	deps: ScheduleClockApiDeps,
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
			buildFireOpts(deps, userId),
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
}

function runSetClockMs(
	deps: ScheduleClockApiDeps,
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
			buildFireOpts(deps, userId),
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
}

function runAdvanceToNext(
	deps: ScheduleClockApiDeps,
	userId: string,
): AdvanceToNextResult | EngineError {
	const profile = deps.profiles.get(userId);
	if (!profile) {
		return engineError("USER_REQUIRED", "call ensureProfile first");
	}
	try {
		const result = advanceToNextWithCardLookup(
			profile,
			deps.lookupCard,
			buildFireOpts(deps, userId),
		);
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
}

export function createScheduleClockApi(deps: ScheduleClockApiDeps) {
	return {
		advanceClock(userId: string, deltaMs: number) {
			return runAdvanceClock(deps, userId, deltaMs);
		},
		setClockMs(userId: string, toClockMs: number) {
			return runSetClockMs(deps, userId, toClockMs);
		},
		advanceClockToNextIntent(userId: string) {
			return runAdvanceToNext(deps, userId);
		},
	};
}
