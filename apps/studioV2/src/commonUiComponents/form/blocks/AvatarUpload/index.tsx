/**
	* 头像资源选择块：点击选择（本步会话内写入 assetId 字符串，不真上传）。
	* 供 AutoForm ComsMap AvatarUpload；落盘 meta.avatarAssetId。
	*/
"use client";

import type { ChangeEvent, FC } from "react";
import { Button, TextField } from "@mui/material";
import { FormFieldShell } from "../../FormFieldShell";
import type { FormBoundFieldProps } from "../../fields/types/formBoundTypes";
import {
	readFormikFieldError,
	resolveBoundDisplayString,
} from "../../fields/formBoundFieldProps";
import styles from "./index.module.scss";

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
}) {
	const errorMsg = readFormikFieldError(formik, name);
	const valueStr = resolveBoundDisplayString(formik, name, valueOverride);

	function writeValue(next: string): void {
		if (onChangeOverride) {
			onChangeOverride(next);
			return;
		}
		void formik.setFieldValue(name, next);
		void formik.setFieldTouched(name, true);
	}

	function handleFilePick(e: ChangeEvent<HTMLInputElement>): void {
		const file = e.target.files?.[0];
		if (!file) return;
		// 本步不真上传：用文件名派生会话内 assetId，待资源库批接真实上传
		const stem = file.name.replace(/\.[^.]+$/, "").replace(/\s+/g, "_");
		writeValue(`asset_avatar_${stem || "upload"}`);
		e.target.value = "";
	}

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
			<div className={styles.row}>
				<span className={styles.preview} aria-hidden>
					{valueStr ? valueStr.slice(0, 1).toUpperCase() : "?"}
				</span>
				<div className={styles.controls}>
					{/* 引用了TextField组件，用于手填或回读 avatarAssetId */}
					<TextField
						name={name}
						value={valueStr}
						onChange={(e) => writeValue(e.target.value)}
						onBlur={() => {
							void formik.setFieldTouched(name, true);
						}}
						size="small"
						fullWidth
						disabled={disabled}
						placeholder="资源 id，如 asset_avatar_lanxing"
						inputProps={{ "aria-label": label }}
					/>
					<label className={styles.fileLabel}>
						<input
							type="file"
							accept="image/*"
							disabled={disabled}
							className={styles.fileInput}
							onChange={handleFilePick}
							aria-label="选择头像文件"
						/>
						{/* 引用了Button组件，用于触发本地文件选择 */}
						<Button
							component="span"
							variant="outlined"
							size="small"
							disabled={disabled}
						>
							选择图片
						</Button>
					</label>
				</div>
			</div>
		</FormFieldShell>
	);
};
