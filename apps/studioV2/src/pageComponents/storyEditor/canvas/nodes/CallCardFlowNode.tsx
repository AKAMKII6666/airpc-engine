/**
* CallCard 蓝图节点：顶角色 / 左 parent / 右 exit 触点。
* 静态展示；点击仅本地选中态，不写卡内容。
* 出口 Handle 按 exits[] 动态渲染；悬停 Tooltip 显示名称+概要。
* 卡角 ❌ 请求删除（确认框在壳层）。
*/
"use client";

import type { FC, MouseEvent } from "react";
import { IconButton, Tooltip } from "@mui/material";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { EditorCallCardProjection } from "@studio-v2/typeFiles/story/editor/callCard/editorCallCardProjection";
import { exitCountFromProjection } from "@studio-v2/typeFiles/story/editor/callCard/editorCallCardProjection";
import {
	cardKindLabel,
	entryModeLabel,
	exitHandleTooltipTitle,
} from "@studio-v2/typeFiles/story/callCardLabels";
import { exitHandleTopPercent } from "@studio-v2/src/bis/pageBis/storyEditor/canvas/exitHandleLayout";
import {
	callCardValidationClass,
	callCardValidationText,
} from "@studio-v2/src/pageComponents/storyEditor/canvas/nodes/callCardValidation";
import { useStoryCanvasUi } from "@studio-v2/src/pageComponents/storyEditor/canvas/storyCanvasUiContext";
import styles from "./editorNodes.module.scss";

export const CallCardFlowNode: FC<NodeProps> = function (props) {
	const data = props.data as EditorCallCardProjection;
	const selected = Boolean(props.selected || data.selected);
	const rootClass = selected ? styles.callCardSelected : styles.callCard;
	const exitCount = exitCountFromProjection(data);
	const canvasUi = useStoryCanvasUi();

	function handleDeleteClick(event: MouseEvent): void {
		event.stopPropagation();
		event.preventDefault();
		canvasUi?.requestDeleteNode(
			props.id,
			data.title.trim() !== "" ? data.title : data.cardId,
		);
	}

	return (
		<div className={rootClass}>
			{/* 引用了IconButton组件，用于删除通话卡确认入口 */}
			<IconButton
				size="small"
				className={styles.deleteBtn}
				aria-label={`删除通话卡 ${data.title || data.cardId}`}
				onClick={handleDeleteClick}
			>
				×
			</IconButton>
			{/* 引用了Handle组件，用于角色归属连线出口 */}
			<Handle
				id="role"
				type="source"
				position={Position.Top}
				className={styles.handleRole}
				title="拖到角色锚点以设置归属"
			/>
			{/* 引用了Handle组件，用于剧情入口连线 */}
			<Handle
				id="parent"
				type="target"
				position={Position.Left}
				className={styles.handleParent}
				title="剧情入口"
			/>
			<div className={styles.kind}>{cardKindLabel(data.cardKind)}</div>
			<div className={styles.title}>{data.title}</div>
			<div className={styles.meta}>{data.ownerDisplayName}</div>
			<div className={styles.goal}>{data.context.objective ?? ""}</div>
			<div className={styles.footer}>
				<span>{entryModeLabel(data.entryMode)}</span>
				<span>{exitCount} 出口</span>
				<span className={callCardValidationClass(data.validationBadge)}>
					{callCardValidationText(data.validationBadge)}
				</span>
			</div>
			{data.exits.map((exit, index) => (
				// 引用了Tooltip组件，用于出口名称与条件概要
				<Tooltip
					key={exit.exitId}
					title={exitHandleTooltipTitle(exit)}
					placement="right"
					enterDelay={200}
				>
					<span
						className={styles.exitHandleHit}
						style={{ top: exitHandleTopPercent(index, exitCount) }}
					>
						{/* 引用了Handle组件，用于按 exits[] 动态出口连线 */}
						<Handle
							id={exit.exitId}
							type="source"
							position={Position.Right}
							className={styles.handleExit}
						/>
					</span>
				</Tooltip>
			))}
		</div>
	);
};
