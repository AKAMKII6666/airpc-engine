/**
	* 可删除画布边：挂载/卸载效果边与结束故事边共用。
	* 中点删除按钮经 Context 请求确认；不直接删。
	*/
"use client";

import type { FC, MouseEvent } from "react";
import {
	BaseEdge,
	EdgeLabelRenderer,
	getBezierPath,
	type EdgeProps,
} from "@xyflow/react";
import { useStoryCanvasUi } from "@studio-v2/src/pageComponents/storyEditor/canvas/storyCanvasUiContext";
import styles from "./DeletableCanvasEdge.module.scss";

export const DeletableCanvasEdge: FC<EdgeProps> = function DeletableCanvasEdge({
	// id 是边稳定键，用于确认删除定位
	id,
	// sourceX 是源端 X，用于贝塞尔路径
	sourceX,
	// sourceY 是源端 Y，用于贝塞尔路径
	sourceY,
	// targetX 是目标端 X，用于贝塞尔路径
	targetX,
	// targetY 是目标端 Y，用于贝塞尔路径
	targetY,
	// sourcePosition 是源 Handle 方位，用于路径曲率
	sourcePosition,
	// targetPosition 是目标 Handle 方位，用于路径曲率
	targetPosition,
	// style 是边描边样式，用于挂载绿/卸载橙/结束蓝区分
	style,
	// markerEnd 是箭头标记，用于链路终点；缺省无
	markerEnd,
	// label 是边中点文字，用于显示挂载/卸载/结束
	label,
}) {
	const canvasUi = useStoryCanvasUi();
	const [edgePath, labelX, labelY] = getBezierPath({
		sourceX,
		sourceY,
		sourcePosition,
		targetX,
		targetY,
		targetPosition,
	});
	const displayName =
		typeof label === "string" && label.trim() !== ""
			? label
			: "连线";

	function handleDeleteClick(event: MouseEvent): void {
		event.stopPropagation();
		event.preventDefault();
		canvasUi?.requestDeleteEdge(id, displayName);
	}

	const stroke =
		(style as { stroke?: string } | undefined)?.stroke ?? "#5b6cff";

	return (
		<>
			{/* 引用了BaseEdge组件，用于绘制贝塞尔路径 */}
			<BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
			{/* 引用了EdgeLabelRenderer组件，用于中点标签与删除按钮 */}
			<EdgeLabelRenderer>
				<div
					className={styles.labelWrap}
					style={{
						transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
					}}
				>
					<span className={styles.label} style={{ borderColor: stroke }}>
						{displayName}
					</span>
					<button
						type="button"
						className={styles.deleteBtn}
						aria-label={`删除${displayName}连线`}
						onClick={handleDeleteClick}
					>
						×
					</button>
				</div>
			</EdgeLabelRenderer>
		</>
	);
};
