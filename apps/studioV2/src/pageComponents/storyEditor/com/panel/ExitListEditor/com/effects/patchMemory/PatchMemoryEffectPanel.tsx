/**
	* patch_memory 参数面板（A 目标选择型）。
	*/
"use client";

import type { FC } from "react";
import type {
	EditorEffectParams,
	PatchMemoryParams,
} from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
import { readEffectParams } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/effects/effectParams";
import type { EffectPanelSlotProps } from "../shared/effectPanelSlot";
// 引用了PatchMemoryFields组件，用于参数字段区
import { PatchMemoryFields } from "./PatchMemoryFields";

export const PatchMemoryEffectPanel: FC<EffectPanelSlotProps> =
	function PatchMemoryEffectPanel({
		// params 是当前行参数投影，用于回显与合并
		params,
		// sources 是 id 下拉候选源，用于角色选择
		sources,
		// onParamsChange 是参数写回，用于同步出口 effects 行
		onParamsChange,
	}) {
		const value = readEffectParams("patch_memory", params);
		function patch(next: Partial<PatchMemoryParams>): void {
			const merged: EditorEffectParams = { ...value, ...next };
			onParamsChange(merged);
		}
		return (
			// 引用了PatchMemoryFields组件，用于参数字段
			<PatchMemoryFields value={value} sources={sources} onPatch={patch} />
		);
	};
