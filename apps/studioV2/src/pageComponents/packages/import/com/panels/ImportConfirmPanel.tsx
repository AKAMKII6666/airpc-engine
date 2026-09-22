/**
	* 导入确认写盘步骤。
	*/
"use client";

import type { FC } from "react";
import {
	Alert,
	Button,
	FormControlLabel,
	Radio,
	RadioGroup,
	Typography,
} from "@mui/material";
import styles from "../ImportPackageView.module.scss";

type ConfirmProps = {
	busy: boolean;
	commitError: string | undefined;
	onBack: () => void;
	onConfirm: () => void;
};

export const ImportConfirmPanel: FC<ConfirmProps> = function ({
	// busy 写盘进行中
	busy,
	// commitError 写盘失败人话
	commitError,
	// onBack 返回预检
	onBack,
	// onConfirm 确认写盘
	onConfirm,
}) {
	return (
		<section className={styles.panel}>
			{/* 引用了Typography组件，用于确认步标题 */}
			<Typography variant="subtitle1" className={styles.panelHeading}>
				确认导入
			</Typography>
			<p className={styles.metaLine}>
				将写入 data/storis-packages；同名包会被拒绝（不覆盖）。
			</p>
			{/* 引用了RadioGroup组件，用于导入模式（v1 仅 as_new） */}
			<RadioGroup value="as_new" name="import-mode">
				{/* 引用了FormControlLabel组件，用于「导入为新故事包」选项 */}
				<FormControlLabel
					value="as_new"
					control={
						// 引用了Radio组件，用于导入模式单选
						<Radio />
					}
					label="导入为新故事包"
				/>
			</RadioGroup>
			{commitError ? (
				// 引用了Alert组件，用于写盘失败提示
				<Alert severity="error" sx={{ mt: 1 }}>
					{commitError}
				</Alert>
			) : null}
			<div className={styles.footer}>
				{/* 引用了Button组件，用于返回预检 */}
				<Button variant="text" onClick={onBack} disabled={busy}>
					返回预检
				</Button>
				{/* 引用了Button组件，用于确认写盘 */}
				<Button variant="contained" onClick={onConfirm} disabled={busy}>
					{busy ? "写入中…" : "确认导入"}
				</Button>
			</div>
		</section>
	);
};
