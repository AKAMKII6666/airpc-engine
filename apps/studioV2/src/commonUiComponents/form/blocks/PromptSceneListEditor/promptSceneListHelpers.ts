/**
	* 场景卡列表纯函数：空卡、规范化、拖拽后 priority 重写。
	* 与 React 组件分离，便于单测且不抬高 UI 文件行数。
	*/
import type { PromptSceneLayerForm } from "@studio-v2/typeFiles/library/characters/form/characterFormShapes";

export function emptyPromptScene(index: number): PromptSceneLayerForm {
	return {
		layerId: `scene_${index + 1}`,
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

export function asPromptSceneList(raw: unknown): PromptSceneLayerForm[] {
	if (!Array.isArray(raw)) return [];
	return raw.map((item, index) => {
		const base = emptyPromptScene(index);
		if (typeof item !== "object" || item === null) return base;
		const row = item as Partial<PromptSceneLayerForm>;
		return {
			...base,
			...row,
			layerId:
				typeof row.layerId === "string" && row.layerId.trim() !== ""
					? row.layerId
					: base.layerId,
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
	});
}

/** 拖拽后按数组序重写 priority，保持与引擎约定一致 */
export function rewriteScenePriorities(
	list: PromptSceneLayerForm[],
): PromptSceneLayerForm[] {
	return list.map((scene, index) => ({
		...scene,
		priority: index * 10,
	}));
}
