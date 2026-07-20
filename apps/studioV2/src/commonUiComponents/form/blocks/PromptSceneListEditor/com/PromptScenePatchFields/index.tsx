/**
	* 场景卡 patch 多行字段区：opening/emotion/tone/append。
	* 从正文拆出，压低 PromptSceneCardBody 有效行数。
	*/
"use client";

import type { FC } from "react";
import { TextField } from "@mui/material";
import type { PromptSceneLayerForm } from "@studio-v2/typeFiles/library/characters/form/characterFormShapes";

const PATCH_FIELDS = [
	["openingSpeakable", "开场白提示词"],
	["openingPrivate", "私有开场提示"],
	["emotion", "情绪"],
	["toneHint", "语气提示"],
	["appendSpeakable", "追加可说文本"],
	["appendPrivate", "追加私有文本"],
] as const;

export type PromptScenePatchFieldsProps = {
	scene: PromptSceneLayerForm;
	disabled?: boolean;
	onPatch: (
		patcher: (scene: PromptSceneLayerForm) => PromptSceneLayerForm,
	) => void;
};

export const PromptScenePatchFields: FC<PromptScenePatchFieldsProps> =
	function PromptScenePatchFields({
		// scene 提供 patch 当前值，用于各多行输入展示
		scene,
		// disabled 表示强制禁用，用于锁定 patch 编辑
		disabled,
		// onPatch 写回本卡，用于 patch 字段变更
		onPatch,
	}) {
		return (
			<>
				{PATCH_FIELDS.map(([key, fieldLabel]) => (
					// 引用了TextField组件，用于编辑 patch 字段
					<TextField
						key={key}
						label={fieldLabel}
						value={scene.patch[key]}
						onChange={(e) =>
							onPatch((s) => ({
								...s,
								patch: { ...s.patch, [key]: e.target.value },
							}))
						}
						size="small"
						fullWidth
						multiline={
							key === "openingSpeakable" ||
							key === "openingPrivate" ||
							key === "appendSpeakable" ||
							key === "appendPrivate"
						}
						minRows={2}
						disabled={disabled}
					/>
				))}
			</>
		);
	};
