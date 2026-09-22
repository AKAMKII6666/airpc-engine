/**
 * ActiveStoryLock 辅助谓词／装配；从 activeStoryLock 抽出以降圈复杂度。
 */
import {
	ActiveStoryLockSchema,
	type ActiveStoryLock,
	type StorySave,
} from "../../schema/identity/profile.js";
import { resolveChapterId } from "../../chapter/resolveChapterId.js";

export interface ActiveLockHit {
	chapterId: string;
	lock: ActiveStoryLock;
}

const STORY_SAVE_STATUSES = new Set([
	"inactive",
	"active",
	"completed",
	"aborted",
]);

function isStorySaveStatus(
	status: unknown,
): status is StorySave["status"] {
	return typeof status === "string" && STORY_SAVE_STATUSES.has(status);
}

/** 宽松读盘 → StorySave；非法 status 返回 null。 */
export function asStorySave(raw: unknown, storyKey: string): StorySave | null {
	if (!raw || typeof raw !== "object") return null;
	const o = raw as Record<string, unknown>;
	if (!isStorySaveStatus(o.status)) return null;
	const chapterId = resolveChapterId(o, storyKey);
	return {
		chapterId,
		status: o.status,
		instanceId: typeof o.instanceId === "string" ? o.instanceId : undefined,
		variables:
			o.variables && typeof o.variables === "object"
				? (o.variables as Record<string, unknown>)
				: {},
		completedCardIds: Array.isArray(o.completedCardIds)
			? (o.completedCardIds.filter(function (x) {
					return typeof x === "string";
				}) as string[])
			: undefined,
		lock: undefined,
		...o,
	};
}

function parseLockFromRaw(raw: unknown): ActiveStoryLock | null {
	if (raw == null || typeof raw !== "object") return null;
	const lockRaw = (raw as { lock?: unknown }).lock;
	if (lockRaw == null) return null;
	const parsed = ActiveStoryLockSchema.safeParse(lockRaw);
	return parsed.success ? parsed.data : null;
}

/** 扫描单条 story：仅 active 且有合法 lock 时返回 hit。 */
export function tryActiveLockHit(
	storyKey: string,
	raw: unknown,
): ActiveLockHit | null {
	const save = asStorySave(raw, storyKey);
	if (!save || save.status !== "active") return null;
	const lock = parseLockFromRaw(raw);
	if (!lock) return null;
	return { chapterId: save.chapterId, lock };
}

/** hard 优先；否则保留首个 soft。 */
export function preferHardOrFirstSoft(
	currentSoft: ActiveLockHit | null,
	hit: ActiveLockHit,
): { done: true; hit: ActiveLockHit } | { done: false; soft: ActiveLockHit } {
	if (hit.lock.lockLevel === "hard") {
		return { done: true, hit };
	}
	return { done: false, soft: currentSoft ?? hit };
}

export function resolveLockForActivate(input: {
	prev: Record<string, unknown>;
	chapterId: string;
	nowIso: string;
	acquireLock?: Omit<ActiveStoryLock, "startedAt" | "chapterId"> & {
		chapterId?: string;
		startedAt?: string;
	};
}): ActiveStoryLock | null | undefined {
	const existingLock =
		input.prev.lock != null
			? ActiveStoryLockSchema.safeParse(input.prev.lock)
			: null;
	let lock: ActiveStoryLock | null | undefined =
		existingLock && existingLock.success ? existingLock.data : undefined;
	if (!lock && input.acquireLock) {
		lock = ActiveStoryLockSchema.parse({
			...input.acquireLock,
			chapterId: input.acquireLock.chapterId ?? input.chapterId,
			startedAt: input.acquireLock.startedAt ?? input.nowIso,
		});
	}
	return lock;
}

export function buildActivatedStorySave(input: {
	prev: Record<string, unknown>;
	chapterId: string;
	instanceId: string;
	lock: ActiveStoryLock | null | undefined;
}): Record<string, unknown> {
	const next: Record<string, unknown> = {
		...input.prev,
		chapterId: input.chapterId,
		status: "active",
		instanceId: input.instanceId,
		variables:
			input.prev.variables && typeof input.prev.variables === "object"
				? input.prev.variables
				: {},
	};
	if (input.lock !== undefined) {
		next.lock = input.lock;
	} else if (input.prev.lock === null) {
		next.lock = null;
	}
	return next;
}
