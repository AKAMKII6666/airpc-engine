/**
 * 模块名称：听完留言写槽 + 未读再通知
 * 模块说明：
 * - Outcome 表示已听/播完时，将对应 telephony.voicemails[] 改为 status=listened
 * - 未读真源仍在 Profile；壳只订阅 onVoicemailUnreadChanged，禁止私改
 * 需求：语音留言改造 §3.5–§3.6；schema VoicemailSlotStatus listened
 */
import type { CallIntent, CallSession } from "../../host/types.js";
import type { Outcome } from "../../schema/outcome.js";
import type { PlayerProfile, VoicemailSlot } from "../../schema/profile.js";
import { deriveVoicemailHasUnread } from "../../schema/profile.js";
import type { OnVoicemailUnreadChanged } from "./voicemailPorts.js";

/** Outcome 表示本通已听/播完留言（含跳过） */
export function outcomeIndicatesVoicemailListened(outcome: Outcome): boolean {
	const flags = outcome.flags ?? {};
	return (
		flags.voicemail_listened === true ||
		flags.playback_completed === true ||
		flags.playback_skipped === true
	);
}

function slotsOf(profile: PlayerProfile): VoicemailSlot[] | undefined {
	const list = profile.telephony?.voicemails;
	return Array.isArray(list) ? list : undefined;
}

/**
 * 定位本通对应槽：mailbox_open 用 voicemailId；否则按 agentId+cardId 优先未读。
 */
export function findVoicemailSlotForSession(input: {
	profile: PlayerProfile;
	intent: CallIntent;
	agentId: string;
	cardId: string;
}): VoicemailSlot | undefined {
	const list = slotsOf(input.profile);
	if (!list || list.length === 0) return undefined;

	if (input.intent.kind === "mailbox_open") {
		const voicemailId = input.intent.voicemailId;
		return list.find(function (slot) {
			return slot.id === voicemailId;
		});
	}

	const matching = list.filter(function (slot) {
		return (
			slot.agentId === input.agentId &&
			(slot.cardId === undefined || slot.cardId === input.cardId)
		);
	});
	if (matching.length === 0) return undefined;
	const unread = matching.find(function (slot) {
		return slot.status === "unread" || slot.status === "stub_pending";
	});
	return unread ?? matching[matching.length - 1];
}

export type MarkVoicemailListenedResult = {
	changed: boolean;
	slotId?: string;
	hasUnread: boolean;
};

/**
 * 听完写 listened + listenedAt；若状态变化则回调未读推导结果。
 */
export function markVoicemailListened(input: {
	profile: PlayerProfile;
	intent: CallIntent;
	agentId: string;
	cardId: string;
	cardKind: string | undefined;
	outcome: Outcome;
	nowIso: string;
	onVoicemailUnreadChanged?: OnVoicemailUnreadChanged | null;
}): MarkVoicemailListenedResult {
	const hasUnreadBefore = deriveVoicemailHasUnread(input.profile.telephony);
	if (input.cardKind !== "voicemail") {
		return { changed: false, hasUnread: hasUnreadBefore };
	}
	if (!outcomeIndicatesVoicemailListened(input.outcome)) {
		return { changed: false, hasUnread: hasUnreadBefore };
	}

	const slot = findVoicemailSlotForSession({
		profile: input.profile,
		intent: input.intent,
		agentId: input.agentId,
		cardId: input.cardId,
	});
	if (!slot) {
		return { changed: false, hasUnread: hasUnreadBefore };
	}
	if (slot.status === "listened") {
		return {
			changed: false,
			slotId: slot.id,
			hasUnread: hasUnreadBefore,
		};
	}

	slot.status = "listened";
	slot.listenedAt = input.nowIso;
	const hasUnread = deriveVoicemailHasUnread(input.profile.telephony);
	const notify = input.onVoicemailUnreadChanged;
	if (notify && hasUnread !== hasUnreadBefore) {
		try {
			notify(hasUnread);
		} catch {
			/* 壳通知失败不回滚槽位 */
		}
	}
	return { changed: true, slotId: slot.id, hasUnread };
}

/** Host endCall 薄入口：从 Session 取定位字段再写槽 */
export function markVoicemailListenedAfterEndCall(input: {
	session: CallSession;
	profile: PlayerProfile;
	outcome: Outcome;
	nowIso: string;
	onVoicemailUnreadChanged?: OnVoicemailUnreadChanged | null;
}): MarkVoicemailListenedResult {
	return markVoicemailListened({
		profile: input.profile,
		intent: input.session.resolve.intent,
		agentId: input.session.resolve.agentId,
		cardId: input.session.resolve.cardId,
		cardKind: input.session.frozenCard.cardKind,
		outcome: input.outcome,
		nowIso: input.nowIso,
		onVoicemailUnreadChanged: input.onVoicemailUnreadChanged,
	});
}
