/**
	* 画布角色锚点节点：CallCard 顶 role handle 的连线目标；可选中编辑。
	* 未挂卡仍正常显示（不灰显）；编辑落盘复用 /characters FormModal；不写 storis-packages。
	*/
"use client";

import type { FC } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { CharacterAnchorNodeData } from "@studio-v2/typeFiles/story/editor/mock/storyEditorMock";
import styles from "./editorNodes.module.scss";

export const CharacterAnchorFlowNode: FC<NodeProps> = function CharacterAnchorFlowNode({
	// data 是锚点投影，用于显示名与挂卡状态
	data: rawData,
	// selected 表示节点选中态，用于高亮描边
	selected,
}) {
	const data = rawData as CharacterAnchorNodeData;
	const rootClass = [
		styles.characterAnchor,
		selected ? styles.characterAnchorSelected : "",
	]
		.filter(Boolean)
		.join(" ");

	return (
		<div className={rootClass} title={`${data.statusLabel} · 点选编辑`}>
			<span className={styles.anchorAvatar} aria-hidden>
				{data.displayName.slice(0, 1)}
			</span>
			<div className={styles.anchorBody}>
				<div className={styles.anchorName}>{data.displayName}</div>
				<div className={styles.anchorMeta}>{data.statusLabel}</div>
			</div>
			{/* 引用了Handle组件，用于角色归属连线入口 */}
			<Handle
				id="role"
				type="target"
				position={Position.Right}
				className={styles.handleRole}
				title="角色归属入口"
			/>
		</div>
	);
};
