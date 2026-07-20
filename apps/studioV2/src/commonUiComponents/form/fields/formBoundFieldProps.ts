/**
	* Formik 字段绑定的共享读取：从 values/errors/touched 取出展示用字符串。
	* 用 getIn 支持嵌套 name（如 identity.fullName），供 AutoForm 与字段控件共用。
	* 另提供 comProps 逃生解析：value/onChange/checked 覆盖优先于 Formik 自动绑。
	*/
import type { ChangeEvent } from "react";
import type { FormikProps } from "formik";
import { getIn } from "formik";

/** 仅在 touched 且 error 为 string 时返回文案；否则 undefined（不展示错误区） */
export function readFormikFieldError(
	formik: FormikProps<Record<string, unknown>>,
	name: string,
): string | undefined {
	const touched = Boolean(getIn(formik.touched, name));
	if (!touched) return undefined;
	const err = getIn(formik.errors, name);
	return typeof err === "string" ? err : undefined;
}

/** 将 Formik 值投影为 watch/控件可用的字符串；null/undefined → 空串 */
export function readFormikFieldString(
	formik: FormikProps<Record<string, unknown>>,
	name: string,
): string {
	const raw = getIn(formik.values, name);
	if (raw === undefined || raw === null) return "";
	return String(raw);
}

/** 读取嵌套路径上的原始值（Checkbox / Integer 等非字符串控件） */
export function readFormikFieldRaw(
	formik: FormikProps<Record<string, unknown>>,
	name: string,
): unknown {
	return getIn(formik.values, name);
}

/**
	* 展示值：comProps.value 已传则用之，否则读 Formik 字符串。
	* undefined 表示「未覆盖」；null 投影为空串。
	*/
export function resolveBoundDisplayString(
	formik: FormikProps<Record<string, unknown>>,
	name: string,
	valueOverride: unknown,
): string {
	if (valueOverride !== undefined) {
		if (valueOverride === null) return "";
		return String(valueOverride);
	}
	return readFormikFieldString(formik, name);
}

/**
	* 字符串控件 onChange：comProps.onChange 优先；否则写回 Formik 字符串。
	*/
export function resolveBoundStringChangeHandler(
	formik: FormikProps<Record<string, unknown>>,
	name: string,
	onChangeOverride?: (...args: unknown[]) => void,
): (
	e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
) => void {
	if (onChangeOverride) {
		return (e) => {
			onChangeOverride(e);
		};
	}
	return (e) => {
		void formik.setFieldValue(name, e.target.value);
	};
}

/**
	* Checkbox checked：comProps.checked 优先；否则读 Formik boolean。
	*/
export function resolveBoundChecked(
	formik: FormikProps<Record<string, unknown>>,
	name: string,
	checkedOverride: boolean | undefined,
): boolean {
	if (checkedOverride !== undefined) return checkedOverride;
	return Boolean(readFormikFieldRaw(formik, name));
}

/**
	* Checkbox onChange：comProps.onChange 优先；否则写回 Formik boolean。
	*/
export function resolveBoundCheckedChangeHandler(
	formik: FormikProps<Record<string, unknown>>,
	name: string,
	onChangeOverride?: (...args: unknown[]) => void,
): (e: ChangeEvent<HTMLInputElement>, checked: boolean) => void {
	if (onChangeOverride) {
		return (e, checked) => {
			onChangeOverride(e, checked);
		};
	}
	return (_e, checked) => {
		void formik.setFieldValue(name, checked);
	};
}
