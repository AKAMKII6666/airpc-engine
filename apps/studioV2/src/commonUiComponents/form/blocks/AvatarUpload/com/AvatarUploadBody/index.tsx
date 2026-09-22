/**
	* 头像直传控件区：预览 + 选图；远程图失败回落字母占位。
	*/
"use client";

import { useEffect, useState, type ChangeEvent, type FC } from "react";
// 引用了AvatarUploadPreview组件，用于缩略图/占位
import { AvatarUploadPreview } from "../AvatarUploadPreview";
// 引用了AvatarUploadControls组件，用于选图与错误提示
import { AvatarUploadControls } from "../AvatarUploadControls";
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

		return (
			<div className={styles.row}>
				{/* 引用了AvatarUploadPreview组件，用于缩略图/占位 */}
				<AvatarUploadPreview
					assetId={assetId}
					previewSrc={previewSrc}
					previewFailed={previewFailed}
					onPreviewError={function () {
						setPreviewFailed(true);
					}}
				/>
				{/* 引用了AvatarUploadControls组件，用于选图与错误提示 */}
				<AvatarUploadControls
					assetId={assetId}
					previewFailed={previewFailed}
					disabled={disabled}
					uploading={uploading}
					uploadError={uploadError}
					onFilePick={onFilePick}
				/>
			</div>
		);
	};
