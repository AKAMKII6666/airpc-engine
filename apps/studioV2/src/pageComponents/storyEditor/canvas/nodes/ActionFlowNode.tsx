/**
	* 动作节点：轻量 mock 卡片 + 闪电 icon。
	* 不参与 CallCard 校验；不进引擎 schema；可拖动选中。
	*/
"use client";

import type { FC } from "react";
import type { NodeProps } from "@xyflow/react";
import type { EditorActionNodeData } from "@studio-v2/typeFiles/story/editor/mock/editorLightweightNodes";
import { IconAction } from "@studio-v2/src/pageComponents/storyEditor/com/dock/DockToolIcons";
import styles from "./editorNodes.module.scss";

export const ActionFlowNode: FC<NodeProps> = function ActionFlowNode({
	// data 是动作节点投影，用于标题与摘要
	data: rawData,
	// selected 表示节点选中态，用于高亮描边
	selected,
}) {
	const data = rawData as EditorActionNodeData;
	const rootClass = selected
		? `${styles.actionNode} ${styles.actionNodeSelected}`
		: styles.actionNode;

	return (
		<div className={rootClass} title="动作节点 · mock">
			<span className={styles.actionIcon} aria-hidden>
				{/* 引用了IconAction组件，用于动作节点闪电标识 */}
				<IconAction fontSize="small" />
			</span>
			<div className={styles.actionBody}>
				<div className={styles.actionTitle}>{data.title}</div>
				{data.summary ? (
					<div className={styles.actionSummary}>{data.summary}</div>
				) : null}
			</div>
		</div>
	);
};
