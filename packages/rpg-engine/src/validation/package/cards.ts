/**
 * 模块名称：validatePackage 单卡规则循环
 * 模块说明：从 validatePackage 拆出以降主函数复杂度；读盘经 ContentPort。
 */
import type { ContentPort } from "../../ports/contentPort.js";
import type { CallCardDefinition } from "../../schema/callCard.js";
import type { CharacterDef } from "../../schema/character.js";
import {
	promptSceneValidationRuleId,
	validatePromptScenePatches,
} from "../../schema/promptScene.js";
import { KNOWN_EFFECT_NAMES } from "../../schema/outcome.js";
import type { ValidationIssue } from "../types.js";
import { validateAssetRef } from "./assets.js";
import {
	validateScheduleOnceEffect,
	validateScheduleRecurringEffect,
} from "./schedule.js";
import { validateToolPolicy } from "./toolPolicy.js";
import {
	validateDeprecatedCreateVoicemailInRaw,
	validatePlaybackClipRequired,
	validateVoicemailCardModes,
} from "./voicemail.js";

const KNOWN_EFFECTS = new Set<string>(KNOWN_EFFECT_NAMES);

function push(list: ValidationIssue[], issue: ValidationIssue): void {
	list.push(issue);
}

export type BundleCardEntry = {
	cardId: string;
	card: CallCardDefinition | null;
	cardRaw?: unknown | null;
};

/**
 * 对 conf.cards 逐张跑 schema 前检查 / exits / assets / schedule effects。
 * 返回解析成功的卡列表供引用角色校验。
 */
export async function validatePackageCards(input: {
	cardRefs: Array<{ cardId: string }>;
	cardsById: Map<string, BundleCardEntry>;
	content: ContentPort;
	workspaceKey: string;
	characters: Map<string, CharacterDef>;
	errors: ValidationIssue[];
	warnings: ValidationIssue[];
}): Promise<CallCardDefinition[]> {
	const {
		cardRefs,
		cardsById,
		content,
		workspaceKey,
		characters,
		errors,
		warnings,
	} = input;
	const effectIds = new Set<string>();
	const parsedCards: CallCardDefinition[] = [];

	for (const cardRef of cardRefs) {
		const entry = cardsById.get(cardRef.cardId);
		const cardPath = `cards/${cardRef.cardId}.s-card.json`;
		const cardRaw = entry?.cardRaw;
		if (cardRaw === null || cardRaw === undefined) {
			continue;
		}

		validateCardRawPreSchema(cardRaw, cardPath, errors);
		// schema 已拒识 create_voicemail；先扫 raw 给出明确废弃码
		validateDeprecatedCreateVoicemailInRaw(cardRaw, cardPath, errors);

		const card = entry?.card ?? null;
		if (!card) {
			push(errors, {
				ruleId: "SCHEMA_UNSUPPORTED",
				level: "error",
				path: cardPath,
				message: `card ${cardRef.cardId} schema invalid`,
			});
			continue;
		}
		parsedCards.push(card);

		validateStoryExitKinds(card, cardPath, warnings);
		validateVoicemailCardModes(card, cardPath, errors);
		validatePlaybackClipRequired(card, cardPath, errors);

		const isPlayback =
			card.interactionMode === "playback_only" ||
			card.entryMode === "playback";
		validateToolPolicy(
			card,
			cardPath,
			errors,
			warnings,
			isPlayback,
			characters,
		);

		const playbackClipId = (
			card.context as { playbackClipId?: string } | undefined
		)?.playbackClipId;
		if (playbackClipId) {
			await validateAssetRef(
				content,
				workspaceKey,
				playbackClipId,
				`${cardPath}#context.playbackClipId`,
				errors,
				warnings,
				{ checkKindForPlayback: true },
			);
		}

		await validateCardExitEffects({
			card,
			cardPath,
			content,
			workspaceKey,
			effectIds,
			errors,
			warnings,
		});
	}

	return parsedCards;
}

function validateCardRawPreSchema(
	cardRaw: unknown,
	cardPath: string,
	errors: ValidationIssue[],
): void {
	if (typeof cardRaw !== "object" || cardRaw === null) return;
	const rawCtx = (cardRaw as { context?: { promptScenes?: unknown } }).context;
	const patchErr = validatePromptScenePatches(rawCtx?.promptScenes);
	if (patchErr) {
		push(errors, {
			ruleId: promptSceneValidationRuleId(patchErr),
			level: "error",
			path: `${cardPath}#context.promptScenes`,
			message: patchErr.message,
		});
	}
	const rawPolicy = (cardRaw as { toolPolicy?: Record<string, unknown> })
		.toolPolicy;
	if (
		rawPolicy &&
		(rawPolicy.applyEffectsDuringCall === true ||
			rawPolicy.directEffects != null)
	) {
		push(errors, {
			ruleId: "TOOL_DIRECT_EFFECT",
			level: "error",
			path: `${cardPath}#toolPolicy`,
			message:
				"in-call direct effects are forbidden; use RuntimeExitCandidate",
		});
	}
}

/**
	* story 卡出口建议：仅在完全无出口时 warning。
	* 有任意一条出口即放过（不再要求 failure/recovery 类别）；voicemail 等非 story 不检。
	*/
function validateStoryExitKinds(
	card: CallCardDefinition,
	cardPath: string,
	warnings: ValidationIssue[],
): void {
	if (card.cardKind !== "story") return;
	if (card.exits.length === 0) {
		push(warnings, {
			ruleId: "EXIT_EMPTY_STORY",
			level: "warning",
			path: `${cardPath}#exits`,
			message: "本卡尚未配置任何出口（可挂下一张卡、结束剧情等）",
		});
	}
}

async function validateCardExitEffects(input: {
	card: CallCardDefinition;
	cardPath: string;
	content: ContentPort;
	workspaceKey: string;
	effectIds: Set<string>;
	errors: ValidationIssue[];
	warnings: ValidationIssue[];
}): Promise<void> {
	const { card, cardPath, content, workspaceKey, effectIds, errors, warnings } =
		input;
	for (const exit of card.exits) {
		for (const effect of exit.effects) {
			const issuePath = `${cardPath}#exits.${exit.exitId}.effects.${effect.id}`;
			if (!KNOWN_EFFECTS.has(effect.effect)) {
				push(errors, {
					ruleId: "EFFECT_UNKNOWN",
					level: "error",
					path: issuePath,
					message: `unknown effect: ${effect.effect}`,
				});
			}
			if (effectIds.has(effect.id)) {
				push(errors, {
					ruleId: "EFFECT_ID_DUP",
					level: "error",
					path: issuePath,
					message: `duplicate effect id: ${effect.id}`,
				});
			}
			effectIds.add(effect.id);
			await validateExitEffectByKind({
				effect,
				card,
				issuePath,
				content,
				workspaceKey,
				errors,
				warnings,
			});
		}
	}
}

async function validateExitEffectByKind(input: {
	effect: { id: string; effect: string; [key: string]: unknown };
	card: CallCardDefinition;
	issuePath: string;
	content: ContentPort;
	workspaceKey: string;
	errors: ValidationIssue[];
	warnings: ValidationIssue[];
}): Promise<void> {
	const { effect, card, issuePath, content, workspaceKey, errors, warnings } =
		input;
	if (effect.effect === "play_system_prompt") {
		const clipId = effect.clipId;
		if (typeof clipId === "string" && clipId) {
			await validateAssetRef(
				content,
				workspaceKey,
				clipId,
				`${issuePath}.clipId`,
				errors,
				warnings,
				{ checkKindForPlayback: true },
			);
		}
		return;
	}
	if (effect.effect === "schedule_call_card") {
		validateScheduleOnceEffect(effect, issuePath, errors);
		return;
	}
	if (effect.effect === "schedule_recurring_call") {
		await validateScheduleRecurringEffect(
			effect,
			card,
			issuePath,
			content,
			workspaceKey,
			errors,
		);
	}
}
