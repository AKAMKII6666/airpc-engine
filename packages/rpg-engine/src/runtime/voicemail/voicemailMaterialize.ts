/**
 * 模块名称：VoicemailMaterializePipeline
 * 模块说明：
 * - Effect plan 终态后由 Host 显式调用；禁止塞进 effectExecutor
 * - 出栈 → 外置 generateVoicemail → 写 telephony.voicemails[] → 未读通知
 * - 单条失败标 generate_failed，不回滚其它已成功 Effect / 槽
 * 需求：语音留言改造 §3.4；执行索引 V2-VM-6 / V2-VM-7
 */
import type { CallCardDefinition } from "../../schema/callCard.js";
import { isVoicemailCard } from "../../schema/callCard.js";
import type { PlayerProfile, VoicemailSlot } from "../../schema/profile.js";
import { deriveVoicemailHasUnread } from "../../schema/profile.js";
import type { ScheduledCardLookup } from "../../schedule/scheduleCardReferenceResolver.js";
import {
	takeVoicemailGenStack,
	type VoicemailGenStackEntry,
} from "./voicemailGenStack.js";
import type {
	GenerateVoicemailPort,
	OnVoicemailUnreadChanged,
} from "./voicemailPorts.js";

export type VoicemailMaterializeItemStatus =
	| "materialized"
	| "generate_failed"
	| "skipped_no_card"
	| "skipped_not_voicemail";

export type VoicemailMaterializeItemResult = {
	entryId: string;
	cardId: string;
	status: VoicemailMaterializeItemStatus;
	slotId?: string;
	error?: string;
};

export type VoicemailMaterializeResult = {
	results: VoicemailMaterializeItemResult[];
	hasUnread: boolean;
};

export type VoicemailMaterializeDeps = {
	profile: PlayerProfile;
	nowIso: string;
	lookupCard?: ScheduledCardLookup | null;
	generateVoicemail?: GenerateVoicemailPort | null;
	onVoicemailUnreadChanged?: OnVoicemailUnreadChanged | null;
};

type TelephonyBox = {
	voicemails?: VoicemailSlot[];
	voicemailGenStack?: unknown;
	redialSlot?: unknown;
};

function ensureVoicemailSlots(profile: PlayerProfile): VoicemailSlot[] {
	if (!profile.telephony) {
		profile.telephony = {};
	}
	const tel = profile.telephony as TelephonyBox;
	if (!Array.isArray(tel.voicemails)) {
		tel.voicemails = [];
	}
	return tel.voicemails;
}

/**
 * 拼装外置 LLM 提示：只用卡 context 合同，禁止扫 transcript。
 */
export function assembleVoicemailPrompt(card: CallCardDefinition): string {
	const ctx = card.context ?? {};
	const parts: string[] = [];
	if (ctx.objective) parts.push(`objective: ${ctx.objective}`);
	if (ctx.speakableBrief) parts.push(`speakable: ${ctx.speakableBrief}`);
	if (ctx.privateBrief) parts.push(`private: ${ctx.privateBrief}`);
	if (ctx.emotion) parts.push(`emotion: ${ctx.emotion}`);
	if (ctx.premise) parts.push(`premise: ${ctx.premise}`);
	if (ctx.background) parts.push(`background: ${ctx.background}`);
	if (Array.isArray(ctx.forbidden) && ctx.forbidden.length > 0) {
		parts.push(`forbidden: ${ctx.forbidden.join("; ")}`);
	}
	return parts.join("\n");
}

function baseSlotFields(
	entry: VoicemailGenStackEntry,
	nowIso: string,
	instanceId?: string,
): Pick<
	VoicemailSlot,
	| "id"
	| "agentId"
	| "cardId"
	| "packageId"
	| "instanceId"
	| "topicHint"
	| "createdAt"
> {
	return {
		id: entry.id,
		agentId: entry.agentId,
		cardId: entry.cardId,
		packageId: entry.packageId,
		instanceId: instanceId ?? entry.instanceId,
		topicHint: entry.topicHint,
		createdAt: nowIso,
	};
}

function pushFailedSlot(
	profile: PlayerProfile,
	entry: VoicemailGenStackEntry,
	nowIso: string,
	instanceId?: string,
): void {
	ensureVoicemailSlots(profile).push({
		...baseSlotFields(entry, nowIso, instanceId),
		status: "generate_failed",
	});
}

function itemResult(
	entry: VoicemailGenStackEntry,
	status: VoicemailMaterializeItemStatus,
	error?: string,
): VoicemailMaterializeItemResult {
	return {
		entryId: entry.id,
		cardId: entry.cardId,
		status,
		slotId: entry.id,
		error,
	};
}

function resolveVoicemailCard(
	entry: VoicemailGenStackEntry,
	deps: VoicemailMaterializeDeps,
):
	| { ok: true; card: CallCardDefinition & { cardKind: "voicemail" } }
	| { ok: false; result: VoicemailMaterializeItemResult } {
	const card = deps.lookupCard?.(entry.packageId, entry.cardId) as
		| CallCardDefinition
		| undefined;
	if (!card) {
		pushFailedSlot(deps.profile, entry, deps.nowIso);
		return {
			ok: false,
			result: itemResult(
				entry,
				"skipped_no_card",
				"lookupCard missing or card not found",
			),
		};
	}
	if (!isVoicemailCard(card)) {
		pushFailedSlot(deps.profile, entry, deps.nowIso);
		return {
			ok: false,
			result: itemResult(
				entry,
				"skipped_not_voicemail",
				`cardKind=${card.cardKind} (expected voicemail)`,
			),
		};
	}
	return { ok: true, card };
}

/** 已有成品片：跳过 LLM，直接引用 clip */
function materializeFromClip(
	entry: VoicemailGenStackEntry,
	card: CallCardDefinition,
	deps: VoicemailMaterializeDeps,
	instanceId: string,
	clipId: string,
): VoicemailMaterializeItemResult {
	ensureVoicemailSlots(deps.profile).push({
		...baseSlotFields(entry, deps.nowIso, instanceId),
		audioRef: clipId,
		text: card.context?.speakableBrief,
		status: "unread",
	});
	return itemResult(entry, "materialized");
}

async function materializeViaPort(
	entry: VoicemailGenStackEntry,
	card: CallCardDefinition,
	deps: VoicemailMaterializeDeps,
	instanceId: string,
): Promise<VoicemailMaterializeItemResult> {
	const generate = deps.generateVoicemail;
	if (!generate) {
		pushFailedSlot(deps.profile, entry, deps.nowIso, instanceId);
		return itemResult(
			entry,
			"generate_failed",
			"generateVoicemail port not injected",
		);
	}
	try {
		const generated = await generate({
			card,
			agentId: entry.agentId,
			packageId: entry.packageId,
			instanceId,
			assembledPrompt: assembleVoicemailPrompt(card),
		});
		const text =
			typeof generated.text === "string" && generated.text.trim()
				? generated.text
				: undefined;
		const audioRef =
			typeof generated.audioRef === "string" && generated.audioRef.trim()
				? generated.audioRef
				: undefined;
		if (!text && !audioRef) {
			pushFailedSlot(deps.profile, entry, deps.nowIso, instanceId);
			return itemResult(
				entry,
				"generate_failed",
				"generateVoicemail returned empty text/audioRef",
			);
		}
		ensureVoicemailSlots(deps.profile).push({
			...baseSlotFields(entry, deps.nowIso, instanceId),
			text,
			audioRef,
			status: "unread",
		});
		return itemResult(entry, "materialized");
	} catch (err) {
		pushFailedSlot(deps.profile, entry, deps.nowIso, instanceId);
		return itemResult(
			entry,
			"generate_failed",
			err instanceof Error ? err.message : String(err),
		);
	}
}

async function materializeOne(
	entry: VoicemailGenStackEntry,
	deps: VoicemailMaterializeDeps,
): Promise<VoicemailMaterializeItemResult> {
	const resolved = resolveVoicemailCard(entry, deps);
	if (!resolved.ok) return resolved.result;
	const instanceId = entry.instanceId ?? entry.id;
	const clipId = resolved.card.context?.playbackClipId?.trim();
	if (clipId) {
		return materializeFromClip(
			entry,
			resolved.card,
			deps,
			instanceId,
			clipId,
		);
	}
	return materializeViaPort(entry, resolved.card, deps, instanceId);
}

/**
 * plan 终态后出栈物化。空栈快速返回；失败继续下一条。
 */
export async function runVoicemailMaterializePipeline(
	deps: VoicemailMaterializeDeps,
): Promise<VoicemailMaterializeResult> {
	const entries = takeVoicemailGenStack(deps.profile);
	const results: VoicemailMaterializeItemResult[] = [];
	for (const entry of entries) {
		results.push(await materializeOne(entry, deps));
	}
	const hasUnread = deriveVoicemailHasUnread(deps.profile.telephony);
	const notify = deps.onVoicemailUnreadChanged;
	if (notify && entries.length > 0) {
		try {
			notify(hasUnread);
		} catch {
			// 壳通知失败不回滚槽；真源在 Profile
		}
	}
	return { results, hasUnread };
}
