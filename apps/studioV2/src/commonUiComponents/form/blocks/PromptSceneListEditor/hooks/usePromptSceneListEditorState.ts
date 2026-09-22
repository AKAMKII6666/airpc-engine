/**
	* 场景列表编辑器瞬时态：折叠、拖拽源下标与写回句柄。
	*/
"use client";

import { useState, type DragEvent } from "react";
import type { PromptSceneLayerForm } from "@studio-v2/typeFiles/library/characters/form/characterFormShapes";
import { emptyPromptScene } from "@studio-v2/src/utils/promptScene/promptSceneListHelpers";
import {
	applyPromptSceneDrop,
	createWritePromptSceneList,
	type WritePromptSceneList,
} from "../com/promptSceneListActions";

export function usePromptSceneListEditorState(opts: {
	name: string;
	list: PromptSceneLayerForm[];
	setFieldValue: (field: string, value: unknown) => unknown;
	setFieldTouched: (field: string, touched: boolean) => unknown;
	onChangeOverride?: (...args: unknown[]) => void;
}): {
	expanded: Record<string, boolean>;
	writeList: WritePromptSceneList;
	onToggleExpand: (layerId: string, open: boolean) => void;
	onDeleteAt: (index: number) => void;
	onPatchAt: (
		index: number,
		patcher: (scene: PromptSceneLayerForm) => PromptSceneLayerForm,
	) => void;
	onDragStartAt: (index: number, e: DragEvent<HTMLLIElement>) => void;
	onDropAt: (index: number, e: DragEvent<HTMLLIElement>) => void;
	onAdd: () => void;
} {
	const { name, list, setFieldValue, setFieldTouched, onChangeOverride } =
		opts;
	const [expanded, setExpanded] = useState<Record<string, boolean>>({});
	const [dragFrom, setDragFrom] = useState<number | null>(null);
	const writeList = createWritePromptSceneList({
		name,
		setFieldValue,
		setFieldTouched,
		onChangeOverride,
	});

	return {
		expanded,
		writeList,
		onToggleExpand(layerId, open) {
			setExpanded((prev) => ({ ...prev, [layerId]: !open }));
		},
		onDeleteAt(index) {
			writeList(list.filter((_, i) => i !== index));
		},
		onPatchAt(index, patcher) {
			writeList(
				list.map((scene, i) => (i === index ? patcher(scene) : scene)),
			);
		},
		onDragStartAt(index, e) {
			setDragFrom(index);
			e.dataTransfer.effectAllowed = "move";
		},
		onDropAt(index, e) {
			e.preventDefault();
			applyPromptSceneDrop({
				list,
				dragFrom,
				toIndex: index,
				writeList,
				clearDrag: () => setDragFrom(null),
			});
		},
		onAdd() {
			writeList([...list, emptyPromptScene(list.length)]);
		},
	};
}
