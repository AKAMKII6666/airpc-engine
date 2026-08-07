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

export const AssetUploadModal: FC<Props> = function AssetUploadModal(props) {
	const { open, onClose, onUpload } = props;
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
		<AppModal
			open={open}
			title="上传资源"
			description="选择文件后，系统会自动生成 assetId、文件路径、类型与格式。"
			onClose={handleClose}
			busy={busy}
			actions={
				<>
					<Button color="inherit" disabled={busy} onClick={handleClose}>
						取消
					</Button>
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
				<Alert severity="error" role="alert">
					{error}
				</Alert>
			) : null}
			<Button variant="outlined" component="label" disabled={busy}>
				选择文件
				<input hidden type="file" onChange={handleFileChange} />
			</Button>
			<Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
				{fileText(file)}
			</Typography>
		</AppModal>
	);
};
