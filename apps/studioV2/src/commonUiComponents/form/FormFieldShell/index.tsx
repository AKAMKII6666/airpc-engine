/**
	* 表单项外壳：label + 控件区 + 辅助/错误文案。
	* mode=watch 时不渲染可编辑 children，改为只读投影（对标 mithril formComponentsContainer）。
	*/
"use client";

import type { FC } from "react";
import { Typography } from "@mui/material";
import type { FormFieldShellProps } from "../types/formTypes";
import styles from "./index.module.scss";

export const FormFieldShell: FC<FormFieldShellProps> = function (props) {
	const {
		label,
		mode,
		required = false,
		error,
		helperText,
		watchText,
		children,
	} = props;

	const isWatch = mode === "watch";

	return (
		<div className={styles.shell}>
			<div className={styles.labelRow}>
				{/* 引用了Typography组件，用于页面展示与交互 */}
				<Typography component="span" className={styles.label}>
					{label}
				</Typography>
				{required ? (
					// 引用了Typography组件，用于必填星号
					<Typography component="span" className={styles.required} aria-hidden>
						*
					</Typography>
				) : null}
			</div>

			{isWatch ? (
				<div className={styles.watchValue}>
					{watchText !== undefined && watchText !== "" ? watchText : "—"}
				</div>
			) : (
				children
			)}

			{error ? (
				// 引用了Typography组件，用于校验错误文案
				<Typography component="p" className={styles.error} role="alert">
					{error}
				</Typography>
			) : helperText ? (
				// 引用了Typography组件，用于辅助说明文案
				<Typography component="p" className={styles.helper}>
					{helperText}
				</Typography>
			) : null}
		</div>
	);
};
