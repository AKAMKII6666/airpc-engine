/**
	* 挂载/卸载目标配置 modal：只选「目标卡」（当前包内、非本卡）。
	* 一次配置对应一条 attach/unmount 行 ↔ 画布一条效果边（§2.3）；禁自由文本手填 id。
	* 角色不再手选：确认时自动取目标卡归属；故事包=当前包、入口模式交给目标卡自身属性。
	*/
"use client";

import type { FC } from "react";
import { useEffect, useState } from "react";
import { Button, Typography } from "@mui/material";
import type {
	AttachCallCardParams,
	EditorEffectParams,
	EffectPanelSources,
	UnmountCallCardParams,
} from "@studio-v2/typeFiles/story/editor/callCard/editorEffectParams";
// 引用了AppModal组件，用于统一 Dialog 壳
import { AppModal } from "@studio-v2/src/commonUiComponents/modal/app/AppModal";
// 引用了EffectNodeSelect组件，用于目标卡 id 下拉
import { EffectNodeSelect } from "@studio-v2/src/pageComponents/storyEditor/com/panel/ExitListEditor/com/effects/EffectNodeSelect";
import type { EditorEffectEdgeKind } from "@studio-v2/src/bis/pageBis/storyEditor/canvas/effectEdgeSync";
import styles from "../effectPanels.module.scss";

/**
	* 草稿 → 参数投影；角色自动取目标卡归属，包/入口模式不在此配置。
	* 空目标卡归一为 undefined（unmount 表示作用于当前卡）。
	*/
function buildMountParams(
	isAttach: boolean,
	cardId: string,
	ownerAgentId: string,
): EditorEffectParams {
	const card = cardId === "" ? undefined : cardId;
	const agentId = ownerAgentId === "" ? undefined : ownerAgentId;
	if (!isAttach) {
		return { effect: "unmount_call_card", cardId: card, agentId };
	}
	return { effect: "attach_call_card", cardId: card, agentId };
}

/** 按挂载/卸载给出标题与字段文案，避免组件内堆三元 */
function mountModalLabels(isAttach: boolean): {
	title: string;
	description: string;
	cardLabel: string;
} {
	if (isAttach) {
		return {
			title: "配置挂载目标",
			description: "选当前包内一张卡（非本卡）。角色自动取该卡归属。",
			cardLabel: "目标卡（必填，非本卡）",
		};
	}
	return {
		title: "配置卸载目标",
		description: "选当前包内一张卡；留空表示作用于当前通话卡。",
		cardLabel: "目标卡（留空=当前卡）",
	};
}

export type MountTargetModalProps = {
	/** 是否打开 */
	open: boolean;
	/** 挂载 or 卸载；驱动标题与字段可空语义 */
	kind: EditorEffectEdgeKind;
	/** 回填初值；attach/unmount 参数联合 */
	value: AttachCallCardParams | UnmountCallCardParams;
	/** id 下拉候选源；cards 已由上层排除本卡 */
	sources: EffectPanelSources;
	/** 关闭（取消） */
	onClose: () => void;
	/** 确认写回该行 params */
	onConfirm: (next: EditorEffectParams) => void;
};

export const MountTargetModal: FC<MountTargetModalProps> = function MountTargetModal({
	// open 用于控制 Dialog 显隐
	open,
	// kind 区分挂载/卸载，用于标题与可空规则
	kind,
	// value 是当前行参数，用于回填草稿
	value,
	// sources 是 id 下拉候选源，用于目标卡选择与归属推导
	sources,
	// onClose 用于取消关闭 Dialog
	onClose,
	// onConfirm 用于把草稿写回该行 params
	onConfirm,
}) {
	const isAttach = kind === "attach";
	const labels = mountModalLabels(isAttach);
	const [cardId, setCardId] = useState<string>(() => value.cardId ?? "");

	// 打开时用当前行 cardId 刷新草稿；关闭态不重置以避免闪烁
	useEffect(() => {
		if (open) setCardId(value.cardId ?? "");
	}, [open, value]);

	// 目标卡归属角色；无归属时挂载会缺少目标角色，给出提示
	const ownerAgentId = cardId ? sources.cardOwnerAgentId[cardId] ?? "" : "";
	const missingOwner = isAttach && cardId !== "" && ownerAgentId === "";

	return (
		// 引用了AppModal组件，用于挂载/卸载目标配置 Dialog
		<AppModal
			open={open}
			title={labels.title}
			description={labels.description}
			onClose={onClose}
			maxWidth="sm"
			actions={
				<>
					{/* 引用了Button组件，用于取消 */}
					<Button size="small" onClick={onClose}>
						取消
					</Button>
					{/* 引用了Button组件，用于确认写回 */}
					<Button
						size="small"
						variant="contained"
						onClick={() => {
							onConfirm(buildMountParams(isAttach, cardId, ownerAgentId));
						}}
					>
						确认
					</Button>
				</>
			}
		>
			<div className={styles.modalBody}>
				{/* 引用了EffectNodeSelect组件，用于目标卡下拉 */}
				<EffectNodeSelect
					label={labels.cardLabel}
					value={cardId}
					options={sources.cards}
					allowEmpty={!isAttach}
					emptyHint="当前包内暂无其它可选卡，请先创建"
					onChange={setCardId}
				/>
				{missingOwner ? (
					// 引用了Typography组件，用于目标卡未绑角色的警示
					<Typography variant="caption" className={styles.notice}>
						该卡尚未绑定角色，请先在其属性面板连归属；否则挂载缺少目标角色。
					</Typography>
				) : null}
			</div>
		</AppModal>
	);
};
