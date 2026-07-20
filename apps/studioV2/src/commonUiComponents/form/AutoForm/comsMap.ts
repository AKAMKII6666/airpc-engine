/**
	* AutoForm 控件注册表：comType 字符串 → 带 FormFieldShell 的字段组件。
	* 仅方法对齐 Mithril ComsMap；样式继续用 Studio V2 MUI + scss。
	*/
import type { ComponentType } from "react";
import type { FormBoundFieldProps } from "../fields/types/formBoundTypes";
import type { FormSelectOption } from "../formTypes";
import type { AutoFormComType } from "../autoFormTypes";
import { FormTextField } from "../fields/FormTextField";
import { FormSelectField } from "../fields/FormSelectField";
import { FormCheckboxField } from "../fields/FormCheckboxField";
import { FormRadioField } from "../fields/FormRadioField";
import { FormAutoTextArea } from "../fields/FormAutoTextArea";
import { FormIntegerInput } from "../fields/FormIntegerInput";
import { FormDateField } from "../fields/FormDateField";
import { FormAvatarUpload } from "../blocks/AvatarUpload";
import { FormStringListEditor } from "../blocks/StringListEditor";
import { FormOptionMultiSelect } from "../blocks/OptionMultiSelect";
import { FormPromptVariantListEditor } from "../blocks/PromptVariantListEditor";
import { FormLocalHourRangeField } from "../blocks/LocalHourRangeField";
import { FormPromptSceneListEditor } from "../blocks/PromptSceneListEditor";

/** ComsMap 控件在自动绑之外可能收到的附加 props */
export type AutoFormMappedFieldProps =
	FormBoundFieldProps<Record<string, unknown>> & {
		options?: FormSelectOption[];
		minRows?: number;
	};

export const AutoFormComsMap: Record<
	AutoFormComType,
	ComponentType<AutoFormMappedFieldProps>
> = {
	TextField: FormTextField as ComponentType<AutoFormMappedFieldProps>,
	Select: FormSelectField as ComponentType<AutoFormMappedFieldProps>,
	Checkbox: FormCheckboxField as ComponentType<AutoFormMappedFieldProps>,
	Radio: FormRadioField as ComponentType<AutoFormMappedFieldProps>,
	AutoTextArea: FormAutoTextArea as ComponentType<AutoFormMappedFieldProps>,
	IntegerInput: FormIntegerInput as ComponentType<AutoFormMappedFieldProps>,
	DateField: FormDateField as ComponentType<AutoFormMappedFieldProps>,
	AvatarUpload: FormAvatarUpload as ComponentType<AutoFormMappedFieldProps>,
	StringListEditor: FormStringListEditor as ComponentType<AutoFormMappedFieldProps>,
	OptionMultiSelect:
		FormOptionMultiSelect as ComponentType<AutoFormMappedFieldProps>,
	PromptVariantListEditor:
		FormPromptVariantListEditor as ComponentType<AutoFormMappedFieldProps>,
	LocalHourRangeField:
		FormLocalHourRangeField as ComponentType<AutoFormMappedFieldProps>,
	PromptSceneListEditor:
		FormPromptSceneListEditor as ComponentType<AutoFormMappedFieldProps>,
};
