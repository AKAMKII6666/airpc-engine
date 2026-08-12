/**
	* 资源上传弹层：只选文件；assetId / 类型 / 格式由系统生成。
	*/
"use client";

import type { ChangeEvent, FC } from "react";
import { useState } from "react";
import { Alert, Button, Typography } from "@mui/material";
import { AppModal } from "@studio-v2/src/commonUiComponents/modal/app/AppModal";

type Props = {
	open: boolean;
	onClose: () => void;
	onUpload: (file: File) => Promise<void>;
};

function fileText(file: File | null): string {
	if (!file) return "尚未选择文件";
	const sizeKb = Math.max(1, Math.round(file.size / 1024));
	return `${file.name} · ${sizeKb} KB`;
}

export const AssetUploadModal: FC<Props> = function AssetUploadModal({
	// open 表示上传弹层显示状态，用于控制 AppModal
	open,
	// onClose 是关闭上传弹层回调，用于取消或成功后收起
	onClose,
	// onUpload 是文件提交回调，用于经 API 写入资源库
	onUpload,
}) {
	const [file, setFile] = useState<File | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | undefined>();

	function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
		setError(undefined);
		setFile(event.target.files?.[0] ?? null);
	}

	async function handleUpload(): Promise<void> {
		if (!file || busy) return;
		setBusy(true);
		setError(undefined);
		try {
			await onUpload(file);
			setFile(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "上传失败");
		} finally {
			setBusy(false);
		}
	}

	function handleClose(): void {
		if (busy) return;
		setFile(null);
		setError(undefined);
		onClose();
	}

	return (
		// 引用了AppModal组件，用于承载资源上传表单
		<AppModal
			open={open}
			title="上传资源"
			description="选择文件后，系统会自动生成 assetId、文件路径、类型与格式。"
			onClose={handleClose}
			busy={busy}
			actions={
				<>
					{/* 引用了Button组件，用于取消上传 */}
					<Button color="inherit" disabled={busy} onClick={handleClose}>
						取消
					</Button>
					{/* 引用了Button组件，用于提交上传 */}
					<Button
						variant="contained"
						disabled={!file || busy}
						onClick={() => {
							void handleUpload();
						}}
					>
						上传
					</Button>
				</>
			}
		>
			{error ? (
				// 引用了Alert组件，用于展示上传错误
				<Alert severity="error" role="alert">
					{error}
				</Alert>
			) : null}
			{/* 引用了Button组件，用于选择本地文件 */}
			<Button variant="outlined" component="label" disabled={busy}>
				选择文件
				<input hidden type="file" onChange={handleFileChange} />
			</Button>
			{/* 引用了Typography组件，用于展示已选文件名与大小 */}
			<Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
				{fileText(file)}
			</Typography>
		</AppModal>
	);
};
