/**
 * 模块名称：语音留言生成栈（VoicemailGenStack）
 * 模块说明：
 * - attach / schedule(到点) 入栈；永不进 Board.pending
 * - 物化管线（VM-6）出栈写 telephony.voicemails[]；本模块只负责栈
 * 需求：语音留言改造 §3.3–§3.4；执行索引 V2-VM-4 / V2-VM-5
 */
import type { PlayerProfile } from "../../schema/profile.js";

/** once intent 上的投递标记：tick 无 lookup 时仍可识别留言延迟 */
export const VOICEMAIL_MAILBOX_DELIVERY = "voicemail_mailbox" as const;

export type VoicemailGenStackSource = "attach" | "schedule";

/**
 * 待物化条目：仅合同引用，不含 LLM 正文。
 * instanceId 可选；schedule 到点入栈时可用 intentId 关联。
 */
export type VoicemailGenStackEntry = {
	id: string;
	agentId: string;
	cardId: string;
	packageId: string;
	source: VoicemailGenStackSource;
	createdAt: string;
	instanceId?: string;
	topicHint?: string;
	intentId?: string;
};

type TelephonyWithGenStack = {
	redialSlot?: unknown;
	voicemails?: unknown;
	voicemailGenStack?: VoicemailGenStackEntry[];
};

function ensureTelephony(profile: PlayerProfile): TelephonyWithGenStack {
	if (!profile.telephony) {
		profile.telephony = {};
	}
	return profile.telephony as TelephonyWithGenStack;
}

/** 读栈（只读视图）；无 telephony 时返回空数组 */
export function listVoicemailGenStack(
	profile: PlayerProfile,
): readonly VoicemailGenStackEntry[] {
	const tel = profile.telephony as TelephonyWithGenStack | undefined;
	const stack = tel?.voicemailGenStack;
	return Array.isArray(stack) ? stack : [];
}

/**
 * 入栈：同一 cardId+packageId+agentId 且仍待物化时幂等跳过，
 * 避免 attach 重复挂卡刷爆栈。
 */
export function pushVoicemailGenStack(
	profile: PlayerProfile,
	entry: VoicemailGenStackEntry,
): boolean {
	const tel = ensureTelephony(profile);
	if (!Array.isArray(tel.voicemailGenStack)) {
		tel.voicemailGenStack = [];
	}
	const already = tel.voicemailGenStack.some(function (item) {
		return (
			item.cardId === entry.cardId &&
			item.packageId === entry.packageId &&
			item.agentId === entry.agentId
		);
	});
	if (already) {
		return false;
	}
	tel.voicemailGenStack.push(entry);
	return true;
}

/**
 * 出栈：取出全部待物化条目并清空栈。
 * Materialize 失败不回写栈（该条进 voicemails generate_failed），避免死循环。
 */
export function takeVoicemailGenStack(
	profile: PlayerProfile,
): VoicemailGenStackEntry[] {
	const tel = ensureTelephony(profile);
	const stack = Array.isArray(tel.voicemailGenStack)
		? tel.voicemailGenStack
		: [];
	tel.voicemailGenStack = [];
	return stack.slice();
}

/** 目标卡是否为 voicemail（lookup 缺失或未找到 → false，走普通 Board 路径） */
export function isLookupVoicemailCard(
	lookupCard:
		| ((packageId: string, cardId: string) => { cardKind?: string } | undefined)
		| null
		| undefined,
	packageId: string,
	cardId: string,
): boolean {
	if (!lookupCard || !packageId || !cardId) {
		return false;
	}
	const card = lookupCard(packageId, cardId);
	return card?.cardKind === "voicemail";
}
