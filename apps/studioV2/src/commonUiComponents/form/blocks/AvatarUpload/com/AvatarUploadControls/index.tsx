/**
	* 头像控件区：assetId 提示、选图按钮、缺失/失败 Alert。
	*/
"use client";

import type { ChangeEvent, FC } from "react";
import { Alert, Button, CircularProgress, Typography } from "@mui/material";
import styles from "../../index.module.scss";

export type AvatarUploadControlsProps = {
	/** 已绑定资源 id */
	assetId: string;
	/** 预览是否加载失败（资源缺失提示） */
	previewFailed: boolean;
	/** 是否禁用选图 */
	disabled: boolean;
	/** 是否正在上传 */
	uploading: boolean;
	/** 上传失败文案 */
	uploadError: string | undefined;
	/** 选图 change */
	onFilePick: (e: ChangeEvent<HTMLInputElement>) => void;
};

export const AvatarUploadControls: FC<AvatarUploadControlsProps> =
	function AvatarUploadControls({
		// assetId 用于只读回显与缺失判定
		assetId,
		// previewFailed 表示缩略图破图，用于警告
		previewFailed,
		// disabled 表示不可选图
		disabled,
		// uploading 表示直传中，用于按钮文案
		uploading,
		// uploadError 是上传失败人话，用于 Alert
		uploadError,
		// onFilePick 用于触发本地选图直传
		onFilePick,
	}) {
		const trimmedId = assetId.trim();

		return (
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
		);
	};
