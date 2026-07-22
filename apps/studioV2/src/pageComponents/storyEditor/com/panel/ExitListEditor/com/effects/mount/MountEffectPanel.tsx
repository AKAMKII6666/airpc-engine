/**
	* attach_call_card / unmount_call_card 参数面板（连线同步子型，§2.3）。
	* 展示当前挂载/卸载目标摘要 + 打开 modal 配置；一条行 ↔ 画布一条效果边。
	* 多条挂载 = 在出口 effects 列表里加多条 attach 行（每行一条边）。
	*/
"use client";

import type { FC } from "react";
import { useState } from "react";
import { Button, Typography } from "@mui/material";
import type {
	AttachCallCardParams,
	UnmountCallCardParams,
} from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
import { readEffectParams } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/effects/effectParams";
import { summarizeEffect } from "@studio-v2/src/bis/pageBis/storyEditor/form/exitList/effects/summarizeEffect";
import type { EffectPanelSlotProps } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/effectPanelSlot";
// 引用了MountTargetModal组件，用于挂载/卸载目标配置弹层
import { MountTargetModal } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/mount/MountTargetModal";
import styles from "../effectPanels.module.scss";

export const MountEffectPanel: FC<EffectPanelSlotProps> = function MountEffectPanel({
	// effect 是当前行 effect 名，用于区分挂载/卸载
	effect,
	// params 是当前行参数投影，用于回显与写回
	params,
	// sources 是 id 下拉候选源，用于卡/角色/包选择与摘要显示名
	sources,
	// onParamsChange 是参数写回，用于同步出口 effects 行
	onParamsChange,
}) {
	const isAttach = effect === "attach_call_card";
	const value = isAttach
		? readEffectParams("attach_call_card", params)
		: readEffectParams("unmount_call_card", params);
	const [modalOpen, setModalOpen] = useState(false);
	const summary = summarizeEffect(effect, params, sources);

	return (
		<div className={styles.panel}>
			{/* 引用了Typography组件，用于当前目标摘要 */}
			<Typography variant="caption" className={styles.notice}>
				{summary}
			</Typography>
			{/* 引用了Typography组件，用于连线同步说明 */}
			<Typography variant="caption" className={styles.notice}>
				本行对应画布上一条{isAttach ? "「挂载」绿色" : "「卸载」橙色"}效果边（区别于流转线）；多条{isAttach ? "挂载" : "卸载"}请添加多个 Effect 行。
			</Typography>
			{/* 引用了Button组件，用于打开目标配置弹层 */}
			<Button
				size="small"
				variant="outlined"
				onClick={() => {
					setModalOpen(true);
				}}
			>
				{value.cardId ? "编辑目标" : "配置目标"}
			</Button>
			{/* 引用了MountTargetModal组件，用于目标卡/角色配置 */}
			<MountTargetModal
				open={modalOpen}
				kind={isAttach ? "attach" : "unmount"}
				value={value as AttachCallCardParams | UnmountCallCardParams}
				sources={sources}
				onClose={() => {
					setModalOpen(false);
				}}
				onConfirm={(next) => {
					onParamsChange(next);
					setModalOpen(false);
				}}
			/>
		</div>
	);
};
