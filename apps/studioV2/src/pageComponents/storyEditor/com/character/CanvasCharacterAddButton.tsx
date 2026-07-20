/**
	* 画布左侧「添加角色」入口；替代已删除的角色轨添加控件。
	*/
"use client";

import type { FC } from "react";
import { Button, Tooltip } from "@mui/material";
import styles from "./CanvasCharacterAddButton.module.scss";

export type CanvasCharacterAddButtonProps = {
	/** 打开角色库同款新建 FormModal */
	onAdd: () => void;
};

export const CanvasCharacterAddButton: FC<CanvasCharacterAddButtonProps> =
	function CanvasCharacterAddButton({
		// onAdd 打开新建角色弹层，用于落盘后挂画布锚点
		onAdd,
	}) {
		return (
			<div className={styles.wrap}>
				{/* 引用了Tooltip组件，用于说明添加入口 */}
				<Tooltip title="新建角色并挂到画布" placement="right">
					{/* 引用了Button组件，用于打开新建角色 FormModal */}
					<Button
						size="small"
						variant="outlined"
						className={styles.btn}
						onClick={onAdd}
						aria-label="添加角色到画布"
					>
						添加角色
					</Button>
				</Tooltip>
			</div>
		);
	};
