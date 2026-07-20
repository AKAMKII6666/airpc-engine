/**
	* 场景列表写回与拖拽排序：纯状态操作，供编辑器入口调用。
	* 抽出后压低 FormPromptSceneListEditor 有效行数。
	*/
import type { PromptSceneLayerForm } from "@studio-v2/typeFiles/library/characters/form/characterFormShapes";
import { rewriteScenePriorities } from "../promptSceneListHelpers";

export type WritePromptSceneList = (next: PromptSceneLayerForm[]) => void;

export function createWritePromptSceneList(opts: {
	name: string;
	setFieldValue: (name: string, value: unknown) => unknown;
	setFieldTouched: (name: string, touched: boolean) => unknown;
	onChangeOverride?: (...args: unknown[]) => void;
}): WritePromptSceneList {
	const { name, setFieldValue, setFieldTouched, onChangeOverride } = opts;
	return (next) => {
		const withPriority = rewriteScenePriorities(next);
		if (onChangeOverride) {
			onChangeOverride(withPriority);
			return;
		}
		void setFieldValue(name, withPriority);
		void setFieldTouched(name, true);
	};
}

export function applyPromptSceneDrop(opts: {
	list: PromptSceneLayerForm[];
	dragFrom: number | null;
	toIndex: number;
	writeList: WritePromptSceneList;
	clearDrag: () => void;
}): void {
	const { list, dragFrom, toIndex, writeList, clearDrag } = opts;
	if (dragFrom === null || dragFrom === toIndex) {
		clearDrag();
		return;
	}
	const next = list.slice();
	const [moved] = next.splice(dragFrom, 1);
	if (!moved) {
		clearDrag();
		return;
	}
	next.splice(toIndex, 0, moved);
	writeList(next);
	clearDrag();
}
