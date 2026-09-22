/**
 * 加载/tick 前重解析 recurring intent：失效引用 → disabled，禁止 once/pending/fired。
 */
import type { PlayerProfile } from "../schema/identity/profile.js";
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
  chapterId?: string;
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
    chapterId?: string;
    status: string;
  };
}

function isTerminalRecurringStatus(status: string): boolean {
	return (
		status === "paused" ||
		status === "cancelled" ||
		status === "disabled"
	);
}

function disableUnresolvedRecurring(
	rec: NonNullable<ReturnType<typeof asRecurring>>,
	lookup: ScheduledCardLookup,
): { disabled: true; row: unknown; intentId: string } | { disabled: false } {
	const resolved = resolveScheduledCardReference(
		{
			agentId: rec.agentId,
			scheduleCardId:
				typeof rec.scheduleCardId === "string" ? rec.scheduleCardId : undefined,
			cardId: typeof rec.cardId === "string" ? rec.cardId : undefined,
			chapterId: typeof rec.chapterId === "string" ? rec.chapterId : undefined,
		},
		lookup,
	);
	if (resolved.ok) return { disabled: false };
	return {
		disabled: true,
		intentId: rec.intentId,
		row: {
			...rec,
			status: "disabled",
			disabledReason: `${resolved.code}: ${resolved.reason}`,
		},
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
		if (!rec || isTerminalRecurringStatus(rec.status)) {
			next.push(raw);
			continue;
		}
		const result = disableUnresolvedRecurring(rec, lookup);
		if (result.disabled) {
			disabledIds.push(result.intentId);
			next.push(result.row);
			continue;
		}
		next.push(raw);
	}
	profile.schedule.intents = next;
	return disabledIds;
}
