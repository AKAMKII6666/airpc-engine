/**
	* 头像预览缩略图：远程/blob 图；加载失败回落字母占位。
	*/
"use client";

import type { FC } from "react";
import styles from "../../index.module.scss";

export type AvatarUploadPreviewProps = {
	/** 已绑定 assetId；空则占位为 ? */
	assetId: string;
	/** 预览图 URL；空则不渲染 img */
	previewSrc: string | null;
	/** 父级托管的破图态 */
	previewFailed: boolean;
	/** img onError 时通知父级 */
	onPreviewError: () => void;
};

export const AvatarUploadPreview: FC<AvatarUploadPreviewProps> =
	function AvatarUploadPreview({
		// assetId 用于字母占位首字符
		assetId,
		// previewSrc 用于缩略图地址
		previewSrc,
		// previewFailed 表示破图，用于回落占位
		previewFailed,
		// onPreviewError 用于同步破图态给父级
		onPreviewError,
	}) {
		const trimmedId = assetId.trim();
		const initial =
			trimmedId.length > 0 ? trimmedId.slice(0, 1).toUpperCase() : "?";
		const showImg = Boolean(previewSrc) && !previewFailed;

		return (
			<span className={styles.preview} aria-hidden>
				{showImg ? (
					<img
						src={previewSrc!}
						alt=""
						className={styles.previewImg}
						onError={onPreviewError}
					/>
				) : (
					<span>{initial}</span>
				)}
			</span>
		);
	};
