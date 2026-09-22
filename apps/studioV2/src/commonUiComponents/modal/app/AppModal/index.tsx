/**
	* 统一 Dialog 壳：标题 / 说明 / 内容 / 动作区。
	* 不承载表单或业务编排；表单弹层见 FormModal。
	*/
"use client";

import type { FC, SyntheticEvent } from "react";
import {
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Typography,
} from "@mui/material";
import type { AppModalProps } from "../../shared/modalTypes";
import styles from "./index.module.scss";

export const AppModal: FC<AppModalProps> = function (props) {
	const {
		open,
		title,
		onClose,
		children,
		actions,
		description,
		maxWidth = "sm",
		busy = false,
	} = props;

	function handleDialogClose(
		_event: SyntheticEvent | Event,
		_reason: "backdropClick" | "escapeKeyDown",
	): void {
		if (busy) return;
		onClose();
	}

	return (
		// 引用了Dialog组件，用于统一弹层壳
		<Dialog
			open={open}
			onClose={handleDialogClose}
			fullWidth
			maxWidth={maxWidth}
			disableEscapeKeyDown={busy}
			className={styles.dialog}
			aria-labelledby="app-modal-title"
		>
			{/* 引用了DialogTitle组件，用于弹层标题 */}
			<DialogTitle id="app-modal-title" className={styles.title}>
				{title}
			</DialogTitle>
			{/* 引用了DialogContent组件，用于说明与内容区 */}
			<DialogContent className={styles.content} dividers>
				{description ? (
					// 引用了Typography组件，用于弹层说明文案
					<Typography component="p" className={styles.description}>
						{description}
					</Typography>
				) : null}
				{children}
			</DialogContent>
			{actions ? (
				// 引用了DialogActions组件，用于底部动作区
				<DialogActions className={styles.actions}>{actions}</DialogActions>
			) : null}
		</Dialog>
	);
};
