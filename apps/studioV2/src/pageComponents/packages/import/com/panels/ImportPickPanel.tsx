/**
	* 导入选文件步骤。
	*/
"use client";

import type { ChangeEvent, FC } from "react";
import { Alert, Button, CircularProgress } from "@mui/material";
import styles from "../ImportPackageView.module.scss";

type PickProps = {
	busy: boolean;
	pickError: string | undefined;
	onPickFile: (file: File) => void;
	onCancel: () => void;
};

export const ImportPickPanel: FC<PickProps> = function ({
	// busy 预检进行中，禁用选文件
	busy,
	// pickError 选文件/预检失败人话
	pickError,
	// onPickFile 用户选定 .storypack.json 后上交
	onPickFile,
	// onCancel 关闭导入流
	onCancel,
}) {
	function onInputChange(event: ChangeEvent<HTMLInputElement>): void {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (file) onPickFile(file);
	}

	return (
		<section className={styles.panel}>
			<p className={styles.metaLine}>
				选择本机导出的 .storypack.json（Studio 导出产物），先预检再写盘。
			</p>
			<label className={styles.dropzone}>
				<span className={styles.dropTitle}>
					{busy ? "正在预检…" : "选择交换文件"}
				</span>
				<span className={styles.dropHint}>
					.accept：.json / .storypack.json
				</span>
				<input
					type="file"
					accept=".json,.storypack.json,application/json"
					hidden
					disabled={busy}
					onChange={onInputChange}
				/>
			</label>
			{busy ? (
				// 引用了CircularProgress组件，用于预检进行中指示
				<CircularProgress size={24} />
			) : null}
			{pickError ? (
				// 引用了Alert组件，用于选文件/预检失败提示
				<Alert severity="error" sx={{ mt: 1 }}>
					{pickError}
				</Alert>
			) : null}
			<div className={styles.footer}>
				{/* 引用了Button组件，用于取消导入 */}
				<Button type="button" variant="text" onClick={onCancel} disabled={busy}>
					取消
				</Button>
			</div>
		</section>
	);
};
