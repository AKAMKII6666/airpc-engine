/**
	* 头像直传控件区：预览、只读 assetId、选图按钮、错误提示。
	* 远程图加载失败时回落字母占位，避免破图图标。
	*/
"use client";

import { useEffect, useState, type ChangeEvent, type FC } from "react";
import { Alert, Button, CircularProgress, Typography } from "@mui/material";
import styles from "../../index.module.scss";

export type AvatarUploadBodyProps = {
	/** 当前表单 avatarAssetId；空表示未绑定 */
	assetId: string;
	/** 预览图 URL（blob 或 /api/assets/.../file） */
	previewSrc: string | null;
	/** 是否禁用选图（含上传中） */
	disabled: boolean;
	/** 是否正在上传 */
	uploading: boolean;
	/** 上传失败文案 */
	uploadError: string | undefined;
	/** 选图 change */
	onFilePick: (e: ChangeEvent<HTMLInputElement>) => void;
};

/** 同源头像预览路径；与 /api/assets/[assetId]/file 对齐 */
export function avatarPreviewUrl(assetId: string): string {
	return `/api/assets/${encodeURIComponent(assetId)}/file`;
}

export const AvatarUploadBody: FC<AvatarUploadBodyProps> =
	function AvatarUploadBody({
		// assetId 是已绑定资源 id，用于只读回显
		assetId,
		// previewSrc 是预览图地址，用于缩略图展示
		previewSrc,
		// disabled 表示不可选图，用于禁用态
		disabled,
		// uploading 表示直传进行中，用于按钮文案
		uploading,
		// uploadError 是上传失败人话，用于 Alert
		uploadError,
		// onFilePick 是文件 input change，用于触发直传
		onFilePick,
	}) {
		const [previewFailed, setPreviewFailed] = useState(false);

		useEffect(
			function resetPreviewFailedOnSrcChange() {
				setPreviewFailed(false);
			},
			[previewSrc],
		);

		const trimmedId = assetId.trim();
		const initial =
			trimmedId.length > 0 ? trimmedId.slice(0, 1).toUpperCase() : "?";
		const showImg = Boolean(previewSrc) && !previewFailed;

		return (
			<div className={styles.row}>
				<span className={styles.preview} aria-hidden>
					{showImg ? (
						<img
							src={previewSrc!}
							alt=""
							className={styles.previewImg}
							onError={function () {
								setPreviewFailed(true);
							}}
						/>
					) : (
						<span>{initial}</span>
					)}
				</span>
				<div className={styles.controls}>
					{trimmedId.length > 0 ? (
						// 引用了Typography组件，用于只读回显系统 assetId（非手填主路径）
						<Typography
							variant="caption"
							color="text.secondary"
							className={styles.assetIdHint}
						>
							已绑定资源：{trimmedId}
						</Typography>
					) : (
						// 引用了Typography组件，用于空态提示直传
						<Typography variant="body2" color="text.secondary">
							尚未上传头像
						</Typography>
					)}
					{previewFailed && trimmedId.length > 0 ? (
						// 引用了Alert组件，用于资源文件缺失提示
						<Alert severity="warning" role="status">
							头像文件读不到（可能未保存角色，或资源已删）。请重新上传后点「保存」。
						</Alert>
					) : null}
					<label className={styles.fileLabel}>
						<input
							type="file"
							accept="image/png,image/jpeg,image/webp"
							disabled={disabled}
							className={styles.fileInput}
							onChange={onFilePick}
							aria-label="上传头像图片"
						/>
						{/* 引用了Button组件，用于触发本地文件选择并直传 */}
						<Button
							component="span"
							variant="outlined"
							size="small"
							disabled={disabled}
							startIcon={
								uploading ? (
									// 引用了CircularProgress组件，用于上传中反馈
									<CircularProgress size={14} color="inherit" />
								) : undefined
							}
						>
							{uploading ? "上传中…" : "上传头像"}
						</Button>
					</label>
					{uploadError ? (
						// 引用了Alert组件，用于展示上传失败人话
						<Alert severity="error" role="alert">
							{uploadError}
						</Alert>
					) : null}
				</div>
			</div>
		);
	};
