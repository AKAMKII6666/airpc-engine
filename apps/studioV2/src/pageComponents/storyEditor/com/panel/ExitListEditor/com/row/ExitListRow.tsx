/**
	* 出口列表单行：名称 / 优先级 / ExitCondition v1 / effects。
	*/
"use client";

import type { FC } from "react";
import type { ExitListFormRow } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/exitListForm";
import type { EffectPanelSources } from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
import { defaultExitCondition } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/exitConditionForm";
// 引用了ExitConditionEditor组件，用于出口条件 v1 编辑
import { ExitConditionEditor } from "../condition/ExitConditionEditor";
// 引用了ExitEffectsList组件，用于出口 effects 列表编辑
import { ExitEffectsList } from "../list/ExitEffectsList";
// 引用了ExitListRowHead等组件，用于头部与基础字段
import {
	ExitListPriorityField,
	ExitListRowHead,
	ExitListTitleField,
} from "./ExitListRowFields";
import styles from "../../index.module.scss";

export type ExitListRowProps = {
	row: ExitListFormRow;
	index: number;
	requiredBeats: readonly string[];
	sources: EffectPanelSources;
	onPatch: (index: number, patch: Partial<ExitListFormRow>) => void;
	onRemove: (index: number) => void;
};

export const ExitListRow: FC<ExitListRowProps> = function ExitListRow({
	// row 是当前出口表单行，用于展示与编辑
	row,
	// index 是在 exits[] 中的下标，用于写回定位
	index,
	// requiredBeats 是本卡必做节拍，用于条件 beatId 下拉
	requiredBeats,
	// sources 是 Effect id 下拉候选源，用于 effects 列表
	sources,
	// onPatch 是局部字段写回，用于改名称/类别等
	onPatch,
	// onRemove 是删除本行，用于从列表移除出口
	onRemove,
}) {
	return (
		<li className={styles.card}>
			{/* 引用了ExitListRowHead组件，用于 exitId 与删除 */}
			<ExitListRowHead
				exitId={row.exitId}
				onRemove={function () {
					onRemove(index);
				}}
			/>
			{/* 引用了ExitListTitleField组件，用于出口名称 */}
			<ExitListTitleField
				title={row.title ?? ""}
				onChange={function (title) {
					onPatch(index, { title });
				}}
			/>
			{/* 引用了ExitListPriorityField组件，用于优先级 */}
			<ExitListPriorityField
				priority={row.priority}
				onChange={function (priority) {
					onPatch(index, { priority });
				}}
			/>
			{/* 引用了ExitConditionEditor组件，用于出口条件 v1 编辑 */}
			<ExitConditionEditor
				condition={row.condition ?? defaultExitCondition()}
				requiredBeats={requiredBeats}
				onChange={(next) => {
					onPatch(index, next);
				}}
			/>
			{/* 引用了ExitEffectsList组件，用于出口 effects 列表编辑 */}
			<ExitEffectsList
				effects={row.effects ?? []}
				sources={sources}
				onChange={(next) => {
					onPatch(index, { effects: next });
				}}
			/>
		</li>
	);
};
