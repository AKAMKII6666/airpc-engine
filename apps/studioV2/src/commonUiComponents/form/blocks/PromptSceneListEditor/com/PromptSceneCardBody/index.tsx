/**
	* 场景卡折叠正文：layerId / 方向 / 本地小时；patch 委托子组件。
	*/
"use client";

import type { FC } from "react";
import { MenuItem, TextField } from "@mui/material";
import type { PromptSceneLayerForm } from "@studio-v2/typeFiles/library/characters/form/characterFormShapes";
import type { FormFieldMode } from "../../../../formTypes";
import type { FormBoundFieldProps } from "../../../../fields/types/formBoundTypes";
import { FormLocalHourRangeField } from "../../../LocalHourRangeField";
import styles from "../../index.module.scss";
import { PromptScenePatchFields } from "../PromptScenePatchFields";

const DIRECTION_OPTIONS = [
	{ label: "呼入", value: "inbound" },
	{ label: "呼出", value: "outbound" },
	{ label: "呼入+呼出", value: "either" },
] as const;

export type PromptSceneCardBodyProps = {
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

export const PromptSceneCardBody: FC<PromptSceneCardBodyProps> =
	function PromptSceneCardBody({
		// scene 是当前场景层表单值，用于正文各字段展示
		scene,
		// index 是列表下标，用于拼嵌套 Formik 逃生路径
		index,
		// name 是父级 Formik 路径前缀，用于 localHourRange 字段名
		name,
		// formik 转给时段字段，用于逃生受控而非误绑父路径
		formik,
		// mode 是 add|edit|watch，用于子字段交互
		mode,
		// disabled 表示强制禁用，用于锁定输入
		disabled,
		// onPatch 按不可变 patcher 写回本卡，用于字段变更
		onPatch,
	}) {
		return (
			<div className={styles.body}>
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
				{/* 引用了PromptScenePatchFields组件，用于编辑 opening/emotion 等 patch */}
				<PromptScenePatchFields
					scene={scene}
					disabled={disabled}
					onPatch={onPatch}
				/>
			</div>
		);
	};
