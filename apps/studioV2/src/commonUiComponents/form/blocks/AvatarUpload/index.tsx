/**
	* 头像直传块：选图 → uploadFile 落盘全局 assets → 写回 avatarAssetId。
	* 禁止 assetId 手填主路径；id 只读展示。
	*/
"use client";

import type { FC } from "react";
import { FormFieldShell } from "../../FormFieldShell";
import type { FormBoundFieldProps } from "../../fields/types/formBoundTypes";
import {
	readFormikFieldError,
	resolveBoundDisplayString,
} from "../../fields/formBoundFieldProps";
// 引用了AvatarUploadBody组件，用于预览与选图控件
import {
	AvatarUploadBody,
	avatarPreviewUrl,
} from "./com/AvatarUploadBody";
import { useAvatarUploadSession } from "./hooks/useAvatarUploadSession";

export const FormAvatarUpload: FC<
	FormBoundFieldProps<Record<string, unknown>>
> = function FormAvatarUpload({
	// name 是 Formik 路径，用于写回 avatarAssetId
	name,
	// label 是字段壳标签，用于中文展示
	label,
	// formik 是调用方注入实例，用于取值与写回
	formik,
	// mode 是交互模式，用于 add|edit|watch
	mode,
	// required 表示是否展示必填星号，用于壳层标记
	required,
	// disabled 表示强制禁用，用于不可改字段
	disabled,
	// helperText 是辅助说明，用于非校验提示
	helperText,
	// value 是 comProps 逃生展示值，用于覆盖 Formik 自动绑
	value: valueOverride,
	// onChange 是 comProps 逃生写回，用于覆盖 setFieldValue
	onChange: onChangeOverride,
	// uploadFile 是直传回调，用于选图后落盘并返回 assetId
	uploadFile,
}) {
	const errorMsg = readFormikFieldError(formik, name);
	const valueStr = resolveBoundDisplayString(formik, name, valueOverride);

	const session = useAvatarUploadSession({
		uploadFile,
		onUploaded: function onUploaded(assetId) {
			if (onChangeOverride) {
				onChangeOverride(assetId);
				return;
			}
			void formik.setFieldValue(name, assetId);
			void formik.setFieldTouched(name, true);
		},
	});

	const remotePreview =
		valueStr.trim().length > 0 ? avatarPreviewUrl(valueStr.trim()) : null;
	const previewSrc = session.localPreviewUrl ?? remotePreview;
	const pickDisabled = Boolean(disabled || session.uploading || !uploadFile);

	return (
		// 引用了FormFieldShell组件，用于统一 label/必填星/错误/watch 外壳
		<FormFieldShell
			label={label}
			mode={mode}
			required={required}
			error={errorMsg}
			helperText={helperText}
			watchText={valueStr || "默认头像"}
		>
			{/* 引用了AvatarUploadBody组件，用于预览与上传控件 */}
			<AvatarUploadBody
				assetId={valueStr}
				previewSrc={previewSrc}
				disabled={pickDisabled}
				uploading={session.uploading}
				uploadError={session.uploadError}
				onFilePick={session.handleFilePick}
			/>
		</FormFieldShell>
	);
};
