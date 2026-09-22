/**
	* 场景卡身份与匹配字段：layerId / 方向 / 本地小时。
	*/
"use client";

import type { FC } from "react";
import type { PromptSceneLayerForm } from "@studio-v2/typeFiles/library/characters/form/characterFormShapes";
import type { FormFieldMode } from "../../../../types/formTypes";
import type { FormBoundFieldProps } from "../../../../fields/types/formBoundTypes";
// 引用了FormLocalHourRangeField组件，用于编辑本场景本地小时区间
import { FormLocalHourRangeField } from "../../../LocalHourRangeField";
// 引用了PromptSceneIdentityFields组件，用于 layerId 与方向
import { PromptSceneIdentityFields } from "../PromptSceneIdentityFields";

export type PromptSceneMatchFieldsProps = {
	scene: PromptSceneLayerForm;
	index: number;
	name: string;
	formik: FormBoundFieldProps<Record<string, unknown>>["formik"];
	mode: FormFieldMode;
	disabled?: boolean;
	onPatch: (
		patcher: (scene: PromptSceneLayerForm) => PromptSceneLayerForm,
	) => void;
};

export const PromptSceneMatchFields: FC<PromptSceneMatchFieldsProps> =
	function PromptSceneMatchFields({
		// scene 是当前场景层，用于字段展示
		scene,
		// index 是列表下标，用于拼嵌套路径
		index,
		// name 是父级 Formik 路径前缀，用于拼 localHourRange 字段名
		name,
		// formik 表示 Formik 实例，用于时段字段逃生受控
		formik,
		// mode 表示交互模式，用于 add|edit|watch
		mode,
		// disabled 表示强制禁用，用于锁定输入
		disabled,
		// onPatch 表示写回本卡，用于字段变更
		onPatch,
	}) {
		return (
			<>
				{/* 引用了PromptSceneIdentityFields组件，用于 layerId 与方向 */}
				<PromptSceneIdentityFields
					scene={scene}
					disabled={disabled}
					onPatch={onPatch}
				/>
				{/* 引用了FormLocalHourRangeField组件，用于编辑本场景本地小时区间 */}
				<FormLocalHourRangeField
					name={`${name}[${index}].match.localHourRange`}
					label="本地小时区间"
					formik={formik}
					mode={mode}
					required
					disabled={disabled}
					value={scene.match.localHourRange}
					onChange={(next) => {
						onPatch((s) => ({
							...s,
							match: {
								...s.match,
								localHourRange:
									next as PromptSceneLayerForm["match"]["localHourRange"],
							},
						}));
					}}
				/>
			</>
		);
	};
