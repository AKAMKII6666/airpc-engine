/**
 * 模块名称：ActiveStoryLock 读闸与 begin／挂机更新
 * 模块说明：决策表见技术设计 19 §8.4；结构见需求 10 §3.2。
 */
import {
  ActiveStoryLockSchema,
  type ActiveStoryLock,
  type PlayerProfile,
  type StorySave,
} from "../schema/profile.js";

export type StoryLockIntentKind =
  | "user_dial"
  | "agent_outbound"
  | "free_call";

export type StoryLockGateDecision =
  | { kind: "allow" }
  | { kind: "reject"; code: "STORY_LOCKED"; message: string }
  | { kind: "force_free"; warning: boolean; reason: string }
  | { kind: "allow_with_warning"; reason: string };

export interface ActiveLockHit {
  packageId: string;
  lock: ActiveStoryLock;
}

function asStorySave(raw: unknown, packageId: string): StorySave | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const status = o.status;
  if (
    status !== "inactive" &&
    status !== "active" &&
    status !== "completed" &&
    status !== "aborted"
  ) {
    return null;
  }
  return {
    packageId:
      typeof o.packageId === "string" ? o.packageId : packageId,
    status,
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

/**
 * 取当前生效锁：优先 hard；v1 至多一个 hard。
 */
export function findActiveStoryLock(
  profile: PlayerProfile,
): ActiveLockHit | null {
  let soft: ActiveLockHit | null = null;
  for (const [packageId, raw] of Object.entries(profile.stories ?? {})) {
    const save = asStorySave(raw, packageId);
    if (!save || save.status !== "active") continue;
    const lockRaw =
      raw && typeof raw === "object"
        ? (raw as { lock?: unknown }).lock
        : undefined;
    if (lockRaw == null) continue;
    const parsed = ActiveStoryLockSchema.safeParse(lockRaw);
    if (!parsed.success) continue;
    const hit: ActiveLockHit = { packageId, lock: parsed.data };
    if (parsed.data.lockLevel === "hard") {
      return hit;
    }
    if (!soft) soft = hit;
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

  // 外呼：表内 soft 允许打标；hard 拒绝（不走 blockedPolicy 分支）
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

  // 拨号／Free：按 soft|hard × blockedPolicy
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
    packageId: string;
    instanceId: string;
    nowIso: string;
    /** 若尚未有锁且传入，则写入（测／作者预置） */
    acquireLock?: Omit<ActiveStoryLock, "startedAt" | "packageId"> & {
      packageId?: string;
      startedAt?: string;
    };
  },
): void {
  const prevRaw = profile.stories[input.packageId];
  const prev =
    prevRaw && typeof prevRaw === "object"
      ? (prevRaw as Record<string, unknown>)
      : {};
  const existingLock =
    prev.lock != null
      ? ActiveStoryLockSchema.safeParse(prev.lock)
      : null;
  let lock: ActiveStoryLock | null | undefined =
    existingLock && existingLock.success ? existingLock.data : undefined;
  if (!lock && input.acquireLock) {
    lock = ActiveStoryLockSchema.parse({
      ...input.acquireLock,
      packageId: input.acquireLock.packageId ?? input.packageId,
      startedAt: input.acquireLock.startedAt ?? input.nowIso,
    });
  }
  const next: Record<string, unknown> = {
    ...prev,
    packageId: input.packageId,
    status: "active",
    instanceId: input.instanceId,
    variables:
      prev.variables && typeof prev.variables === "object"
        ? prev.variables
        : {},
  };
  if (lock !== undefined) {
    next.lock = lock;
  } else if (prev.lock === null) {
    next.lock = null;
  }
  profile.stories[input.packageId] = next;
}

/** 挂机／end_story：清除该包 lock（释放读闸） */
export function releaseStoryLock(
  profile: PlayerProfile,
  packageId: string,
): void {
  const prevRaw = profile.stories[packageId];
  if (!prevRaw || typeof prevRaw !== "object") return;
  const prev = prevRaw as Record<string, unknown>;
  profile.stories[packageId] = {
    ...prev,
    packageId:
      typeof prev.packageId === "string" ? prev.packageId : packageId,
    lock: null,
  };
}
