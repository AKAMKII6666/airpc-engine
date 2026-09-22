/**
	* 场景卡折叠正文：匹配字段 + patch；委托子组件以降行数。
	*/
"use client";

import type { FC } from "react";
import type { PromptSceneLayerForm } from "@studio-v2/typeFiles/library/characters/form/characterFormShapes";
import type { FormFieldMode } from "../../../../types/formTypes";
import type { FormBoundFieldProps } from "../../../../fields/types/formBoundTypes";
import styles from "../../index.module.scss";
// 引用了PromptSceneMatchFields组件，用于 layerId/方向/小时
import { PromptSceneMatchFields } from "../PromptSceneMatchFields";
// 引用了PromptScenePatchFields组件，用于 opening/emotion 等 patch
import { PromptScenePatchFields } from "../PromptScenePatchFields";

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
				{/* 引用了PromptSceneMatchFields组件，用于 layerId/方向/小时 */}
				<PromptSceneMatchFields
					scene={scene}
					index={index}
					name={name}
					formik={formik}
					mode={mode}
					disabled={disabled}
					onPatch={onPatch}
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
