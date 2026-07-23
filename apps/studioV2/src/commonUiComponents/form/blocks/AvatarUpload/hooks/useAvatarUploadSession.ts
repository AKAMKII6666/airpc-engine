/**
	* 头像直传会话态：本地预览 URL、上传中、错误与选文件处理。
	*/
"use client";

import { useEffect, useState, type ChangeEvent } from "react";

export type AvatarUploadSession = {
	/** 本地 blob 预览；上传成功后仍可保留至下次选图 */
	localPreviewUrl: string | null;
	/** 是否正在请求 /api/assets/upload */
	uploading: boolean;
	/** 上传失败人话；成功时清空 */
	uploadError: string | undefined;
	/** 选图入口；写入 assetId 由 onUploaded 回调 */
	handleFilePick: (e: ChangeEvent<HTMLInputElement>) => void;
};

/**
	* 管理头像选图 → 直传 → 写回 assetId 的瞬时状态。
	*/
export function useAvatarUploadSession(opts: {
	/** bis 注入的直传；未注入时选图会报编排错误 */
	uploadFile: ((file: File) => Promise<string>) | undefined;
	/** 直传成功后写回 Formik avatarAssetId */
	onUploaded: (assetId: string) => void;
}): AvatarUploadSession {
	const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
	const [uploading, setUploading] = useState(false);
	const [uploadError, setUploadError] = useState<string | undefined>();

	useEffect(
		function revokePreviewOnChange() {
			return function cleanup() {
				if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
			};
		},
		[localPreviewUrl],
	);

	function handleFilePick(e: ChangeEvent<HTMLInputElement>): void {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;
		if (!opts.uploadFile) {
			setUploadError("未配置头像上传；请联系维护者检查表单编排");
			return;
		}
		if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
		setLocalPreviewUrl(URL.createObjectURL(file));
		setUploadError(undefined);
		setUploading(true);
		void opts
			.uploadFile(file)
			.then(function onOk(assetId) {
				opts.onUploaded(assetId);
			})
			.catch(function onFail(err: unknown) {
				setUploadError(
					err instanceof Error ? err.message : "头像上传失败，请重试",
				);
			})
			.finally(function onDone() {
				setUploading(false);
			});
	}

	return {
		localPreviewUrl,
		uploading,
		uploadError,
		handleFilePick,
	};
}
