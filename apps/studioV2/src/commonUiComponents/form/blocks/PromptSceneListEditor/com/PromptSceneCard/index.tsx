/**
	* 单张场景提示词卡壳：拖拽句柄、折叠头、委托正文给 PromptSceneCardBody。
	*/
"use client";

import type { DragEvent, FC } from "react";
import { Button, Collapse, IconButton } from "@mui/material";
import type { PromptSceneLayerForm } from "@studio-v2/typeFiles/library/characters/form/characterFormShapes";
import type { FormFieldMode } from "../../../../formTypes";
import type { FormBoundFieldProps } from "../../../../fields/types/formBoundTypes";
import styles from "../../index.module.scss";
import { PromptSceneCardBody } from "../PromptSceneCardBody";

export type PromptSceneCardProps = {
	scene: PromptSceneLayerForm;
	index: number;
	open: boolean;
	name: string;
	formik: FormBoundFieldProps<Record<string, unknown>>["formik"];
	mode: FormFieldMode;
	disabled?: boolean;
	onToggleExpand: () => void;
	onDelete: () => void;
	onPatch: (
		patcher: (scene: PromptSceneLayerForm) => PromptSceneLayerForm,
	) => void;
	onDragStart: (e: DragEvent<HTMLLIElement>) => void;
	onDragOver: (e: DragEvent<HTMLLIElement>) => void;
	onDrop: (e: DragEvent<HTMLLIElement>) => void;
};

export const PromptSceneCard: FC<PromptSceneCardProps> = function PromptSceneCard({
	// scene 是当前场景层表单值，用于渲染本卡头与正文
	scene,
	// index 是列表下标，用于拼 Formik 逃生路径
	index,
	// open 表示折叠是否展开，用于 Collapse 与按钮文案
	open,
	// name 是父级 Formik 路径前缀，用于嵌套字段名
	name,
	// formik 是父级注入实例，用于转给正文时段字段
	formik,
	// mode 是 add|edit|watch，用于子字段交互模式
	mode,
	// disabled 表示强制禁用，用于拖拽与输入锁定
	disabled,
	// onToggleExpand 切换本卡折叠，用于展开或收起
	onToggleExpand,
	// onDelete 删除本卡，用于从列表移除
	onDelete,
	// onPatch 按不可变 patcher 写回本卡，用于字段变更
	onPatch,
	// onDragStart 开始拖拽，用于排序
	onDragStart,
	// onDragOver 允许放置，用于排序
	onDragOver,
	// onDrop 完成放置，用于排序写回 priority
	onDrop,
}) {
	return (
		<li
			className={styles.card}
			draggable={!disabled}
			onDragStart={onDragStart}
			onDragOver={onDragOver}
			onDrop={onDrop}
		>
			<div className={styles.cardHead}>
				<button
					type="button"
					className={styles.dragHandle}
					disabled={disabled}
					aria-label={`拖拽调整 ${scene.layerId} 优先级`}
				>
					⋮⋮
				</button>
				<span className={styles.priority}>P{scene.priority}</span>
				<span className={styles.layerId}>{scene.layerId}</span>
				{/* 引用了Button组件，用于折叠展开场景卡 */}
				<Button type="button" size="small" onClick={onToggleExpand}>
					{open ? "收起" : "展开"}
				</Button>
				{/* 引用了IconButton组件，用于删除场景卡 */}
				<IconButton
					type="button"
					size="small"
					disabled={disabled}
					aria-label={`删除场景 ${scene.layerId}`}
					onClick={onDelete}
				>
					×
				</IconButton>
			</div>
			{/* 引用了Collapse组件，用于折叠场景卡正文 */}
			<Collapse in={open}>
				{/* 引用了PromptSceneCardBody组件，用于编辑场景匹配与 patch */}
				<PromptSceneCardBody
					scene={scene}
					index={index}
					name={name}
					formik={formik}
					mode={mode}
					disabled={disabled}
					onPatch={onPatch}
				/>
			</Collapse>
		</li>
	);
};
