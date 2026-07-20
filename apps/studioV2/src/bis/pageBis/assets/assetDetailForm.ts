/**
	* 资源详情 Formik 契约：类型 / 备注 / 可用性 / 格式度量。
	* 引用 / assetId 只读；不写盘。AutoForm items[] 主编排。
	*/
import type { FormikErrors } from "formik";
import type { AutoFormItem } from "@studio-v2/src/commonUiComponents/form/autoFormTypes";
import type {
	AssetAvailability,
	AssetKind,
	AssetSummary,
} from "@studio-v2/typeFiles/library/assets/assetSummary";
import { updateMockAsset } from "@studio-v2/src/utils/ajaxProxy/library/mock/mockLibraryData";

/**
	* 详情编辑 values；扁平字段名与 AutoForm name 对齐。
	* measureValueText 用字符串避免 number 空值与 TextField 冲突。
	*/
export type AssetDetailFormValues = {
	displayName: string;
	kind: AssetKind;
	note: string;
	format: string;
	/** 度量数字的文本投影；空串表示 null */
	measureValueText: string;
	measureUnit: AssetSummary["measureUnit"];
	availability: AssetAvailability;
} & Record<string, unknown>;

/**
	* 基本信息：资源名 / 类型 / 备注。
	* 供详情页 AutoForm 分段渲染；不写盘。
	*/
export const ASSET_BASIC_ITEMS: AutoFormItem[] = [
	{
		name: "displayName",
		label: "资源名",
		comType: "TextField",
		required: true,
	},
	{
		name: "kind",
		label: "资源类型",
		comType: "Select",
		options: [
			{ label: "WAV 音频", value: "wav" },
			{ label: "背景音乐", value: "bgm" },
			{ label: "图片", value: "image" },
			{ label: "文本资料", value: "text" },
			{ label: "其它文件", value: "other" },
		],
	},
	{
		name: "note",
		label: "备注",
		comType: "AutoTextArea",
		minRows: 2,
	},
];

/**
	* 文件信息投影：格式 / 度量 / 可用性（静态阶段可改投影，非真探测）。
	*/
export const ASSET_FILE_ITEMS: AutoFormItem[] = [
	{
		name: "format",
		label: "格式",
		comType: "TextField",
		placeholder: "例如：wav / webp",
	},
	{
		name: "measureValueText",
		label: "度量数值",
		comType: "TextField",
		helperText: "时长填毫秒，大小填字节；空表示未知。",
	},
	{
		name: "measureUnit",
		label: "度量单位",
		comType: "Select",
		options: [
			{ label: "时长（毫秒）", value: "duration_ms" },
			{ label: "大小（字节）", value: "size_bytes" },
			{ label: "不适用", value: "none" },
		],
	},
	{
		name: "availability",
		label: "本地可用性",
		comType: "Select",
		options: [
			{ label: "文件就绪", value: "ready" },
			{ label: "文件缺失", value: "missing" },
			{ label: "未检测", value: "unchecked" },
		],
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
		kind: asset.kind,
		note: asset.note,
		format: asset.format,
		measureValueText:
			asset.measureValue == null ? "" : String(asset.measureValue),
		measureUnit: asset.measureUnit,
		availability: asset.availability,
	};
}

/**
	* 轻量校验：资源名必填；度量文本若非空须为非负整数。
	*/
export function validateAssetDetailForm(
	values: AssetDetailFormValues,
): FormikErrors<AssetDetailFormValues> {
	const errors: FormikErrors<AssetDetailFormValues> = {};
	if (values.displayName.trim().length === 0) {
		errors.displayName = "请填写资源名";
	}
	const raw = values.measureValueText.trim();
	if (raw.length > 0 && !/^\d+$/.test(raw)) {
		errors.measureValueText = "请填写非负整数，或留空";
	}
	return errors;
}

/**
	* 解析度量文本；空串 → null。
	*/
function parseMeasureValue(text: string): number | null {
	const raw = text.trim();
	if (raw.length === 0) return null;
	return Number(raw);
}

/**
	* 将详情表单合并回既有资源投影（保留引用与 assetId）。
	* lastEditedAt 刷新为当前时间；不写盘。
	*/
export function applyAssetDetailForm(
	previous: AssetSummary,
	values: AssetDetailFormValues,
): AssetSummary {
	return {
		...previous,
		displayName: values.displayName.trim(),
		kind: values.kind,
		note: values.note.trim(),
		format: values.format.trim(),
		measureValue: parseMeasureValue(values.measureValueText),
		measureUnit: values.measureUnit,
		availability: values.availability,
		lastEditedAt: new Date().toISOString(),
	};
}

/**
	* 会话内更新资源详情；找不到 assetId 时抛错供 Formik 错误区展示。
	*/
export function commitUpdateAssetMock(
	previous: AssetSummary,
	values: AssetDetailFormValues,
): AssetSummary {
	const next = applyAssetDetailForm(previous, values);
	const ok = updateMockAsset(previous.assetId, next);
	if (!ok) {
		throw new Error("未找到该资源，无法更新会话内 mock");
	}
	return next;
}
