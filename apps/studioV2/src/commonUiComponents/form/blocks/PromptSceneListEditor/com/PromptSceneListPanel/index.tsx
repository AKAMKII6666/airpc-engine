/**
	* 场景列表面板：卡列表 + 添加按钮。
	* 从 FormPromptSceneListEditor 拆出，压低父组件有效行数。
	*/
"use client";

import type { DragEvent, FC } from "react";
import { Button } from "@mui/material";
import type { PromptSceneLayerForm } from "@studio-v2/typeFiles/library/characters/form/characterFormShapes";
import type { FormFieldMode } from "../../../../formTypes";
import type { FormBoundFieldProps } from "../../../../fields/types/formBoundTypes";
import styles from "../../index.module.scss";
import { PromptSceneCard } from "../PromptSceneCard";

export type PromptSceneListPanelProps = {
	list: PromptSceneLayerForm[];
	name: string;
	formik: FormBoundFieldProps<Record<string, unknown>>["formik"];
	mode: FormFieldMode;
	disabled?: boolean;
	expanded: Record<string, boolean>;
	onToggleExpand: (layerId: string, open: boolean) => void;
	onDeleteAt: (index: number) => void;
	onPatchAt: (
		index: number,
		patcher: (scene: PromptSceneLayerForm) => PromptSceneLayerForm,
	) => void;
	onDragStartAt: (index: number, e: DragEvent<HTMLLIElement>) => void;
	onDropAt: (index: number, e: DragEvent<HTMLLIElement>) => void;
	onAdd: () => void;
};

export const PromptSceneListPanel: FC<PromptSceneListPanelProps> =
	function PromptSceneListPanel({
		// list 是当前场景卡数组，用于渲染列表与空态
		list,
		// name 是父级 Formik 路径，用于转给单卡嵌套字段
		name,
		// formik 是注入实例，用于转给单卡时段字段
		formik,
		// mode 是 add|edit|watch，用于子字段交互
		mode,
		// disabled 表示强制禁用，用于锁定列表操作
		disabled,
		// expanded 是各卡折叠态，用于默认展开首卡
		expanded,
		// onToggleExpand 切换折叠，用于展开或收起
		onToggleExpand,
		// onDeleteAt 按索引删除，用于移除场景卡
		onDeleteAt,
		// onPatchAt 按索引补丁，用于字段写回
		onPatchAt,
		// onDragStartAt 开始拖拽，用于排序
		onDragStartAt,
		// onDropAt 完成放置，用于排序写回
		onDropAt,
		// onAdd 追加空卡，用于新增场景
		onAdd,
	}) {
		return (
			<>
				<ul className={styles.list}>
					{list.map((scene, index) => {
						const open = expanded[scene.layerId] ?? index === 0;
						return (
							// 引用了PromptSceneCard组件，用于单卡拖拽排序与字段编辑
							<PromptSceneCard
								key={scene.layerId}
								scene={scene}
								index={index}
								open={open}
								name={name}
								formik={formik}
								mode={mode}
								disabled={disabled}
								onToggleExpand={() => onToggleExpand(scene.layerId, open)}
								onDelete={() => onDeleteAt(index)}
								onPatch={(patcher) => onPatchAt(index, patcher)}
								onDragStart={(e) => onDragStartAt(index, e)}
								onDragOver={(e) => {
									e.preventDefault();
								}}
								onDrop={(e) => onDropAt(index, e)}
							/>
						);
					})}
				</ul>
				{/* 引用了Button组件，用于追加场景卡 */}
				<Button
					type="button"
					size="small"
					variant="outlined"
					disabled={disabled}
					onClick={onAdd}
				>
					添加场景卡
				</Button>
			</>
		);
	};
