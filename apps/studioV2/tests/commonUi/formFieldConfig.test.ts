/**
	* AutoForm / FormField 共享契约回归：mode 与 Formik 读取 helper。
	* 不挂载 React；FormSchemaRenderer / kind 双轨已收口删除。
	*/
import { describe, expect, it } from "vitest";
import type { FormFieldMode } from "@studio-v2/src/commonUiComponents/form/formTypes";
import type { AutoFormItem } from "@studio-v2/src/commonUiComponents/form/autoFormTypes";
import {
	readFormikFieldError,
	readFormikFieldString,
} from "@studio-v2/src/commonUiComponents/form/fields/formBoundFieldProps";
import type { FormikProps } from "formik";

describe("AutoFormItem contract", () => {
	it("accepts the four base comTypes used by library forms", () => {
		const items: AutoFormItem[] = [
			{ name: "title", label: "名称", comType: "TextField", required: true },
			{ name: "desc", label: "描述", comType: "AutoTextArea", minRows: 2 },
			{
				name: "lang",
				label: "语言",
				comType: "Select",
				options: [{ label: "简体中文", value: "zh-CN" }],
			},
			{ name: "withStart", label: "起点卡", comType: "Checkbox" },
		];

		expect(items.map((i) => i.comType)).toEqual([
			"TextField",
			"AutoTextArea",
			"Select",
			"Checkbox",
		]);
		expect(items[0]?.required).toBe(true);
		expect(items[2]?.options?.[0]?.value).toBe("zh-CN");
	});

	it("documents add/edit/watch modes for AutoForm", () => {
		const modes: FormFieldMode[] = ["add", "edit", "watch"];
		expect(modes).toHaveLength(3);
	});
});

describe("formBoundFieldProps helpers", () => {
	/**
		* 测试桩允许不完整 Formik；嵌套 touched/errors 无法被
		* FormikTouched<Record<string, unknown>> 精确表达（叶子被收成 boolean）。
		*/
	function stubFormik(
		partial: object,
	): FormikProps<Record<string, unknown>> {
		return partial as FormikProps<Record<string, unknown>>;
	}

	it("readFormikFieldError only when touched and string", () => {
		expect(
			readFormikFieldError(
				stubFormik({ touched: {}, errors: { title: "必填" } }),
				"title",
			),
		).toBeUndefined();
		expect(
			readFormikFieldError(
				stubFormik({
					touched: { title: true },
					errors: { title: "必填" },
				}),
				"title",
			),
		).toBe("必填");
	});

	it("readFormikFieldString maps nullish to empty", () => {
		expect(
			readFormikFieldString(
				stubFormik({ values: { title: undefined } }),
				"title",
			),
		).toBe("");
		expect(
			readFormikFieldString(stubFormik({ values: { title: "你好" } }), "title"),
		).toBe("你好");
	});

	it("readFormikFieldString and error support nested name paths", () => {
		expect(
			readFormikFieldString(
				stubFormik({ values: { identity: { fullName: "澜星" } } }),
				"identity.fullName",
			),
		).toBe("澜星");
		expect(
			readFormikFieldError(
				stubFormik({
					touched: { identity: { fullName: true } },
					errors: { identity: { fullName: "必填" } },
				}),
				"identity.fullName",
			),
		).toBe("必填");
	});
});
