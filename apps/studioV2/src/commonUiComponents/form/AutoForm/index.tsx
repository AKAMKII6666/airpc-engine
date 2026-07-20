/**
	* 声明式表单编排：items[] + ComsMap + 按 name 自动绑（含嵌套）+ comProps/children 双逃生口。
	* 不自建 Formik；样式为 Studio V2 MUI + scss，禁止引入 Mithril。
	*/
"use client";

import {
	cloneElement,
	isValidElement,
	type ReactElement,
} from "react";
import type { FormikProps } from "formik";
import { getIn } from "formik";
import { FormFieldShell } from "../FormFieldShell";
import type { AutoFormItem, AutoFormProps } from "../autoFormTypes";
import { AutoFormComsMap, type AutoFormMappedFieldProps } from "./comsMap";
import styles from "./index.module.scss";

/**
	* 自动绑与 comProps 合并：后者覆盖同名键（逃生口语义）。
	* 不深合并对象，避免把局部覆盖误当成嵌套 patch。
	*/
export function mergeAutoBindWithComProps(
	autoBind: Record<string, unknown>,
	comProps?: Record<string, unknown>,
): Record<string, unknown> {
	if (!comProps) return autoBind;
	return { ...autoBind, ...comProps };
}

/**
	* 从 Formik 按嵌套 name 生成基础绑定；供 children 逃生口 cloneElement。
	* comType 路径由字段组件默认读 Formik；comProps.value/onChange/checked 经 merge 传入后覆盖自动绑。
	*/
export function buildNestedAutoBindProps(
	formik: FormikProps<Record<string, unknown>>,
	name: string,
	disabled: boolean,
): Record<string, unknown> {
	const value = getIn(formik.values, name);
	return {
		name,
		value: value === undefined || value === null ? "" : value,
		disabled,
		onChange: (
			eventOrValue:
				| { target?: { value?: unknown; checked?: boolean } }
				| unknown,
		) => {
			if (
				eventOrValue !== null &&
				typeof eventOrValue === "object" &&
				"target" in eventOrValue
			) {
				const target = (
					eventOrValue as { target?: { value?: unknown; checked?: boolean } }
				).target;
				if (target && typeof target.checked === "boolean") {
					void formik.setFieldValue(name, target.checked);
					return;
				}
				if (target && "value" in target) {
					void formik.setFieldValue(name, target.value);
					return;
				}
			}
			void formik.setFieldValue(name, eventOrValue);
		},
		onBlur: () => {
			void formik.setFieldTouched(name, true);
		},
	};
}

function renderMappedItem(
	item: AutoFormItem,
	formik: FormikProps<Record<string, unknown>>,
	mode: NonNullable<AutoFormProps["mode"]>,
	enabled: boolean,
): ReactElement | null {
	const comType = item.comType;
	if (!comType || !(comType in AutoFormComsMap)) {
		return (
			<div key={item.name} className={styles.missingCom} role="alert">
				AutoForm：无法渲染 comType={String(comType)}（name={item.name}）
			</div>
		);
	}

	const Field = AutoFormComsMap[comType];
	const fieldDisabled = !enabled || Boolean(item.disabled);
	// 先组必填绑定，再经 Record 合并 comProps（逃生口覆盖）；最后断言回 Mapped props
	const baseProps: AutoFormMappedFieldProps = {
		name: item.name,
		label: item.label,
		formik,
		mode,
		required: item.required,
		disabled: fieldDisabled,
		placeholder: item.placeholder,
		helperText: item.helperText,
		options: item.options ?? [],
		minRows: item.minRows,
	};
	const merged = mergeAutoBindWithComProps(
		baseProps as unknown as Record<string, unknown>,
		item.comProps,
	) as AutoFormMappedFieldProps;

	// 引用了Field组件，用于按 ComsMap 渲染自动绑字段
	return <Field key={item.name} {...merged} />;
}

function renderChildrenItem(
	item: AutoFormItem,
	formik: FormikProps<Record<string, unknown>>,
	mode: NonNullable<AutoFormProps["mode"]>,
	enabled: boolean,
): ReactElement {
	const fieldDisabled = !enabled || Boolean(item.disabled);
	const errorMsg = (() => {
		const touched = Boolean(getIn(formik.touched, item.name));
		if (!touched) return undefined;
		const err = getIn(formik.errors, item.name);
		return typeof err === "string" ? err : undefined;
	})();
	const raw = getIn(formik.values, item.name);
	const watchText =
		raw === undefined || raw === null || raw === "" ? "" : String(raw);

	const autoBind = buildNestedAutoBindProps(formik, item.name, fieldDisabled);
	const merged = mergeAutoBindWithComProps(autoBind, item.comProps);
	const child = item.children;
	const boundChild =
		child && isValidElement(child)
			? cloneElement(child, merged as Record<string, unknown>)
			: child;

	return (
		// 引用了FormFieldShell组件，用于 children 逃生口的统一字段外壳
		<FormFieldShell
			key={item.name}
			label={item.label}
			mode={mode}
			required={item.required}
			error={errorMsg}
			helperText={item.helperText}
			watchText={watchText}
		>
			{boundChild}
		</FormFieldShell>
	);
}

export function AutoForm<
	TValues extends Record<string, unknown> = Record<string, unknown>,
>({
	// formik 是调用方持有的 Formik，用于统一绑值（本组件不自建）
	formik,
	// mode 是交互模式，用于 add|edit|watch 投影
	mode = "edit",
	// enabled 为 false 时整表禁用，用于只读会话或加载中
	enabled = true,
	// items 是声明式字段列表，用于 ComsMap / 逃生口编排
	items,
}: AutoFormProps<TValues>): ReactElement {
	const bound = formik as FormikProps<Record<string, unknown>>;

	return (
		<div className={styles.root}>
			{items
				.filter((item) => !item.hidden)
				.map((item) => {
					if (item.children !== undefined) {
						return renderChildrenItem(item, bound, mode, enabled);
					}
					return renderMappedItem(item, bound, mode, enabled);
				})}
		</div>
	);
}
