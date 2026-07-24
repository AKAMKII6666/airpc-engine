/**
	* CallCardDefinition ↔ EditorCallCardProjection；供磁盘包打开/保存。
	* exitKind / priority / condition / critical 须 roundtrip；
	* 写回优先投影 condition，禁止一律 DEFAULT 覆盖已有。
	*/
import type { CallCardDefinition } from "@studio-v2/typeFiles/story/callCard/engineCallCard";
import type { Effect, ExitCondition } from "@studio-v2/typeFiles/story/callCard/engineOutcome";
import { asPromptSceneList } from "@studio-v2/src/utils/promptScene/promptSceneListHelpers";
import type {
	EditorCallCardExitProjection,
	EditorCallCardProjection,
	EditorExitEffectProjection,
} from "@studio-v2/typeFiles/story/editor/callCard/editorCallCardProjection";
import type { EditorEffectParams } from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
import type { PromptSceneLayerForm } from "@studio-v2/typeFiles/library/characters/form/characterFormShapes";
import { summarizeEffect } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/effects/summarizeEffect";
import { coerceKnownEffectName } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/exitListForm";
import {
	defaultExitCondition,
	summarizeExitCondition,
} from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/exitConditionForm";

type CallCardExit = CallCardDefinition["exits"][number];

function normalizePromptScenesForEditor(
	raw: unknown,
): PromptSceneLayerForm[] | undefined {
	if (!Array.isArray(raw) || raw.length === 0) {
		return undefined;
	}
	const mapped = asPromptSceneList(raw);
	return mapped.length > 0 ? mapped : undefined;
}

function normalizeObjectivesForEditor(
	objectives: CallCardDefinition["objectives"],
): EditorCallCardProjection["objectives"] {
	if (!objectives) return undefined;
	return { requiredBeats: objectives.requiredBeats ?? [] };
}

function effectDefToProjection(effect: Effect): EditorExitEffectProjection {
	const name = coerceKnownEffectName(String(effect.effect));
	// critical 独立字段；不得并入 params，也不得 strip（V2-S8-6 roundtrip）
	const { id, effect: _ignored, critical, ...rest } = effect;
	const params = { effect: name, ...rest } as EditorEffectParams;
	const row: EditorExitEffectProjection = {
		id: String(id),
		effect: name,
		summary: summarizeEffect(name, params),
		params,
	};
	if (typeof critical === "boolean") {
		row.critical = critical;
	}
	return row;
}

function effectProjectionToDef(row: EditorExitEffectProjection): Effect {
	const params = row.params ?? { effect: row.effect };
	const { effect: _disc, ...rest } = params as Record<string, unknown>;
	const def: Effect = {
		id: row.id,
		effect: row.effect,
		...rest,
	};
	// 仅 true 写盘；false/缺省省略，与引擎 optional 语义一致
	if (row.critical === true) {
		def.critical = true;
	}
	return def;
}

function exitDefToProjection(exit: CallCardExit): EditorCallCardExitProjection {
	const condition: ExitCondition = exit.condition ?? defaultExitCondition();
	return {
		exitId: exit.exitId,
		exitKind: exit.exitKind,
		title: exit.title,
		priority: exit.priority ?? 0,
		condition,
		conditionSummary: summarizeExitCondition(condition),
		effects: (exit.effects ?? []).map(effectDefToProjection),
	};
}

/**
	* 写回 condition：投影优先；缺省保留 base；再无则新建默认。
	* 禁止「一律 DEFAULT」抹掉磁盘已有 condition（含嵌套）。
	* 导出供单测锁定回落顺序（V2-S8-8）。
	*/
export function resolveExitCondition(
	proj: EditorCallCardExitProjection,
	base?: CallCardExit,
): ExitCondition {
	if (proj.condition !== undefined) return proj.condition;
	if (base?.condition !== undefined) return base.condition;
	return defaultExitCondition();
}

function exitProjectionToDef(
	proj: EditorCallCardExitProjection,
	base?: CallCardExit,
): CallCardExit {
	return {
		exitId: proj.exitId,
		exitKind: proj.exitKind,
		title: proj.title,
		priority: proj.priority,
		condition: resolveExitCondition(proj, base),
		effects: proj.effects.map(effectProjectionToDef),
	};
}

/** 磁盘卡 → 画布可编辑投影；ownerDisplayName 由调用方注入 */
export function callCardDefToProjection(
	def: CallCardDefinition,
	ownerDisplayName: string,
): EditorCallCardProjection {
	return {
		cardId: def.cardId,
		cardKind: def.cardKind ?? "story",
		title: def.title ?? def.cardId,
		ownerAgentId: def.ownerAgentId ?? "",
		ownerDisplayName,
		entryMode: def.entryMode,
		interactionMode: def.interactionMode,
		context: {
			objective: def.context?.objective,
			privateBrief: def.context?.privateBrief,
			speakableBrief: def.context?.speakableBrief,
			background: def.context?.background,
			premise: def.context?.premise,
			emotion: def.context?.emotion,
			forbidden: def.context?.forbidden,
			promptScenes: normalizePromptScenesForEditor(def.context?.promptScenes),
			playbackClipId: def.context?.playbackClipId,
		},
		objectives: normalizeObjectivesForEditor(def.objectives),
		toolPolicy: def.toolPolicy,
		exits: (def.exits ?? []).map(exitDefToProjection),
		schedule: def.schedule,
		validationBadge: "ok",
	};
}

/** 画布投影 → 引擎卡定义；base 用于保留未编辑的结构化字段 */
export function callCardProjectionToDef(
	proj: EditorCallCardProjection,
	base?: CallCardDefinition,
): CallCardDefinition {
	const baseExits = new Map(
		(base?.exits ?? []).map(function (ex) {
			return [ex.exitId, ex];
		}),
	);
	return {
		cardId: proj.cardId,
		cardKind: proj.cardKind,
		title: proj.title,
		ownerAgentId: proj.ownerAgentId,
		entryMode: proj.entryMode,
		interactionMode: proj.interactionMode,
		context: proj.context,
		objectives: proj.objectives,
		toolPolicy: proj.toolPolicy,
		schedule: proj.schedule,
		exits: proj.exits.map(function (ex) {
			return exitProjectionToDef(ex, baseExits.get(ex.exitId));
		}),
	};
}
