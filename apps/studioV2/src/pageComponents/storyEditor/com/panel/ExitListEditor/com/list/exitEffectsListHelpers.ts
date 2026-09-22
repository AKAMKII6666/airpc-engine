/**
	* 出口 Effect 列表行变更辅助。
	*/
import type { EditorExitEffectProjection } from "@studio-v2/typeFiles/story/editor/callCard/editorCallCardProjection";
import type {
	EditorEffectParams,
	EffectPanelSources,
} from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
import {
	coerceKnownEffectName,
} from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/exitListForm";
import { defaultEffectParams } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/effects/effectParams";
import { summarizeEffect } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/effects/summarizeEffect";

export function changeEffectRow(
	list: EditorExitEffectProjection[],
	index: number,
	rawEffect: string,
	sources: EffectPanelSources,
	patchRow: (
		index: number,
		patch: Partial<EditorExitEffectProjection>,
	) => void,
): void {
	const effect = coerceKnownEffectName(rawEffect);
	if (effect === "end_story" && !sources.hasChapterEnd) {
		window.alert(
			"画布尚无「章节结束」节点，无法添加「结束故事」效果。请先在底栏放置章节结束节点。",
		);
		return;
	}
	const params = defaultEffectParams(effect);
	patchRow(index, {
		effect,
		params,
		summary: summarizeEffect(effect, params, sources),
	});
}

export function changeEffectParams(
	list: EditorExitEffectProjection[],
	index: number,
	next: EditorEffectParams,
	sources: EffectPanelSources,
	patchRow: (
		index: number,
		patch: Partial<EditorExitEffectProjection>,
	) => void,
): void {
	const row = list[index];
	if (!row) return;
	const prevAuto = summarizeEffect(row.effect, row.params, sources);
	const isAutoSummary = !row.summary || row.summary === prevAuto;
	const patch: Partial<EditorExitEffectProjection> = { params: next };
	if (isAutoSummary) {
		patch.summary = summarizeEffect(row.effect, next, sources);
	}
	patchRow(index, patch);
}

export function toggleEffectCritical(
	list: EditorExitEffectProjection[],
	index: number,
	critical: boolean,
	onChange: (next: EditorExitEffectProjection[]) => void,
): void {
	const row = list[index];
	if (!row) return;
	const next: EditorExitEffectProjection = { ...row };
	if (critical) {
		next.critical = true;
	} else {
		delete next.critical;
	}
	onChange(list.map((r, i) => (i === index ? next : r)));
}
