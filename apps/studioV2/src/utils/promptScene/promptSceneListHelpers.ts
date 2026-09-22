/**
	* 场景卡列表纯函数：空卡、规范化、拖拽后 priority 重写。
	* 供 bis 与 PromptSceneListEditor 共用；禁放 commonUiComponents（STRUCT-024）。
	*/
import type { PromptSceneLayerForm } from "@studio-v2/typeFiles/library/characters/form/characterFormShapes";
import { createStudioId } from "@studio-v2/typeFiles/ids/createStudioId";

export function emptyPromptScene(index: number): PromptSceneLayerForm {
	return {
		layerId: createStudioId("scene"),
		priority: index * 10,
		match: {
			callDirection: "either",
			localHourRange: { from: 0, to: 24 },
		},
		patch: {
			openingSpeakable: "",
			openingPrivate: "",
			emotion: "",
			toneHint: "",
			appendSpeakable: "",
			appendPrivate: "",
		},
	};
}

function resolveLayerId(
	row: Partial<PromptSceneLayerForm>,
	fallback: string,
): string {
	if (typeof row.layerId === "string" && row.layerId.trim() !== "") {
		return row.layerId;
	}
	return fallback;
}

function normalizePromptSceneRow(
	item: unknown,
	index: number,
): PromptSceneLayerForm {
	const base = emptyPromptScene(index);
	if (typeof item !== "object" || item === null) return base;
	const row = item as Partial<PromptSceneLayerForm>;
	return {
		...base,
		...row,
		layerId: resolveLayerId(row, base.layerId),
		priority: typeof row.priority === "number" ? row.priority : base.priority,
		match: {
			callDirection: row.match?.callDirection ?? "either",
			localHourRange: {
				from: row.match?.localHourRange?.from ?? 0,
				to: row.match?.localHourRange?.to ?? 24,
			},
		},
		patch: {
			...base.patch,
			...(row.patch ?? {}),
		},
	};
}

export function asPromptSceneList(raw: unknown): PromptSceneLayerForm[] {
	if (!Array.isArray(raw)) return [];
	return raw.map(normalizePromptSceneRow);
}

/** 拖拽后按数组序重写 priority，保持与引擎约定一致 */
export function rewriteScenePriorities(
	list: PromptSceneLayerForm[],
): PromptSceneLayerForm[] {
	return list.map(function (scene, index) {
		return {
			...scene,
			priority: index * 10,
		};
	});
}
