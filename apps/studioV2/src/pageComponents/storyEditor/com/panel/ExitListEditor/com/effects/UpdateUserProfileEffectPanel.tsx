/**
	* update_user_profile 参数面板（B 表单参数型）。
	* 昵称必填；全名可选；均为纯文本字段。
	*/
"use client";

import type { FC } from "react";
import { TextField } from "@mui/material";
import type {
	EditorEffectParams,
	UpdateUserProfileParams,
} from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
import { readEffectParams } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/effects/effectParams";
import type { EffectPanelSlotProps } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/effectPanelSlot";
import styles from "./effectPanels.module.scss";

export const UpdateUserProfileEffectPanel: FC<EffectPanelSlotProps> =
	function UpdateUserProfileEffectPanel({
		// params 是当前行参数投影，用于回显与合并
		params,
		// onParamsChange 是参数写回，用于同步出口 effects 行
		onParamsChange,
	}) {
		const value = readEffectParams("update_user_profile", params);
		function patch(next: Partial<UpdateUserProfileParams>): void {
			const merged: EditorEffectParams = { ...value, ...next };
			onParamsChange(merged);
		}
		return (
			<div className={styles.panel}>
				{/* 引用了TextField组件，用于用户昵称（必填） */}
				<TextField
					size="small"
					fullWidth
					label="昵称（必填）"
					value={value.nickname ?? ""}
					onChange={(e) => {
						const next = e.target.value;
						patch({ nickname: next === "" ? undefined : next });
					}}
				/>
				{/* 引用了TextField组件，用于用户全名（可选） */}
				<TextField
					size="small"
					fullWidth
					label="全名（可选）"
					value={value.fullName ?? ""}
					onChange={(e) => {
						const next = e.target.value;
						patch({ fullName: next === "" ? undefined : next });
					}}
				/>
			</div>
		);
	};
