/**
 * 模块名称：validatePackage 语音留言（voicemail）规则
 * 模块说明：强制 cardKind=voicemail 的 mode 组合；废弃 create_voicemail Effect。
 * 需求：语音留言改造 §3.1–§3.3；执行索引 V2-VM-3。
 */
import type { CallCardDefinition } from "../../schema/callCard.js";
import type { ValidationIssue } from "../types.js";

function push(list: ValidationIssue[], issue: ValidationIssue): void {
	list.push(issue);
}

/** toolPolicy 等价 deny_all：缺省或显式 deny_all（禁止 allowlist / inherit_free） */
function isDenyAllEquivalent(
	policy: CallCardDefinition["toolPolicy"],
): boolean {
	if (!policy) return true;
	return policy.mode === "deny_all";
}

/**
 * voicemail 强制 playback_only + mailbox_open + deny_all；
 * 非 voicemail 不得使用 mailbox_open（仅配对）。
 */
export function validateVoicemailCardModes(
	card: CallCardDefinition,
	cardPath: string,
	errors: ValidationIssue[],
): void {
	if (card.cardKind === "voicemail") {
		validateVoicemailForcedCombo(card, cardPath, errors);
		return;
	}
	if (card.entryMode === "mailbox_open") {
		push(errors, {
			ruleId: "VOICEMAIL_ENTRY_KIND",
			level: "error",
			path: `${cardPath}#entryMode`,
			message:
				"entryMode=mailbox_open 仅允许 cardKind=voicemail；请改卡种或入口",
		});
	}
}

function validateVoicemailForcedCombo(
	card: CallCardDefinition,
	cardPath: string,
	errors: ValidationIssue[],
): void {
	if (card.interactionMode !== "playback_only") {
		push(errors, {
			ruleId: "VOICEMAIL_INTERACTION_MODE",
			level: "error",
			path: `${cardPath}#interactionMode`,
			message:
				"cardKind=voicemail 必须 interactionMode=playback_only（Studio 锁定）",
		});
	}
	if (card.entryMode !== "mailbox_open") {
		push(errors, {
			ruleId: "VOICEMAIL_ENTRY_MODE",
			level: "error",
			path: `${cardPath}#entryMode`,
			message:
				"cardKind=voicemail 必须 entryMode=mailbox_open（信箱打开）",
		});
	}
	if (!isDenyAllEquivalent(card.toolPolicy)) {
		push(errors, {
			ruleId: "VOICEMAIL_TOOL_POLICY",
			level: "error",
			path: `${cardPath}#toolPolicy`,
			message:
				"cardKind=voicemail 必须 toolPolicy 等价 deny_all（与 playback_only 一致）",
		});
	}
}

/**
 * 废弃 create_voicemail：包内出现即 error，指引改为 attach/schedule 指向 voicemail 卡。
 * 在 schema 拒识（已移出 KNOWN_EFFECT_NAMES）之前对 cardRaw 扫描，
 * 以便给出明确 VOICEMAIL_CREATE_EFFECT，而非仅 SCHEMA_UNSUPPORTED。
 */
export function validateDeprecatedCreateVoicemailInRaw(
	cardRaw: unknown,
	cardPath: string,
	errors: ValidationIssue[],
): void {
	if (typeof cardRaw !== "object" || cardRaw === null) return;
	const exits = (cardRaw as { exits?: unknown }).exits;
	if (!Array.isArray(exits)) return;
	for (const exit of exits) {
		if (typeof exit !== "object" || exit === null) continue;
		const exitId = String((exit as { exitId?: unknown }).exitId ?? "?");
		const effects = (exit as { effects?: unknown }).effects;
		if (!Array.isArray(effects)) continue;
		for (const effect of effects) {
			if (typeof effect !== "object" || effect === null) continue;
			const name = (effect as { effect?: unknown }).effect;
			if (name !== "create_voicemail") continue;
			const effectId = String((effect as { id?: unknown }).id ?? "?");
			push(errors, {
				ruleId: "VOICEMAIL_CREATE_EFFECT",
				level: "error",
				path: `${cardPath}#exits.${exitId}.effects.${effectId}`,
				message:
					"create_voicemail 已废弃：请改用 attach_call_card / schedule_call_card 指向 cardKind=voicemail 卡",
			});
		}
	}
}

/**
 * 普通 playback 卡缺片报错；voicemail 靠物化，允许无 playbackClipId。
 * 从 cards 循环抽出以降复杂度。
 */
export function validatePlaybackClipRequired(
	card: CallCardDefinition,
	cardPath: string,
	errors: ValidationIssue[],
): void {
	if (card.cardKind === "voicemail") return;
	const isPlayback =
		card.interactionMode === "playback_only" ||
		card.entryMode === "playback";
	if (!isPlayback) return;
	const ctx = card.context as { playbackClipId?: string } | undefined;
	if (ctx?.playbackClipId) return;
	push(errors, {
		ruleId: "PLAYBACK_NO_ASSET",
		level: "error",
		path: `${cardPath}#context`,
		message: "playback card missing playbackClipId",
	});
}
