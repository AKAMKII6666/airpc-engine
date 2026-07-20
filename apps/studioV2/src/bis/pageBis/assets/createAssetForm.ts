/**
	* 新建资源元数据表单契约（导向稿 05 §8）。
	* 名称 / 类型 / 备注；assetId 系统生成，不写盘、不真上传。
	*/
import type { FormikErrors } from "formik";
import type { AutoFormItem } from "@studio-v2/src/commonUiComponents/form/autoFormTypes";
import type {
	AssetKind,
	AssetSummary,
} from "@studio-v2/typeFiles/library/assets/assetSummary";
import { createStudioId } from "@studio-v2/typeFiles/ids/createStudioId";

/**
	* Formik values；交叉 Record 以满足 FormModal TValues 约束。
	*/
export type CreateAssetFormValues = {
	displayName: string;
	/** AssetKind 字符串；与 select options 对齐 */
	kind: AssetKind;
	note: string;
} & Record<string, unknown>;

/**
	* 新建资源 FormModal 初始值；kind 默认 wav。
	* 仅会话态 Formik，不写盘。
	*/
export const CREATE_ASSET_INITIAL_VALUES: CreateAssetFormValues = {
	displayName: "",
	kind: "wav",
	note: "",
};

/**
	* 新建资源 AutoForm items：显示名 / 类型 / 备注。
	*/
export const CREATE_ASSET_FORM_ITEMS: AutoFormItem[] = [
	{
		name: "displayName",
		label: "资源名",
		comType: "TextField",
		required: true,
		placeholder: "例如：开场提示音",
	},
	{
		name: "kind",
		label: "资源类型",
		comType: "Select",
		required: true,
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
		placeholder: "用途说明（可选）",
	},
];

/**
	* 轻量校验：资源名必填；类型有默认值，备注可选。
	*/
export function validateCreateAssetForm(
	values: CreateAssetFormValues,
): FormikErrors<CreateAssetFormValues> {
	const errors: FormikErrors<CreateAssetFormValues> = {};
	if (values.displayName.trim().length === 0) {
		errors.displayName = "请填写资源名";
	}
	return errors;
}

/** 按类型给出新建时的默认格式与度量单位（静态投影，非真实探测）。 */
function defaultMeasureForKind(kind: AssetKind): {
	format: string;
	measureValue: number | null;
	measureUnit: AssetSummary["measureUnit"];
} {
	if (kind === "wav" || kind === "bgm") {
		return {
			format: kind === "wav" ? "wav" : "mp3",
			measureValue: null,
			measureUnit: "duration_ms",
		};
	}
	if (kind === "image") {
		return { format: "webp", measureValue: null, measureUnit: "size_bytes" };
	}
	if (kind === "text") {
		return { format: "md", measureValue: null, measureUnit: "size_bytes" };
	}
	return { format: "", measureValue: null, measureUnit: "none" };
}

/**
	* 由表单值生成会话内资源投影；assetId 系统生成。
	* 可用性默认 unchecked（未真上传文件）。
	*/
export function buildMockAssetFromForm(
	values: CreateAssetFormValues,
): AssetSummary {
	const displayName = values.displayName.trim();
	const measure = defaultMeasureForKind(values.kind);
	return {
		assetId: createStudioId("asset", displayName),
		displayName,
		kind: values.kind,
		format: measure.format,
		measureValue: measure.measureValue,
		measureUnit: measure.measureUnit,
		refCount: 0,
		lastEditedAt: new Date().toISOString(),
		availability: "unchecked",
		note: values.note.trim(),
		referenceLines: [],
	};
}
