/**
 * 模块名称：Profile.schedule 时钟模拟器（once + recurring）
 * 模块说明：
 * - once：clockMs ≥ fireAtMs → 挂 outbound pending（或复用 linked），标 fired
 * - schedule_call_card：挂机时已挂 either pending + linkedInstanceId；tick 遇已消费 pending 则跳过
 * - recurring：跨过逻辑日时刻 → 物化为可 resolve 的 once（须有卡引用）；
 *   再经 tick 挂 pending → agent_outbound；真壁钟仍归壳 Sink
 * - 禁止裸 recurring：缺 scheduleCardId／cardId+packageId → disabled，不物化 once
 */
import { FREE_PACKAGE_ID, SCHEDULE_PACKAGE_ID } from "../constants.js";
import { hasRecurringCardRef } from "../schema/schedule.js";
import type { PlayerProfile } from "../schema/profile.js";
import type { ScheduledCardLookup } from "../schedule/scheduleCardReferenceResolver.js";
import { fireDueOnceIntent } from "./scheduleOnceFire.js";
import {
	asOnceIntent,
	serializeOnce,
} from "./scheduleOnceIntent.js";

export type { ScheduledOnceIntent } from "./scheduleOnceIntent.js";

/** 逻辑日长：clockMs 按此取模映射 hour/minute */
export const SCHEDULE_DAY_MS = 24 * 60 * 60 * 1000;

export interface ScheduledRecurringIntent {
	kind: "recurring";
	intentId: string;
	agentId: string;
	/** 推荐：characters/schedule-cards 下的 ScheduleCard id */
	scheduleCardId?: string;
	cardId?: string;
	packageId?: string;
	topicHint?: string;
	hour: number;
	minute: number;
	scheduleMode: "daily" | "weekly";
	weekdays?: number[];
	status: "active" | "paused" | "cancelled" | "disabled";
	/** 已物化 once 的最高 fireAtMs（含）；防重复 */
	lastMaterializedAtMs?: number;
	createdAt?: string;
}

export interface FiredScheduleItem {
	intentId: string;
	agentId: string;
	cardId: string;
	packageId: string;
	instanceId: string;
}

export interface AdvanceToNextResult {
	fromClockMs: number;
	toClockMs: number;
	advancedMs: number;
	fired: FiredScheduleItem[];
	reason: "once" | "recurring" | "none";
}

/**
 * 将 recurring 卡引用解析为可挂 pending 的 cardId+packageId。
 * scheduleCardId → (__schedule__, id)；否则使用显式 cardId+packageId。
 */
export function resolveRecurringCardTarget(
	rec: Pick<
		ScheduledRecurringIntent,
		"scheduleCardId" | "cardId" | "packageId"
	>,
): { cardId: string; packageId: string } | null {
	if (typeof rec.scheduleCardId === "string" && rec.scheduleCardId) {
		return {
			cardId: rec.scheduleCardId,
			packageId: SCHEDULE_PACKAGE_ID,
		};
	}
	if (
		typeof rec.cardId === "string" &&
		rec.cardId &&
		typeof rec.packageId === "string" &&
		rec.packageId
	) {
		return { cardId: rec.cardId, packageId: rec.packageId };
	}
	return null;
}

function asRecurringIntent(raw: unknown): ScheduledRecurringIntent | null {
	if (!raw || typeof raw !== "object") {
		return null;
	}
	const row = raw as Record<string, unknown>;
	if (row.kind !== "recurring") {
		return null;
	}
	const intentId =
		typeof row.intentId === "string"
			? row.intentId
			: typeof row.id === "string"
				? row.id
				: "";
	const agentId = typeof row.agentId === "string" ? row.agentId : "";
	const hour =
		typeof row.hour === "number" && Number.isFinite(row.hour)
			? Math.min(23, Math.max(0, Math.trunc(row.hour)))
			: NaN;
	const minute =
		typeof row.minute === "number" && Number.isFinite(row.minute)
			? Math.min(59, Math.max(0, Math.trunc(row.minute)))
			: NaN;
	if (!intentId || !agentId || !Number.isFinite(hour) || !Number.isFinite(minute)) {
		return null;
	}
	const status =
		row.status === "paused" ||
		row.status === "cancelled" ||
		row.status === "disabled"
			? row.status
			: "active";
	const scheduleMode = row.scheduleMode === "weekly" ? "weekly" : "daily";
	const weekdays = Array.isArray(row.weekdays)
		? row.weekdays.filter(function (d): d is number {
				return typeof d === "number" && Number.isInteger(d) && d >= 0 && d <= 6;
			})
		: undefined;
	return {
		kind: "recurring",
		intentId,
		agentId,
		scheduleCardId:
			typeof row.scheduleCardId === "string" && row.scheduleCardId
				? row.scheduleCardId
				: undefined,
		cardId: typeof row.cardId === "string" && row.cardId ? row.cardId : undefined,
		packageId:
			typeof row.packageId === "string" && row.packageId
				? row.packageId
				: undefined,
		topicHint: typeof row.topicHint === "string" ? row.topicHint : undefined,
		hour,
		minute,
		scheduleMode,
		weekdays,
		status,
		lastMaterializedAtMs:
			typeof row.lastMaterializedAtMs === "number" &&
			Number.isFinite(row.lastMaterializedAtMs)
				? row.lastMaterializedAtMs
				: undefined,
		createdAt: typeof row.createdAt === "string" ? row.createdAt : undefined,
	};
}

function timeOfDayMs(hour: number, minute: number): number {
	return hour * 3_600_000 + minute * 60_000;
}

function occurrenceAtDay(
	dayIndex: number,
	hour: number,
	minute: number,
): number {
	return dayIndex * SCHEDULE_DAY_MS + timeOfDayMs(hour, minute);
}

function weekdayOfDayIndex(dayIndex: number): number {
	// 逻辑日 0 → 周日；与需求 weekdays 0=周日…6=周六对齐
	const mod = dayIndex % 7;
	return mod < 0 ? mod + 7 : mod;
}

function recurringMatchesDay(
	rec: ScheduledRecurringIntent,
	dayIndex: number,
): boolean {
	if (rec.scheduleMode !== "weekly") {
		return true;
	}
	const days = rec.weekdays;
	if (!days || days.length === 0) {
		return true;
	}
	return days.includes(weekdayOfDayIndex(dayIndex));
}

function serializeRecurring(rec: ScheduledRecurringIntent): Record<string, unknown> {
	const out: Record<string, unknown> = {
		kind: "recurring",
		intentId: rec.intentId,
		agentId: rec.agentId,
		hour: rec.hour,
		minute: rec.minute,
		scheduleMode: rec.scheduleMode,
		status: rec.status,
	};
	if (rec.scheduleCardId) out.scheduleCardId = rec.scheduleCardId;
	if (rec.cardId) out.cardId = rec.cardId;
	if (rec.packageId) out.packageId = rec.packageId;
	if (rec.topicHint) out.topicHint = rec.topicHint;
	if (rec.weekdays && rec.weekdays.length > 0) out.weekdays = rec.weekdays;
	if (typeof rec.lastMaterializedAtMs === "number") {
		out.lastMaterializedAtMs = rec.lastMaterializedAtMs;
	}
	if (rec.createdAt) out.createdAt = rec.createdAt;
	return out;
}

function buildOccurrenceOnce(
	rec: ScheduledRecurringIntent,
	target: { cardId: string; packageId: string },
	fireAtMs: number,
	dayIndex: number,
	nowIso: string,
): Record<string, unknown> {
	const row: Record<string, unknown> = {
		kind: "once",
		intentId: `${rec.intentId}__d${dayIndex}`,
		agentId: rec.agentId,
		cardId: target.cardId,
		packageId: target.packageId,
		fireAtMs,
		status: "pending",
		createdAt: nowIso,
		sourcedFromRecurringId: rec.intentId,
	};
	if (rec.topicHint) row.topicHint = rec.topicHint;
	return row;
}

/**
 * 在 (fromExclusive, toInclusive] 内为 active recurring 生成可 resolve 的 once。
 * 无卡引用的 recurring → disabled，不生成可观测 once（禁止裸外呼）。
 */
export function materializeRecurringOccurrences(
	profile: PlayerProfile,
	fromExclusiveMs: number,
	toInclusiveMs: number,
	nowIso = new Date().toISOString(),
): number {
	if (!profile.schedule) {
		profile.schedule = { clockMs: 0, intents: [] };
	}
	if (!(toInclusiveMs > fromExclusiveMs)) {
		return 0;
	}

	const existingIds = new Set<string>();
	for (const raw of profile.schedule.intents) {
		if (!raw || typeof raw !== "object") continue;
		const id = (raw as { intentId?: unknown }).intentId;
		if (typeof id === "string") existingIds.add(id);
	}

	const nextIntents: unknown[] = [];
	let spawned = 0;

	for (const raw of profile.schedule.intents) {
		const rec = asRecurringIntent(raw);
		if (!rec) {
			nextIntents.push(raw);
			continue;
		}
		if (rec.status === "paused" || rec.status === "cancelled") {
			nextIntents.push(serializeRecurring(rec));
			continue;
		}

		// 缺卡引用：标记 disabled，禁止静默物化为可观测 once
		if (!hasRecurringCardRef(rec) || rec.status === "disabled") {
			nextIntents.push(
				serializeRecurring({
					...rec,
					status: "disabled",
				}),
			);
			continue;
		}

		const target = resolveRecurringCardTarget(rec);
		if (!target) {
			nextIntents.push(
				serializeRecurring({
					...rec,
					status: "disabled",
				}),
			);
			continue;
		}

		const floorStart = Math.floor(fromExclusiveMs / SCHEDULE_DAY_MS);
		const floorEnd = Math.floor(toInclusiveMs / SCHEDULE_DAY_MS);
		let lastMat = rec.lastMaterializedAtMs;

		for (let day = floorStart; day <= floorEnd; day += 1) {
			if (!recurringMatchesDay(rec, day)) continue;
			const fireAt = occurrenceAtDay(day, rec.hour, rec.minute);
			if (!(fireAt > fromExclusiveMs && fireAt <= toInclusiveMs)) continue;
			if (typeof lastMat === "number" && fireAt <= lastMat) continue;

			const occId = `${rec.intentId}__d${day}`;
			if (!existingIds.has(occId)) {
				nextIntents.push(
					buildOccurrenceOnce(rec, target, fireAt, day, nowIso),
				);
				existingIds.add(occId);
				spawned += 1;
			}
			lastMat = fireAt;
		}

		nextIntents.push(
			serializeRecurring({
				...rec,
				status: "active",
				lastMaterializedAtMs: lastMat,
			}),
		);
	}

	profile.schedule.intents = nextIntents;
	return spawned;
}

/**
 * 扫描 due once intents：挂／复用 outbound pending，标 fired。
 * voicemail（delivery 或 lookup）：入 GenStack，不进 fired（无 agent_outbound）。
 * linked pending 已非 pending → 标 consumed／cancelled，不重复外呼。
 * recurring 由 materializeRecurringOccurrences 先行物化；本函数不直接改 recurring。
 */
export function tickScheduleOnce(
	profile: PlayerProfile,
	nowIso = new Date().toISOString(),
	lookupCard?: ScheduledCardLookup | null,
): FiredScheduleItem[] {
	if (!profile.schedule) {
		profile.schedule = { clockMs: 0, intents: [] };
	}
	const clockMs = profile.schedule.clockMs ?? 0;
	const fired: FiredScheduleItem[] = [];
	const nextIntents: unknown[] = [];

	for (const raw of profile.schedule.intents) {
		const once = asOnceIntent(raw);
		if (!once) {
			nextIntents.push(raw);
			continue;
		}
		if (once.status !== "pending" || once.fireAtMs > clockMs) {
			nextIntents.push(serializeOnce(once));
			continue;
		}

		const result = fireDueOnceIntent(
			profile,
			once,
			raw,
			nowIso,
			lookupCard,
		);
		if (result.kind === "defer") {
			nextIntents.push(serializeOnce(result.once));
			continue;
		}
		if (result.kind === "outbound") {
			fired.push(result.fired);
		}
		nextIntents.push(serializeOnce(result.once));
	}

	profile.schedule.intents = nextIntents;
	return fired;
}

/**
 * beginCall 消费延迟外呼 pending：关联 once intent → consumed，避免后续 tick 再外呼。
 */
export function consumeLinkedOnceIntent(
	profile: PlayerProfile,
	opts: { instanceId?: string; intentId?: string },
): boolean {
	if (!profile.schedule) {
		return false;
	}
	let changed = false;
	const next: unknown[] = [];
	for (const raw of profile.schedule.intents) {
		const once = asOnceIntent(raw);
		if (!once) {
			next.push(raw);
			continue;
		}
		const byInstance =
			opts.instanceId &&
			once.linkedInstanceId &&
			once.linkedInstanceId === opts.instanceId;
		const byIntent = opts.intentId && once.intentId === opts.intentId;
		if (
			(byInstance || byIntent) &&
			(once.status === "pending" || once.status === "fired")
		) {
			next.push(serializeOnce({ ...once, status: "consumed" }));
			changed = true;
			continue;
		}
		next.push(serializeOnce(once));
	}
	if (changed) {
		profile.schedule.intents = next;
	}
	return changed;
}

/**
 * 章节清场：移除全体角色非 Free／非 Schedule 的 story pending。
 * FreeCard 不进 board；Schedule 日常 pending 保留。
 */
export function clearStoryPendingCards(profile: PlayerProfile): number {
	let removed = 0;
	const byAgent = profile.callCards.board.byAgent;
	for (const agentId of Object.keys(byAgent)) {
		const board = byAgent[agentId];
		if (!board) continue;
		const next = board.pending.filter(function (item) {
			const keep =
				item.packageId === FREE_PACKAGE_ID ||
				item.packageId === SCHEDULE_PACKAGE_ID;
			if (!keep) removed += 1;
			return keep;
		});
		board.pending = next;
	}
	return removed;
}

/**
 * 取消剧情 once intent（非 __free__／非 __schedule__）；recurring 不动。
 */
export function cancelStoryOnceIntents(profile: PlayerProfile): number {
	if (!profile.schedule) {
		return 0;
	}
	let cancelled = 0;
	const next: unknown[] = [];
	for (const raw of profile.schedule.intents) {
		const once = asOnceIntent(raw);
		if (!once) {
			next.push(raw);
			continue;
		}
		const isStoryOnce =
			once.packageId !== FREE_PACKAGE_ID &&
			once.packageId !== SCHEDULE_PACKAGE_ID;
		if (
			isStoryOnce &&
			(once.status === "pending" || once.status === "fired")
		) {
			next.push(serializeOnce({ ...once, status: "cancelled" }));
			cancelled += 1;
			continue;
		}
		next.push(serializeOnce(once));
	}
	profile.schedule.intents = next;
	return cancelled;
}

function ensureSchedule(profile: PlayerProfile): {
	clockMs: number;
	intents: unknown[];
} {
	if (!profile.schedule) {
		profile.schedule = { clockMs: 0, intents: [] };
	}
	return profile.schedule;
}

/**
 * 下一意图逻辑时刻（大于 fromExclusiveMs）：pending once.fireAtMs 或 recurring 下次 occurrence。
 * 无卡引用的 recurring 不参与 peek（已/将 disabled）。
 */
export function peekNextScheduleFireAtMs(
	profile: PlayerProfile,
	fromExclusiveMs?: number,
): { fireAtMs: number; reason: "once" | "recurring" } | null {
	const schedule = ensureSchedule(profile);
	const base =
		typeof fromExclusiveMs === "number" && Number.isFinite(fromExclusiveMs)
			? fromExclusiveMs
			: schedule.clockMs ?? 0;

	let best: { fireAtMs: number; reason: "once" | "recurring" } | null = null;

	function consider(fireAtMs: number, reason: "once" | "recurring"): void {
		if (!(fireAtMs > base)) return;
		if (!best || fireAtMs < best.fireAtMs) {
			best = { fireAtMs, reason };
		}
	}

	for (const raw of schedule.intents) {
		const once = asOnceIntent(raw);
		if (once && once.status === "pending") {
			consider(once.fireAtMs, "once");
			continue;
		}
		const rec = asRecurringIntent(raw);
		if (!rec || rec.status !== "active") continue;
		if (!hasRecurringCardRef(rec) || !resolveRecurringCardTarget(rec)) {
			continue;
		}

		const startDay = Math.floor(base / SCHEDULE_DAY_MS);
		// 扫描有界天数（含 weekly 跨周）
		for (let day = startDay; day <= startDay + 14; day += 1) {
			if (!recurringMatchesDay(rec, day)) continue;
			const fireAt = occurrenceAtDay(day, rec.hour, rec.minute);
			if (
				typeof rec.lastMaterializedAtMs === "number" &&
				fireAt <= rec.lastMaterializedAtMs
			) {
				continue;
			}
			if (fireAt > base) {
				consider(fireAt, "recurring");
				break;
			}
		}
	}

	return best;
}

export function advanceProfileClock(
	profile: PlayerProfile,
	deltaMs: number,
	nowIso = new Date().toISOString(),
	lookupCard?: ScheduledCardLookup | null,
): FiredScheduleItem[] {
	const schedule = ensureSchedule(profile);
	if (!Number.isFinite(deltaMs) || deltaMs < 0) {
		throw new Error(`invalid clock deltaMs: ${String(deltaMs)}`);
	}
	const from = schedule.clockMs ?? 0;
	schedule.clockMs = from + deltaMs;
	materializeRecurringOccurrences(profile, from, schedule.clockMs, nowIso);
	return tickScheduleOnce(profile, nowIso, lookupCard);
}

/** 跳到绝对逻辑时刻（仅允许前进）；并物化 recurring + tick once */
export function setProfileClockMs(
	profile: PlayerProfile,
	toClockMs: number,
	nowIso = new Date().toISOString(),
	lookupCard?: ScheduledCardLookup | null,
): FiredScheduleItem[] {
	const schedule = ensureSchedule(profile);
	if (!Number.isFinite(toClockMs) || toClockMs < 0) {
		throw new Error(`invalid toClockMs: ${String(toClockMs)}`);
	}
	const from = schedule.clockMs ?? 0;
	if (toClockMs < from) {
		throw new Error(
			`toClockMs ${toClockMs} < current clockMs ${from}（Tick 模拟器仅允许前进）`,
		);
	}
	schedule.clockMs = toClockMs;
	materializeRecurringOccurrences(profile, from, toClockMs, nowIso);
	return tickScheduleOnce(profile, nowIso, lookupCard);
}

/** 推到下一意图触发点（once 或 recurring occurrence） */
export function advanceProfileClockToNextIntent(
	profile: PlayerProfile,
	nowIso = new Date().toISOString(),
	lookupCard?: ScheduledCardLookup | null,
): AdvanceToNextResult {
	const schedule = ensureSchedule(profile);
	const fromClockMs = schedule.clockMs ?? 0;
	const next = peekNextScheduleFireAtMs(profile, fromClockMs);
	if (!next) {
		return {
			fromClockMs,
			toClockMs: fromClockMs,
			advancedMs: 0,
			fired: [],
			reason: "none",
		};
	}
	const fired = setProfileClockMs(profile, next.fireAtMs, nowIso, lookupCard);
	return {
		fromClockMs,
		toClockMs: next.fireAtMs,
		advancedMs: next.fireAtMs - fromClockMs,
		fired,
		reason: next.reason,
	};
}
