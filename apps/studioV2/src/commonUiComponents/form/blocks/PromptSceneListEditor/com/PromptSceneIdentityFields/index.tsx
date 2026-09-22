/**
	* 场景卡身份字段：layerId + 呼入/呼出方向。
	*/
"use client";

import type { FC } from "react";
import { MenuItem, TextField } from "@mui/material";
import type { PromptSceneLayerForm } from "@studio-v2/typeFiles/library/characters/form/characterFormShapes";

const DIRECTION_OPTIONS = [
	{ label: "呼入", value: "inbound" },
	{ label: "呼出", value: "outbound" },
	{ label: "呼入+呼出", value: "either" },
] as const;

export type PromptSceneIdentityFieldsProps = {
	scene: PromptSceneLayerForm;
	disabled?: boolean;
	onPatch: (
		patcher: (scene: PromptSceneLayerForm) => PromptSceneLayerForm,
	) => void;
};

export const PromptSceneIdentityFields: FC<PromptSceneIdentityFieldsProps> =
	function PromptSceneIdentityFields({
		// scene 是当前场景层，用于字段展示
		scene,
		// disabled 表示强制禁用，用于锁定输入
		disabled,
		// onPatch 表示写回本卡，用于字段变更
		onPatch,
	}) {
		return (
			<>
				{/* 引用了TextField组件，用于编辑 layerId */}
				<TextField
					label="场景 id"
					value={scene.layerId}
					onChange={(e) =>
						onPatch((s) => ({
							...s,
							layerId: e.target.value,
						}))
					}
					size="small"
					fullWidth
					disabled={disabled}
				/>
				{/* 引用了TextField组件，用于选择呼入呼出方向 */}
				<TextField
					label="呼入 / 呼出"
					select
					value={scene.match.callDirection}
					onChange={(e) =>
						onPatch((s) => ({
							...s,
							match: {
								...s.match,
								callDirection: e.target
									.value as PromptSceneLayerForm["match"]["callDirection"],
							},
						}))
					}
					size="small"
					fullWidth
					disabled={disabled}
				>
					{DIRECTION_OPTIONS.map((opt) => (
						// 引用了MenuItem组件，用于方向选项
						<MenuItem key={opt.value} value={opt.value}>
							{opt.label}
						</MenuItem>
					))}
				</TextField>
			</>
		);
	};
