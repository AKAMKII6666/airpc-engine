/**
 * 模块名称：schedule once intent 解析／序列化
 * 从 scheduleTick 拆出：降低基线 maxFnLines／complexity。
 */
export type ScheduledOnceIntent = {
	kind: "once";
	intentId: string;
	agentId: string;
	cardId: string;
	packageId: string;
	topicHint?: string;
	fireAtMs: number;
	status: "pending" | "fired" | "cancelled" | "consumed";
	createdAt?: string;
	sourcedFromRecurringId?: string;
	linkedInstanceId?: string;
	/** voicemail 延迟进信箱标记；序列化须保留 */
	delivery?: string;
};

function optionalString(value: unknown): string | undefined {
	return typeof value === "string" && value ? value : undefined;
}

function parseOnceStatus(
	raw: unknown,
): ScheduledOnceIntent["status"] {
	if (raw === "fired" || raw === "cancelled" || raw === "consumed") {
		return raw;
	}
	return "pending";
}

function parseModernOnce(
	row: Record<string, unknown>,
): ScheduledOnceIntent | null {
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
	return {
		kind: "once",
		intentId,
		agentId,
		cardId,
		packageId,
		topicHint: optionalString(row.topicHint),
		fireAtMs,
		status: parseOnceStatus(row.status),
		createdAt: optionalString(row.createdAt),
		sourcedFromRecurringId: optionalString(row.sourcedFromRecurringId),
		linkedInstanceId: optionalString(row.linkedInstanceId),
		delivery: optionalString(row.delivery),
	};
}

function parseLegacyScheduleCallCard(
	row: Record<string, unknown>,
): ScheduledOnceIntent | null {
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
		topicHint: optionalString(row.topicHint),
		fireAtMs,
		status: "pending",
		createdAt: optionalString(row.createdAt),
		linkedInstanceId: optionalString(row.linkedInstanceId),
	};
}

export function asOnceIntent(raw: unknown): ScheduledOnceIntent | null {
	if (!raw || typeof raw !== "object") {
		return null;
	}
	const row = raw as Record<string, unknown>;
	if (row.kind === "once") {
		return parseModernOnce(row);
	}
	if (row.kind === "schedule_call_card") {
		return parseLegacyScheduleCallCard(row);
	}
	return null;
}

export function serializeOnce(
	once: ScheduledOnceIntent,
): Record<string, unknown> {
	const row: Record<string, unknown> = {
		kind: "once",
		intentId: once.intentId,
		agentId: once.agentId,
		cardId: once.cardId,
		packageId: once.packageId,
		fireAtMs: once.fireAtMs,
		status: once.status,
	};
	if (once.topicHint) row.topicHint = once.topicHint;
	if (once.createdAt) row.createdAt = once.createdAt;
	if (once.sourcedFromRecurringId) {
		row.sourcedFromRecurringId = once.sourcedFromRecurringId;
	}
	if (once.linkedInstanceId) row.linkedInstanceId = once.linkedInstanceId;
	if (once.delivery) row.delivery = once.delivery;
	return row;
}
