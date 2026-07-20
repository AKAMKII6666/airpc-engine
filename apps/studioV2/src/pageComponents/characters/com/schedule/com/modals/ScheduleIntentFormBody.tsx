/**
	* 定时外呼 FormModal 体：按 kind 动态 AutoForm items（单选切换条件字段）。
	*/
"use client";

import type { ReactElement } from "react";
import type { FormikProps } from "formik";
// 引用了AutoForm组件，用于弹层内声明式字段
import { AutoForm } from "@studio-v2/src/commonUiComponents/form/AutoForm";
import {
	buildScheduleIntentFormItems,
	type ScheduleIntentFormKind,
	type ScheduleIntentFormValues,
} from "@studio-v2/src/bis/pageBis/characters/schedule/scheduleIntentForm";

/**
	* FormModal children：随 kind 切换隐藏延迟/时分字段。
	*/
export function renderScheduleIntentFormBody(
	formik: FormikProps<ScheduleIntentFormValues>,
	mode: "add" | "edit",
): ReactElement {
	const kind = (
		formik.values.kind === "recurring" ? "recurring" : "once"
	) as ScheduleIntentFormKind;
	return (
		// 引用了AutoForm组件，用于类型单选与条件时间字段
		<AutoForm
			formik={formik}
			mode={mode}
			enabled
			items={buildScheduleIntentFormItems(kind)}
		/>
	);
}
