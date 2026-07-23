/**
	* 调试器信箱：Profile.telephony.voicemails 投影（仅 Server；不引 Client typeFiles）。
	*/
import {
	deriveVoicemailHasUnread,
	type PlayerProfile,
	type VoicemailSlot,
} from "@airpc/rpg-engine";

/** Server 侧信箱槽 DTO（与 FE mailboxView 字段对齐，禁止交叉 import） */
export type ServerMailboxSlotDto = {
	id: string;
	agentId: string;
	cardId: string;
	packageId: string;
	status: string;
	textPreview: string;
	audioRef: string;
	createdAt: string;
	listenedAt: string;
};

/** Server 侧信箱快照 DTO */
export type ServerMailboxSnapshotDto = {
	userId: string;
	hasUnread: boolean;
	slots: ServerMailboxSlotDto[];
};

function previewText(text: string | undefined, max = 80): string {
	if (!text) return "";
	const t = text.trim();
	if (t.length <= max) return t;
	return `${t.slice(0, max)}…`;
}

function toSlotView(slot: VoicemailSlot): ServerMailboxSlotDto {
	return {
		id: slot.id,
		agentId: slot.agentId,
		cardId: typeof slot.cardId === "string" ? slot.cardId : "",
		packageId: typeof slot.packageId === "string" ? slot.packageId : "",
		status: slot.status,
		textPreview: previewText(slot.text),
		audioRef: typeof slot.audioRef === "string" ? slot.audioRef : "",
		createdAt: typeof slot.createdAt === "string" ? slot.createdAt : "",
		listenedAt: typeof slot.listenedAt === "string" ? slot.listenedAt : "",
	};
}

/** 从 Profile 投影信箱快照 */
export function projectMailboxSnapshot(
	userId: string,
	profile: PlayerProfile,
): ServerMailboxSnapshotDto {
	const list = Array.isArray(profile.telephony?.voicemails)
		? profile.telephony.voicemails
		: [];
	return {
		userId,
		hasUnread: deriveVoicemailHasUnread(profile.telephony),
		slots: list.map(toSlotView),
	};
}
