/**
 * 模块名称：CallIntent.mailbox_open 解析
 * 模块说明：
 * - 按信箱槽 voicemailId 绑定 cardKind=voicemail；不从 Board.pending 挑选
 * - 返回卡强制 playback_only + entryMode=mailbox_open（防御脏盘）
 * 需求：02 §2–§3；语音留言改造 §3.5
 */
import { randomUUID } from "node:crypto";
import { engineError, isEngineError, type EngineError } from "../../host/errors.js";
import type { CallIntent, ResolveResult } from "../../host/types.js";
import type { CallCardDefinition } from "../../schema/callCard.js";
import { isVoicemailCard } from "../../schema/callCard.js";
import type { PlayerProfile, VoicemailSlot } from "../../schema/profile.js";
import {
	lookupCharacterSideCard,
	type WorkspaceState,
} from "../../workspace/loadWorkspace.js";

export type MailboxOpenIntent = Extract<CallIntent, { kind: "mailbox_open" }>;

function findSlot(
	profile: PlayerProfile,
	voicemailId: string,
): VoicemailSlot | undefined {
	const list = profile.telephony?.voicemails;
	if (!Array.isArray(list)) return undefined;
	return list.find(function (slot) {
		return slot.id === voicemailId;
	});
}

function resolvePackageAndCard(
	ws: WorkspaceState,
	slot: VoicemailSlot,
	cardId: string,
): { packageId: string; card: CallCardDefinition } | EngineError {
	if (slot.packageId) {
		const card =
			lookupCharacterSideCard(ws, slot.packageId, cardId) ??
			ws.packages.get(slot.packageId)?.cards.get(cardId);
		if (!card) {
			return engineError(
				"NOT_FOUND",
				`voicemail card not loaded: ${slot.packageId}/${cardId}; use resolveAsync`,
			);
		}
		return { packageId: slot.packageId, card };
	}
	for (const [packageId, pkg] of ws.packages) {
		const card =
			lookupCharacterSideCard(ws, packageId, cardId) ??
			pkg.cards.get(cardId);
		if (card) {
			return { packageId, card };
		}
	}
	return engineError(
		"NOT_FOUND",
		`voicemail card not found in workspace: ${cardId}`,
	);
}

/**
 * 拨号/外呼不得把 voicemail 当待接通剧情卡（防御脏 Board）。
 */
export function rejectVoicemailAsDialCard(
	card: CallCardDefinition,
): EngineError | null {
	if (!isVoicemailCard(card)) return null;
	return engineError(
		"VALIDATION_FAILED",
		"cardKind=voicemail cannot be resolved via user_dial/agent_outbound; use mailbox_open",
	);
}

/**
 * 信箱打开：槽位 + cardId 绑定 voicemail Definition。
 */
export function resolveMailboxOpenIntent(input: {
	profile: PlayerProfile;
	workspace: WorkspaceState;
	intent: MailboxOpenIntent;
}): ResolveResult | EngineError {
	const { profile, workspace, intent } = input;
	const slot = findSlot(profile, intent.voicemailId);
	if (!slot) {
		return engineError(
			"NOT_FOUND",
			`voicemail slot not found: ${intent.voicemailId}`,
		);
	}
	if (slot.agentId !== intent.agentId) {
		return engineError(
			"VALIDATION_FAILED",
			`voicemail agentId mismatch: slot=${slot.agentId} intent=${intent.agentId}`,
		);
	}
	if (slot.cardId && slot.cardId !== intent.cardId) {
		return engineError(
			"VALIDATION_FAILED",
			`voicemail cardId mismatch: slot=${slot.cardId} intent=${intent.cardId}`,
		);
	}
	const located = resolvePackageAndCard(workspace, slot, intent.cardId);
	if (isEngineError(located)) return located;
	if (!isVoicemailCard(located.card)) {
		return engineError(
			"VALIDATION_FAILED",
			`mailbox_open requires cardKind=voicemail, got ${located.card.cardKind}`,
		);
	}
	/** 强制 mode：校验/脏盘不得让听留言会话脱离 playback_only + mailbox_open */
	const card: CallCardDefinition = {
		...structuredClone(located.card),
		interactionMode: "playback_only",
		entryMode: "mailbox_open",
	};
	return {
		ok: true,
		source: "mailbox",
		instanceId: slot.instanceId ?? randomUUID(),
		cardId: card.cardId,
		agentId: intent.agentId,
		packageId: located.packageId,
		intent,
		card,
	};
}
