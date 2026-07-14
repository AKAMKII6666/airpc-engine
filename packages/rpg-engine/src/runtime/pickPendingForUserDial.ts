/**
 * 模块名称：按 intent + entryMode 从 Board 挑选 pending
 * 模块说明：user_dial → inbound_user_dial|either；外呼 → outbound_auto|either；
 * redialSlot 命中仍须过 entryMode。
 */
import type { CallCardInstance, PlayerProfile } from "../schema/profile.js";

export type PendingPickKind = "user_dial" | "agent_outbound";

export interface PickPendingOptions {
	/** Instance 无 entryMode 时回落到卡定义等 */
	resolveEntryMode?: (instance: CallCardInstance) => string | undefined;
}

/** 需求 01 枚举 + composeScene 已用的等价别名 */
const USER_DIAL_MODES = new Set([
	"inbound_user_dial",
	"either",
	"inbound",
]);

const OUTBOUND_MODES = new Set([
	"outbound_auto",
	"either",
	"outbound",
	"agent_outbound",
]);

export function matchesEntryModeForIntent(
	entryMode: string | undefined,
	kind: PendingPickKind,
): boolean {
	if (!entryMode) {
		return false;
	}
	if (kind === "user_dial") {
		return USER_DIAL_MODES.has(entryMode);
	}
	return OUTBOUND_MODES.has(entryMode);
}

function effectiveEntryMode(
	instance: CallCardInstance,
	opts?: PickPendingOptions,
): string | undefined {
	if (instance.entryMode) {
		return instance.entryMode;
	}
	return opts?.resolveEntryMode?.(instance);
}

/**
 * 在 pending 中按 entryMode 过滤；redialSlot 仅作优先，不过 mode 则丢弃该优先。
 * 同资格多条：先比 priority 降序，再比 createdAt 最新。
 */
export function pickPendingForIntent(
	profile: PlayerProfile,
	agentId: string,
	kind: PendingPickKind,
	opts?: PickPendingOptions,
): CallCardInstance | null {
	const pending =
		profile.callCards.board.byAgent[agentId]?.pending.filter(function (item) {
			return item.status === "pending";
		}) ?? [];
	if (pending.length === 0) {
		return null;
	}

	const eligible = pending.filter(function (item) {
		return matchesEntryModeForIntent(effectiveEntryMode(item, opts), kind);
	});
	if (eligible.length === 0) {
		return null;
	}

	const slot = profile.telephony?.redialSlot;
	if (slot && slot.agentId === agentId && slot.cardId) {
		const hit = eligible.find(function (item) {
			return item.cardId === slot.cardId;
		});
		if (hit) {
			return hit;
		}
	}

	const sorted = eligible.slice().sort(function (a, b) {
		const pa = typeof a.priority === "number" ? a.priority : 0;
		const pb = typeof b.priority === "number" ? b.priority : 0;
		if (pb !== pa) {
			return pb - pa;
		}
		return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
	});
	return sorted[0] ?? null;
}

/** @deprecated 语义保留：等价 pickPendingForIntent(..., "user_dial") */
export function pickPendingForUserDial(
	profile: PlayerProfile,
	agentId: string,
	opts?: PickPendingOptions,
): CallCardInstance | null {
	return pickPendingForIntent(profile, agentId, "user_dial", opts);
}
