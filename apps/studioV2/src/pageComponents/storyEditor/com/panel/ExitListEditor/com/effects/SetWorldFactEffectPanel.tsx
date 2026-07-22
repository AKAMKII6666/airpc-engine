/**
	* set_world_fact 参数面板（B 表单参数型）。
	* 事实键必填；值本轮存字符串（缺省 true）；可见范围本轮仅 global。
	*/
"use client";

import type { FC } from "react";
import { MenuItem, TextField } from "@mui/material";
import type {
	EditorEffectParams,
	SetWorldFactParams,
} from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
import { readEffectParams } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/effects/effectParams";
import type { EffectPanelSlotProps } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/effectPanelSlot";
import styles from "./effectPanels.module.scss";

export const SetWorldFactEffectPanel: FC<EffectPanelSlotProps> =
	function SetWorldFactEffectPanel({
		// params 是当前行参数投影，用于回显与合并
		params,
		// onParamsChange 是参数写回，用于同步出口 effects 行
		onParamsChange,
	}) {
		const value = readEffectParams("set_world_fact", params);
		function patch(next: Partial<SetWorldFactParams>): void {
			const merged: EditorEffectParams = { ...value, ...next };
			onParamsChange(merged);
		}
		return (
			<div className={styles.panel}>
				{/* 引用了TextField组件，用于事实键 id（必填） */}
				<TextField
					size="small"
					fullWidth
					label="事实键 factId（必填）"
					value={value.factId ?? ""}
					onChange={(e) => {
						const next = e.target.value;
						patch({ factId: next === "" ? undefined : next });
					}}
				/>
				{/* 引用了TextField组件，用于事实值（缺省 true） */}
				<TextField
					size="small"
					fullWidth
					label="值（缺省 true）"
					value={value.value ?? ""}
					onChange={(e) => {
						const next = e.target.value;
						patch({ value: next === "" ? undefined : next });
					}}
				/>
				{/* 引用了TextField组件，用于可见范围下拉 */}
				<TextField
					size="small"
					fullWidth
					select
					label="可见范围"
					value={value.visibility ?? "global"}
					onChange={(e) => {
						patch({ visibility: e.target.value });
					}}
				>
					{/* 引用了MenuItem组件，用于 global 选项 */}
					<MenuItem value="global">全局</MenuItem>
				</TextField>
			</div>
		);
	};
