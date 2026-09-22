/**
 * 模块名称：validatePackage 单卡规则循环
 * 模块说明：从 validatePackage 拆出以降主函数复杂度；读盘经 ContentPort。
 */
import type { ContentPort } from "../../../ports/persist/contentPort.js";
import type { CallCardDefinition } from "../../../schema/call/callCard.js";
import type { CharacterDef } from "../../../schema/identity/character.js";
import {
	promptSceneValidationRuleId,
	validatePromptScenePatches,
} from "../../../schema/prompt/promptScene.js";
import { KNOWN_EFFECT_NAMES } from "../../../schema/call/outcome.js";
import type { ValidationIssue } from "../../types.js";
import { validateAssetRef } from "./assets.js";
import {
	validateScheduleOnceEffect,
	validateScheduleRecurringEffect,
} from "../rules/schedule.js";
import { validateToolPolicy } from "../rules/toolPolicy.js";
import {
	validateDeprecatedCreateVoicemailInRaw,
	validatePlaybackClipRequired,
	validateVoicemailCardModes,
} from "../rules/voicemail.js";
import type { ToolRegistry } from "../../../tools/types.js";

const KNOWN_EFFECTS = new Set<string>(KNOWN_EFFECT_NAMES);

function push(list: ValidationIssue[], issue: ValidationIssue): void {
	list.push(issue);
}

export type BundleCardEntry = {
	cardId: string;
	card: CallCardDefinition | null;
	cardRaw?: unknown | null;
};

async function validateOnePackageCard(input: {
	cardRef: { cardId: string };
	entry: BundleCardEntry | undefined;
	content: ContentPort;
	workspaceKey: string;
	characters: Map<string, CharacterDef>;
	errors: ValidationIssue[];
	warnings: ValidationIssue[];
	toolRegistry: ToolRegistry;
	effectIds: Set<string>;
}): Promise<CallCardDefinition | null> {
	const cardPath = `cards/${input.cardRef.cardId}.s-card.json`;
	const cardRaw = input.entry?.cardRaw;
	if (cardRaw === null || cardRaw === undefined) return null;
	validateCardRawPreSchema(cardRaw, cardPath, input.errors);
	validateDeprecatedCreateVoicemailInRaw(cardRaw, cardPath, input.errors);
	const card = input.entry?.card ?? null;
	if (!card) {
		push(input.errors, {
			ruleId: "SCHEMA_UNSUPPORTED",
			level: "error",
			path: cardPath,
			message: `card ${input.cardRef.cardId} schema invalid`,
		});
		return null;
	}
	validateStoryExitKinds(card, cardPath, input.warnings);
	validateVoicemailCardModes(card, cardPath, input.errors);
	validatePlaybackClipRequired(card, cardPath, input.errors);
	const isPlayback =
		card.interactionMode === "playback_only" || card.entryMode === "playback";
	validateToolPolicy(
		card,
		cardPath,
		input.errors,
		input.warnings,
		isPlayback,
		input.characters,
		input.toolRegistry,
	);
	const playbackClipId = (
		card.context as { playbackClipId?: string } | undefined
	)?.playbackClipId;
	if (playbackClipId) {
		await validateAssetRef(
			input.content,
			input.workspaceKey,
			playbackClipId,
			`${cardPath}#context.playbackClipId`,
			input.errors,
			input.warnings,
			{ checkKindForPlayback: true },
		);
	}
	await validateCardExitEffects({
		card,
		cardPath,
		content: input.content,
		workspaceKey: input.workspaceKey,
		effectIds: input.effectIds,
		errors: input.errors,
		warnings: input.warnings,
	});
	return card;
}

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
	toolRegistry: ToolRegistry;
}): Promise<CallCardDefinition[]> {
	const effectIds = new Set<string>();
	const parsedCards: CallCardDefinition[] = [];
	for (const cardRef of input.cardRefs) {
		const card = await validateOnePackageCard({
			cardRef,
			entry: input.cardsById.get(cardRef.cardId),
			content: input.content,
			workspaceKey: input.workspaceKey,
			characters: input.characters,
			errors: input.errors,
			warnings: input.warnings,
			toolRegistry: input.toolRegistry,
			effectIds,
		});
		if (card) parsedCards.push(card);
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
