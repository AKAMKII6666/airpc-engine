/**
 * 模块名称：Schedule once 到期扫描（clockMs + fireAtMs）
 * 模块说明：到期后挂 outbound pending，供 agent_outbound resolve；禁止仅靠 topicHint 推进。
 */
import { randomUUID } from "node:crypto";
import type { CallCardInstance, PlayerProfile } from "../schema/profile.js";

export interface ScheduledOnceIntent {
	kind: "once";
	intentId: string;
	agentId: string;
	cardId: string;
	packageId: string;
	topicHint?: string;
	fireAtMs: number;
	status: "pending" | "fired" | "cancelled";
	createdAt?: string;
}

export interface FiredScheduleItem {
	intentId: string;
	agentId: string;
	cardId: string;
	packageId: string;
	instanceId: string;
}

function ensureAgentBoard(
	profile: PlayerProfile,
	agentId: string,
): { pending: CallCardInstance[] } {
	const byAgent = profile.callCards.board.byAgent;
	if (!byAgent[agentId]) {
		byAgent[agentId] = { pending: [] };
	}
	return byAgent[agentId]!;
}

function asOnceIntent(raw: unknown): ScheduledOnceIntent | null {
	if (!raw || typeof raw !== "object") {
		return null;
	}
	const row = raw as Record<string, unknown>;
	// 定稿 shape
	if (row.kind === "once") {
		const cardId = typeof row.cardId === "string" ? row.cardId : "";
		const packageId = typeof row.packageId === "string" ? row.packageId : "";
		const agentId = typeof row.agentId === "string" ? row.agentId : "";
		const intentId =
			typeof row.intentId === "string"
				? row.intentId
				: typeof row.id === "string"
					? row.id
					: "";
		const fireAtMs =
			typeof row.fireAtMs === "number"
				? row.fireAtMs
				: typeof row.triggerAtMs === "number"
					? row.triggerAtMs
					: NaN;
		if (!cardId || !packageId || !agentId || !intentId || !Number.isFinite(fireAtMs)) {
			return null;
		}
		const status =
			row.status === "fired" || row.status === "cancelled"
				? row.status
				: "pending";
		return {
			kind: "once",
			intentId,
			agentId,
			cardId,
			packageId,
			topicHint: typeof row.topicHint === "string" ? row.topicHint : undefined,
			fireAtMs,
			status,
			createdAt: typeof row.createdAt === "string" ? row.createdAt : undefined,
		};
	}
	// 旧 shape：kind=schedule_call_card + triggerAtMs（无 cardId 则不可点火，避免 topicHint 假推进）
	if (row.kind === "schedule_call_card") {
		const cardId = typeof row.cardId === "string" ? row.cardId : "";
		const packageId = typeof row.packageId === "string" ? row.packageId : "";
		if (!cardId || !packageId) {
			return null;
		}
		const agentId = typeof row.agentId === "string" ? row.agentId : "";
		const intentId = typeof row.id === "string" ? row.id : "";
		const fireAtMs =
			typeof row.triggerAtMs === "number" ? row.triggerAtMs : NaN;
		if (!agentId || !intentId || !Number.isFinite(fireAtMs)) {
			return null;
		}
		return {
			kind: "once",
			intentId,
			agentId,
			cardId,
			packageId,
			topicHint: typeof row.topicHint === "string" ? row.topicHint : undefined,
			fireAtMs,
			status: "pending",
			createdAt: typeof row.createdAt === "string" ? row.createdAt : undefined,
		};
	}
	return null;
}

function ensureOutboundPending(
	profile: PlayerProfile,
	intent: ScheduledOnceIntent,
	nowIso: string,
): CallCardInstance {
	const board = ensureAgentBoard(profile, intent.agentId);
	const existing = board.pending.find(function (item) {
		return (
			item.cardId === intent.cardId &&
			item.packageId === intent.packageId &&
			item.status === "pending"
		);
	});
	if (existing) {
		if (!existing.entryMode) {
			existing.entryMode = "outbound_auto";
		}
		return existing;
	}
	const created: CallCardInstance = {
		instanceId: randomUUID(),
		cardId: intent.cardId,
		packageId: intent.packageId,
		agentId: intent.agentId,
		status: "pending",
		entryMode: "outbound_auto",
		createdAt: nowIso,
		updatedAt: nowIso,
	};
	board.pending.push(created);
	return created;
}

/**
 * 扫描 due once intents：挂 outbound pending，标 fired。
 * 不改 recurring（壳 Sink）；无 cardId 的意图跳过且不假装推进。
 */
export function tickScheduleOnce(
	profile: PlayerProfile,
	nowIso = new Date().toISOString(),
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
			nextIntents.push({
				kind: "once",
				intentId: once.intentId,
				agentId: once.agentId,
				cardId: once.cardId,
				packageId: once.packageId,
				topicHint: once.topicHint,
				fireAtMs: once.fireAtMs,
				status: once.status,
				createdAt: once.createdAt,
			});
			continue;
		}
		const instance = ensureOutboundPending(profile, once, nowIso);
		fired.push({
			intentId: once.intentId,
			agentId: once.agentId,
			cardId: once.cardId,
			packageId: once.packageId,
			instanceId: instance.instanceId,
		});
		nextIntents.push({
			kind: "once",
			intentId: once.intentId,
			agentId: once.agentId,
			cardId: once.cardId,
			packageId: once.packageId,
			topicHint: once.topicHint,
			fireAtMs: once.fireAtMs,
			status: "fired",
			createdAt: once.createdAt,
		});
	}

	profile.schedule.intents = nextIntents;
	return fired;
}

export function advanceProfileClock(
	profile: PlayerProfile,
	deltaMs: number,
	nowIso = new Date().toISOString(),
): FiredScheduleItem[] {
	if (!profile.schedule) {
		profile.schedule = { clockMs: 0, intents: [] };
	}
	if (!Number.isFinite(deltaMs) || deltaMs < 0) {
		throw new Error(`invalid clock deltaMs: ${String(deltaMs)}`);
	}
	profile.schedule.clockMs = (profile.schedule.clockMs ?? 0) + deltaMs;
	return tickScheduleOnce(profile, nowIso);
}
