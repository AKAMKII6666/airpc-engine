/**
* 章节起止节点：一等节点形态的静态壳；不与 CallCard 共用 debug 字段。
*/
"use client";

import type { FC } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { EditorChapterNodeData } from "@studio-v2/typeFiles/story/editor/editorCallCardProjection";
import styles from "./editorNodes.module.scss";

export const ChapterFlowNode: FC<NodeProps> = function (props) {
	const data = props.data as EditorChapterNodeData;
	const isStart = data.kind === "chapter_start";

	return (
		<div className={isStart ? styles.chapterStart : styles.chapterEnd}>
			{!isStart ? (
				// 引用了Handle组件，用于章节结束入口
				<Handle
					id="parent"
					type="target"
					position={Position.Left}
					className={styles.handleParent}
				/>
			) : null}
			<div className={styles.chapterLabel}>{data.title}</div>
			<div className={styles.goal}>{data.summary}</div>
			{isStart ? (
				// 引用了Handle组件，用于章节开始出口
				<Handle
					id="exit"
					type="source"
					position={Position.Right}
					className={styles.handleExit}
				/>
			) : null}
		</div>
	);
};
