/**
	* AutoForm 契约回归：ComsMap 键、双逃生口合并、嵌套 name 自动绑。
	* 不挂载 React；锁编排形状与 comProps 覆盖解析行为，避免后续角色批改坏基建。
	*/
import { describe, expect, it, vi } from "vitest";
import type { AutoFormItem } from "@studio-v2/src/commonUiComponents/form/autoFormTypes";
import { AutoFormComsMap } from "@studio-v2/src/commonUiComponents/form/AutoForm/comsMap";
import {
	buildNestedAutoBindProps,
	mergeAutoBindWithComProps,
} from "@studio-v2/src/commonUiComponents/form/AutoForm";
import {
	resolveBoundChecked,
	resolveBoundCheckedChangeHandler,
	resolveBoundDisplayString,
	resolveBoundStringChangeHandler,
} from "@studio-v2/src/commonUiComponents/form/fields/formBoundFieldProps";
import { rewriteScenePriorities } from "@studio-v2/src/commonUiComponents/form/blocks/PromptSceneListEditor/promptSceneListHelpers";
import type { FormikProps } from "formik";
import { createElement } from "react";
import type { ChangeEvent } from "react";

describe("AutoForm ComsMap", () => {
	it("registers base controls and character block editors", () => {
		expect(Object.keys(AutoFormComsMap).sort()).toEqual(
			[
				"AutoTextArea",
				"AvatarUpload",
				"Checkbox",
				"DateField",
				"IntegerInput",
				"LocalHourRangeField",
				"OptionMultiSelect",
				"PromptSceneListEditor",
				"PromptVariantListEditor",
				"Radio",
				"Select",
				"StringListEditor",
				"TextField",
			].sort(),
		);
	});
});

describe("PromptSceneListEditor priority rewrite", () => {
	it("writes priority as 0,10,20… after reorder", () => {
		const rewritten = rewriteScenePriorities([
			{
				layerId: "a",
				priority: 99,
				match: {
					callDirection: "either",
					localHourRange: { from: 0, to: 24 },
				},
				patch: {
					openingSpeakable: "",
					openingPrivate: "",
					emotion: "",
					toneHint: "",
					appendSpeakable: "",
					appendPrivate: "",
				},
			},
			{
				layerId: "b",
				priority: 1,
				match: {
					callDirection: "inbound",
					localHourRange: { from: 9, to: 18 },
				},
				patch: {
					openingSpeakable: "",
					openingPrivate: "",
					emotion: "",
					toneHint: "",
					appendSpeakable: "",
					appendPrivate: "",
				},
			},
		]);
		expect(rewritten.map((s) => s.priority)).toEqual([0, 10]);
	});
});

describe("AutoForm item contract", () => {
	it("accepts nested name, comProps escape, and children escape", () => {
		const items: AutoFormItem[] = [
			{
				label: "显示名",
				name: "displayName",
				comType: "TextField",
				required: true,
			},
			{
				label: "系统人设",
				name: "persona.systemPrompt",
				comType: "AutoTextArea",
				required: true,
			},
			{
				label: "只读编号",
				name: "code",
				comType: "TextField",
				comProps: { disabled: true, value: "-" },
			},
			{
				label: "头像",
				name: "meta.avatarAssetId",
				children: createElement("div", { "data-avatar": true }),
			},
		];

		expect(items[1]?.name).toBe("persona.systemPrompt");
		expect(items[2]?.comProps?.disabled).toBe(true);
		expect(items[3]?.children).toBeTruthy();
		expect(items[3]?.comType).toBeUndefined();
	});
});

describe("AutoForm auto-bind helpers", () => {
	function stubFormik(
		partial: Partial<FormikProps<Record<string, unknown>>>,
	): FormikProps<Record<string, unknown>> {
		return {
			setFieldValue: vi.fn(),
			setFieldTouched: vi.fn(),
			values: {},
			errors: {},
			touched: {},
			...partial,
		} as FormikProps<Record<string, unknown>>;
	}

	it("mergeAutoBindWithComProps lets comProps override auto-bind", () => {
		const merged = mergeAutoBindWithComProps(
			{ value: "auto", disabled: false, name: "code" },
			{ value: "-", disabled: true },
		);
		expect(merged.value).toBe("-");
		expect(merged.disabled).toBe(true);
		expect(merged.name).toBe("code");
	});

	it("buildNestedAutoBindProps reads nested values and writes via setFieldValue", () => {
		const setFieldValue = vi.fn();
		const formik = stubFormik({
			values: { identity: { fullName: "澜星" } },
			setFieldValue,
		});
		const bind = buildNestedAutoBindProps(formik, "identity.fullName", false);
		expect(bind.value).toBe("澜星");
		expect(bind.disabled).toBe(false);

		const onChange = bind.onChange as (v: unknown) => void;
		onChange({ target: { value: "新名" } });
		expect(setFieldValue).toHaveBeenCalledWith("identity.fullName", "新名");
	});
});

describe("comProps escape on mapped fields", () => {
	function stubFormik(
		partial: Partial<FormikProps<Record<string, unknown>>>,
	): FormikProps<Record<string, unknown>> {
		return {
			setFieldValue: vi.fn(),
			setFieldTouched: vi.fn(),
			values: {},
			errors: {},
			touched: {},
			...partial,
		} as FormikProps<Record<string, unknown>>;
	}

	it("resolveBoundDisplayString prefers comProps.value over Formik", () => {
		const formik = stubFormik({ values: { code: "from-formik" } });
		expect(resolveBoundDisplayString(formik, "code", undefined)).toBe(
			"from-formik",
		);
		expect(resolveBoundDisplayString(formik, "code", "-")).toBe("-");
		expect(resolveBoundDisplayString(formik, "code", null)).toBe("");
	});

	it("resolveBoundStringChangeHandler prefers comProps.onChange", () => {
		const setFieldValue = vi.fn();
		const escapeOnChange = vi.fn();
		const formik = stubFormik({
			values: { code: "a" },
			setFieldValue,
		});
		const merged = mergeAutoBindWithComProps(
			{ name: "code" },
			{ value: "-", onChange: escapeOnChange },
		);
		expect(merged.value).toBe("-");

		const handler = resolveBoundStringChangeHandler(
			formik,
			"code",
			merged.onChange as (...args: unknown[]) => void,
		);
		const event = {
			target: { value: "ignored-by-escape" },
		} as ChangeEvent<HTMLInputElement>;
		handler(event);
		expect(escapeOnChange).toHaveBeenCalledWith(event);
		expect(setFieldValue).not.toHaveBeenCalled();
	});

	it("resolveBoundChecked and change prefer comProps overrides", () => {
		const setFieldValue = vi.fn();
		const escapeOnChange = vi.fn();
		const formik = stubFormik({
			values: { flag: false },
			setFieldValue,
		});
		expect(resolveBoundChecked(formik, "flag", undefined)).toBe(false);
		expect(resolveBoundChecked(formik, "flag", true)).toBe(true);

		const handler = resolveBoundCheckedChangeHandler(
			formik,
			"flag",
			escapeOnChange,
		);
		const event = {
			target: { checked: true },
		} as ChangeEvent<HTMLInputElement>;
		handler(event, true);
		expect(escapeOnChange).toHaveBeenCalledWith(event, true);
		expect(setFieldValue).not.toHaveBeenCalled();
	});
});
