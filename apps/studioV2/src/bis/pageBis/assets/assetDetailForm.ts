/**
	* 资源详情 Formik 契约：只编辑资源名 / 备注。
	* 引用 / assetId 只读；写盘走 save/saveAsset_bis。AutoForm items[] 主编排。
	*/
import type { FormikErrors } from "formik";
import type { AutoFormItem } from "@studio-v2/src/commonUiComponents/form/autoFormTypes";
import type { AssetSummary } from "@studio-v2/typeFiles/library/assets/assetSummary";

/**
	* 详情编辑 values；扁平字段名与 AutoForm name 对齐。
	* measureValueText 用字符串避免 number 空值与 TextField 冲突。
	*/
export type AssetDetailFormValues = {
	displayName: string;
	note: string;
} & Record<string, unknown>;

/** 基本信息：资源名 / 备注。 */
export const ASSET_BASIC_ITEMS: AutoFormItem[] = [
	{
		name: "displayName",
		label: "资源名",
		comType: "TextField",
		required: true,
	},
	{
		name: "note",
		label: "备注",
		comType: "AutoTextArea",
		minRows: 2,
	},
];

/**
	* 将资源投影扁平化为详情 Formik values。
	*/
export function toAssetDetailFormValues(
	asset: AssetSummary,
): AssetDetailFormValues {
	return {
		displayName: asset.displayName,
		note: asset.note,
	};
}

/**
	* 轻量校验：资源名必填。
	*/
export function validateAssetDetailForm(
	values: AssetDetailFormValues,
): FormikErrors<AssetDetailFormValues> {
	const errors: FormikErrors<AssetDetailFormValues> = {};
	if (values.displayName.trim().length === 0) {
		errors.displayName = "请填写资源名";
	}
	return errors;
}

/**
	* 将详情表单合并回既有资源投影（保留引用与 assetId）。
	* 纯投影合并，供单测；写盘请用 commitSaveAssetDetail。
	*/
export function applyAssetDetailForm(
	previous: AssetSummary,
	values: AssetDetailFormValues,
): AssetSummary {
	return {
		...previous,
		displayName: values.displayName.trim(),
		note: values.note.trim(),
		lastEditedAt: new Date().toISOString(),
	};
}
