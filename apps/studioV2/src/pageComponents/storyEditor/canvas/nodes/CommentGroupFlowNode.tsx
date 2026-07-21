/**
	* 注释分组：虚线矩形框 + 标题。
	* 纯 UI mock；不参与 story 边引擎语义；可拖动选中。
	*/
"use client";

import type { FC } from "react";
import type { NodeProps } from "@xyflow/react";
import type { EditorCommentGroupNodeData } from "@studio-v2/typeFiles/story/editor/mock/editorLightweightNodes";
import styles from "./editorNodes.module.scss";

export const CommentGroupFlowNode: FC<NodeProps> = function CommentGroupFlowNode({
	// data 是注释分组投影，用于标题
	data: rawData,
	// selected 表示节点选中态，用于高亮描边
	selected,
}) {
	const data = rawData as EditorCommentGroupNodeData;
	const rootClass = selected
		? `${styles.commentGroup} ${styles.commentGroupSelected}`
		: styles.commentGroup;

	return (
		<div className={rootClass} title="注释分组 · mock">
			<div className={styles.commentLabel}>{data.title}</div>
		</div>
	);
};
