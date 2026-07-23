/**
	* 通话卡出口列表编辑块：增删出口行，写回 Formik exits[]。
	* ExitCondition v1 叶子可编；and/or/not 嵌套只读保留。
	*/
"use client";

import type { FC } from "react";
import { Button, Typography } from "@mui/material";
import type { FormikProps } from "formik";
import type { NodePropertyFormValues } from "@studio-v2/src/bis/pageBis/storyEditor/form/node/nodePropertyForm";
import {
	emptyExitRow,
	type ExitListFormRow,
} from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/exitListForm";
import type { EffectPanelSources } from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
// 引用了ExitListRow组件，用于单出口字段编辑
import { ExitListRow } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/ExitListRow";
import styles from "./index.module.scss";

export type ExitListEditorProps = {
	formik: FormikProps<NodePropertyFormValues>;
	/** Effect id 下拉候选源；下传每行 effects 列表 */
	sources: EffectPanelSources;
};

function asExitList(raw: unknown): ExitListFormRow[] {
	if (!Array.isArray(raw)) return [];
	return raw as ExitListFormRow[];
}

function requiredBeatsFromForm(
	formik: FormikProps<NodePropertyFormValues>,
): string[] {
	const beats = formik.values.objectives?.requiredBeats;
	if (!Array.isArray(beats)) return [];
	return beats.filter(
		(id): id is string => typeof id === "string" && id.trim() !== "",
	);
}

export const ExitListEditor: FC<ExitListEditorProps> = function ExitListEditor({
	// formik 是属性浮窗 Formik，用于读写 exits[] 与 requiredBeats
	formik,
	// sources 是 Effect id 下拉候选源，用于每行 effects 列表
	sources,
}) {
	const list = asExitList(formik.values.exits);
	const requiredBeats = requiredBeatsFromForm(formik);

	function writeList(next: ExitListFormRow[]): void {
		void formik.setFieldValue("exits", next);
		void formik.setFieldTouched("exits", true);
	}

	function patchRow(
		index: number,
		patch: Partial<ExitListFormRow>,
	): void {
		writeList(
			list.map((row, i) => (i === index ? { ...row, ...patch } : row)),
		);
	}

	return (
		<div className={styles.root}>
			{/* 引用了Typography组件，用于出口列表说明 */}
			<Typography variant="caption" className={styles.hint}>
				出口 Handle 按本列表动态生成；条件写 exit.condition（v1 叶子可编）。
			</Typography>
			<ul className={styles.list}>
				{list.map((row, index) => (
					// 引用了ExitListRow组件，用于单出口字段编辑
					<ExitListRow
						key={row.exitId}
						row={row}
						index={index}
						requiredBeats={requiredBeats}
						sources={sources}
						onPatch={patchRow}
						onRemove={(removeIndex) => {
							writeList(list.filter((_, i) => i !== removeIndex));
						}}
					/>
				))}
			</ul>
			{/* 引用了Button组件，用于新增出口 */}
			<Button
				size="small"
				variant="outlined"
				onClick={() => {
					writeList([...list, emptyExitRow(list)]);
				}}
			>
				添加出口
			</Button>
		</div>
	);
};
