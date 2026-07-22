/**
	* CallCardDefinition ↔ EditorCallCardProjection；供磁盘包打开/保存。
	* condition 等人话字段在投影侧编辑；写回时尽量保留原 def 结构化 condition。
	*/
import type {
	CallCardDefinition,
	Effect,
} from "@airpc/rpg-engine";
import { asPromptSceneList } from "@studio-v2/src/commonUiComponents/form/blocks/PromptSceneListEditor/promptSceneListHelpers";
import type {
	EditorCallCardExitProjection,
	EditorCallCardProjection,
	EditorExitEffectProjection,
} from "@studio-v2/typeFiles/story/editor/callCard/editorCallCardProjection";
import type { EditorEffectParams } from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
import type { PromptSceneLayerForm } from "@studio-v2/typeFiles/library/characters/form/characterFormShapes";
import { summarizeEffect } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/effects/summarizeEffect";
import { coerceKnownEffectName } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/exitListForm";

type CallCardExit = CallCardDefinition["exits"][number];

const DEFAULT_CONDITION: CallCardExit["condition"] = {
	op: "outcome_flag",
	flag: "answered_completed",
	equals: true,
};

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
	const { id, effect: _ignored, critical: _c, ...rest } = effect;
	const params = { effect: name, ...rest } as EditorEffectParams;
	return {
		id: String(id),
		effect: name,
		summary: summarizeEffect(name, params),
		params,
	};
}

function effectProjectionToDef(row: EditorExitEffectProjection): Effect {
	const params = row.params ?? { effect: row.effect };
	const { effect: _disc, ...rest } = params as Record<string, unknown>;
	return {
		id: row.id,
		effect: row.effect,
		...rest,
	} as Effect;
}

function exitDefToProjection(exit: CallCardExit): EditorCallCardExitProjection {
	const summary =
		typeof exit.title === "string" && exit.title.trim() !== ""
			? exit.title
			: exit.exitId;
	return {
		exitId: exit.exitId,
		exitKind: exit.exitKind,
		title: exit.title,
		priority: exit.priority ?? 0,
		conditionSummary: summary,
		effects: (exit.effects ?? []).map(effectDefToProjection),
	};
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
		condition: base?.condition ?? DEFAULT_CONDITION,
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
