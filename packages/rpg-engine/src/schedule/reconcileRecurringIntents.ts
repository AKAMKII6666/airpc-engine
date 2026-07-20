/**
 * 加载/tick 前重解析 recurring intent：失效引用 → disabled，禁止 once/pending/fired。
 */
import type { PlayerProfile } from "../schema/profile.js";
import {
  resolveScheduledCardReference,
  type ScheduledCardLookup,
} from "./scheduleCardReferenceResolver.js";

function asRecurring(raw: unknown): {
  kind: "recurring";
  intentId: string;
  agentId: string;
  scheduleCardId?: string;
  cardId?: string;
  packageId?: string;
  status: string;
  [k: string]: unknown;
} | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.kind !== "recurring") return null;
  if (typeof o.intentId !== "string" || typeof o.agentId !== "string") {
    return null;
  }
  return o as {
    kind: "recurring";
    intentId: string;
    agentId: string;
    scheduleCardId?: string;
    cardId?: string;
    packageId?: string;
    status: string;
  };
}

/**
 * 就地修复 profile.schedule.intents：无法解析的 recurring 标 disabled 并写入 disabledReason。
 * @returns 被 disabled 的 intentId 列表
 */
export function reconcileRecurringIntents(
  profile: PlayerProfile,
  lookup: ScheduledCardLookup,
): string[] {
  if (!profile.schedule?.intents?.length) return [];
  const disabledIds: string[] = [];
  const next: unknown[] = [];

  for (const raw of profile.schedule.intents) {
    const rec = asRecurring(raw);
    if (!rec) {
      next.push(raw);
      continue;
    }
    if (
      rec.status === "paused" ||
      rec.status === "cancelled" ||
      rec.status === "disabled"
    ) {
      next.push(raw);
      continue;
    }

    const resolved = resolveScheduledCardReference(
      {
        agentId: rec.agentId,
        scheduleCardId:
          typeof rec.scheduleCardId === "string" ? rec.scheduleCardId : undefined,
        cardId: typeof rec.cardId === "string" ? rec.cardId : undefined,
        packageId: typeof rec.packageId === "string" ? rec.packageId : undefined,
      },
      lookup,
    );

    if (!resolved.ok) {
      disabledIds.push(rec.intentId);
      next.push({
        ...rec,
        status: "disabled",
        disabledReason: `${resolved.code}: ${resolved.reason}`,
      });
      continue;
    }

    next.push(raw);
  }

  profile.schedule.intents = next;
  return disabledIds;
}
