/**
* CallCard 蓝图节点：顶角色 / 左 parent / 右 exit 触点。
* 静态展示；点击仅本地选中态，不写卡内容。
* 出口 Handle 按 exits[] 动态渲染；变更后刷新 RF 内部几何，避免新出口无法连线。
* 卡角 ❌ 请求删除（确认框在壳层）。
*/
"use client";

import type { FC, MouseEvent } from "react";
import { useEffect } from "react";
import { IconButton, Tooltip } from "@mui/material";
import {
	Handle,
	Position,
	useUpdateNodeInternals,
	type NodeProps,
} from "@xyflow/react";
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
import { useStoryCanvasUi } from "@studio-v2/src/pageComponents/storyEditor/canvas/stage/storyCanvasUiContext";
import styles from "./editorNodes.module.scss";

function CallCardDeleteButton({
	// nodeId 表示画布节点 id，用于删除请求
	nodeId,
	// title 表示卡标题，用于删除确认展示名
	title,
	// cardId 表示卡 id，用于标题为空时的展示名
	cardId,
	// requestDeleteNode 表示壳层删除口，用于打开确认框
	requestDeleteNode,
}: {
	nodeId: string;
	title: string;
	cardId: string;
	requestDeleteNode: ((nodeId: string, displayName: string) => void) | undefined;
}) {
	function handleDeleteClick(event: MouseEvent): void {
		event.stopPropagation();
		event.preventDefault();
		requestDeleteNode?.(
			nodeId,
			title.trim() !== "" ? title : cardId,
		);
	}

	return (
		// 引用了IconButton组件，用于删除通话卡确认入口
		<IconButton
			size="small"
			className={styles.deleteBtn}
			aria-label={`删除通话卡 ${title || cardId}`}
			onClick={handleDeleteClick}
		>
			×
		</IconButton>
	);
}

function CallCardAnchorHandles() {
	return (
		<>
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
		</>
	);
}

function CallCardSummary({
	// data 表示通话卡投影，用于种类标题与页脚
	data,
	// exitCount 表示出口数量，用于页脚计数
	exitCount,
}: {
	data: EditorCallCardProjection;
	exitCount: number;
}) {
	return (
		<>
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
		</>
	);
}

function CallCardExitHandles({
	// exits 表示出口列表，用于动态 Handle
	exits,
	// exitCount 表示出口总数，用于纵向定位
	exitCount,
}: {
	exits: EditorCallCardProjection["exits"];
	exitCount: number;
}) {
	return (
		<>
			{exits.map((exit, index) => (
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
							title="普通拖=剧情线；Alt/⌥ 或 ⌘ 拖=挂载效果边"
						/>
					</span>
				</Tooltip>
			))}
		</>
	);
}

export const CallCardFlowNode: FC<NodeProps> = function ({
	// id 表示画布节点 id，用于删除与刷新 Handle
	id,
	// data 表示节点 data，用于通话卡投影展示
	data: rawData,
	// selected 表示是否选中，用于高亮边框
	selected,
}) {
	const data = rawData as EditorCallCardProjection;
	const rootClass = selected ? styles.callCardSelected : styles.callCard;
	const exitCount = exitCountFromProjection(data);
	const canvasUi = useStoryCanvasUi();
	const updateNodeInternals = useUpdateNodeInternals();
	// 出口增删改后须刷新 Handle 注册，否则拖线/效果边对不准
	const exitIdsKey = data.exits.map((exit) => exit.exitId).join(",");

	useEffect(() => {
		updateNodeInternals(id);
	}, [id, exitIdsKey, exitCount, updateNodeInternals]);

	return (
		<div className={rootClass}>
			{/* 引用了CallCardDeleteButton组件，用于删除通话卡确认入口 */}
			<CallCardDeleteButton
				nodeId={id}
				title={data.title}
				cardId={data.cardId}
				requestDeleteNode={canvasUi?.requestDeleteNode}
			/>
			{/* 引用了CallCardAnchorHandles组件，用于角色与剧情入口触点 */}
			<CallCardAnchorHandles />
			{/* 引用了CallCardSummary组件，用于卡种类标题与出口计数 */}
			<CallCardSummary data={data} exitCount={exitCount} />
			{/* 引用了CallCardExitHandles组件，用于按 exits[] 动态出口 */}
			<CallCardExitHandles exits={data.exits} exitCount={exitCount} />
		</div>
	);
};
