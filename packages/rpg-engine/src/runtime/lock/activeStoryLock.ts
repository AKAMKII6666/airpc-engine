/**
 * 模块名称：ActiveStoryLock 读闸与 begin／挂机更新
 * 模块说明：决策表见技术设计 19 §8.4；结构见需求 10 §3.2。
 */
import {
	type ActiveStoryLock,
	type PlayerProfile,
} from "../../schema/identity/profile.js";
import { resolveChapterId } from "../../chapter/resolveChapterId.js";
import {
	buildActivatedStorySave,
	preferHardOrFirstSoft,
	resolveLockForActivate,
	tryActiveLockHit,
	type ActiveLockHit,
} from "./activeStoryLockHelpers.js";

export type { ActiveLockHit };

export type StoryLockIntentKind =
	| "user_dial"
	| "agent_outbound"
	| "free_call";

export type StoryLockGateDecision =
	| { kind: "allow" }
	| { kind: "reject"; code: "STORY_LOCKED"; message: string }
	| { kind: "force_free"; warning: boolean; reason: string }
	| { kind: "allow_with_warning"; reason: string };

/**
 * 取当前生效锁：优先 hard；v1 至多一个 hard。
 */
export function findActiveStoryLock(
	profile: PlayerProfile,
): ActiveLockHit | null {
	let soft: ActiveLockHit | null = null;
	for (const [storyKey, raw] of Object.entries(profile.stories ?? {})) {
		const hit = tryActiveLockHit(storyKey, raw);
		if (!hit) continue;
		const pick = preferHardOrFirstSoft(soft, hit);
		if (pick.done) return pick.hit;
		soft = pick.soft;
	}
	return soft;
}

export function evaluateStoryLockGate(input: {
	lock: ActiveStoryLock | null;
	agentId: string;
	intentKind: StoryLockIntentKind;
}): StoryLockGateDecision {
	const { lock, agentId, intentKind } = input;
	if (!lock) {
		return { kind: "allow" };
	}
	if (lock.allowedAgentIds.includes(agentId)) {
		return { kind: "allow" };
	}

	if (intentKind === "agent_outbound") {
		if (lock.lockLevel === "hard") {
			return {
				kind: "reject",
				code: "STORY_LOCKED",
				message: `hard ActiveStoryLock blocks outbound to ${agentId}`,
			};
		}
		return {
			kind: "allow_with_warning",
			reason: `soft ActiveStoryLock: outbound outside allowed (${agentId})`,
		};
	}

	switch (lock.blockedPolicy) {
		case "reject_call": {
			if (lock.lockLevel === "hard") {
				return {
					kind: "reject",
					code: "STORY_LOCKED",
					message: `hard ActiveStoryLock rejects call to ${agentId}`,
				};
			}
			return {
				kind: "force_free",
				warning: true,
				reason: `soft ActiveStoryLock reject_call → Free for ${agentId}`,
			};
		}
		case "force_free_suppressed": {
			return {
				kind: "force_free",
				warning: false,
				reason: `ActiveStoryLock force_free_suppressed for ${agentId}`,
			};
		}
		case "allow_with_warning": {
			return {
				kind: "allow_with_warning",
				reason: `ActiveStoryLock allow_with_warning for ${agentId}`,
			};
		}
		default: {
			const _x: never = lock.blockedPolicy;
			return {
				kind: "allow_with_warning",
				reason: `unknown blockedPolicy ${_x as string}`,
			};
		}
	}
}

/** beginCall（剧情源）：标记 StorySave active，保留已有 lock */
export function activateStoryOnBegin(
	profile: PlayerProfile,
	input: {
		chapterId: string;
		instanceId: string;
		nowIso: string;
		acquireLock?: Omit<ActiveStoryLock, "startedAt" | "chapterId"> & {
			chapterId?: string;
			startedAt?: string;
		};
	},
): void {
	const prevRaw = profile.stories[input.chapterId];
	const prev =
		prevRaw && typeof prevRaw === "object"
			? (prevRaw as Record<string, unknown>)
			: {};
	const lock = resolveLockForActivate({
		prev,
		chapterId: input.chapterId,
		nowIso: input.nowIso,
		acquireLock: input.acquireLock,
	});
	profile.stories[input.chapterId] = buildActivatedStorySave({
		prev,
		chapterId: input.chapterId,
		instanceId: input.instanceId,
		lock,
	});
}

/** 挂机／end_story：清除该章 lock（释放读闸） */
export function releaseStoryLock(
	profile: PlayerProfile,
	chapterId: string,
): void {
	const prevRaw = profile.stories[chapterId];
	if (!prevRaw || typeof prevRaw !== "object") return;
	const prev = prevRaw as Record<string, unknown>;
	profile.stories[chapterId] = {
		...prev,
		chapterId: resolveChapterId(prev, chapterId),
		lock: null,
	};
}
