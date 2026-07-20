/**
	* Formik 字段绑定 props（fields/types 真源）。
	* formik 由 FormModal / AutoForm 注入，字段组件不自建 Formik。
	* value / onChange / checked 来自 AutoForm comProps 逃生口，优先于 Formik 自动绑。
	*/
import type { FormikProps } from "formik";
import type { FormFieldMode } from "../../formTypes";

export type FormBoundFieldProps<TValues extends Record<string, unknown>> = {
	name: string;
	label: string;
	formik: FormikProps<TValues>;
	mode: FormFieldMode;
	required?: boolean;
	disabled?: boolean;
	placeholder?: string;
	helperText?: string;
	/**
		* comProps 逃生：覆盖自动绑展示值。
		* 未传（undefined）时读 Formik；传 null/其它则按字段投影展示。
		*/
	value?: unknown;
	/**
		* comProps 逃生：覆盖自动绑写回。
		* 签名宽松以兼容 TextField ChangeEvent 与 Checkbox ChangeEvent。
		*/
	onChange?: (...args: unknown[]) => void;
	/**
		* comProps 逃生（Checkbox）：覆盖 checked；未传则读 Formik boolean。
		*/
	checked?: boolean;
};
