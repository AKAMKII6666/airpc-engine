/**
	* 玩家配置 AutoForm items[]（细化修改 2 §3.2）。
	* 详情与新建共用同一套可编辑字段；时间戳只读不在此列。
	*/
import type { AutoFormItem } from "@studio-v2/src/commonUiComponents/form/autoFormTypes";
import { USER_GENDER_OPTIONS } from "@studio-v2/typeFiles/library/labels/libraryLabels";

/**
	* 基本信息：昵称 / 全名 / 性别 / 生日 / 年龄。
	* 编辑态全必填；年龄与生日不做交叉校验。
	*/
export const USER_BASIC_ITEMS: AutoFormItem[] = [
	{
		name: "nickname",
		label: "昵称",
		comType: "TextField",
		required: true,
		placeholder: "例如：小明",
	},
	{
		name: "fullName",
		label: "全名",
		comType: "TextField",
		required: true,
		placeholder: "例如：张小明",
	},
	{
		name: "gender",
		label: "性别",
		comType: "Select",
		required: true,
		placeholder: "请选择",
		options: [...USER_GENDER_OPTIONS],
	},
	{
		name: "birthday",
		label: "生日",
		comType: "DateField",
		required: true,
	},
	{
		name: "age",
		label: "年龄",
		comType: "IntegerInput",
		required: true,
		helperText: "与生日各填各的，不做推算校验。",
	},
];

/**
	* 地理位置分组下的四国/省/市/区字段。
	* 「地理位置」仅为分组标题，不是第五个自由文本。
	*/
export const USER_LOCATION_ITEMS: AutoFormItem[] = [
	{
		name: "location.country",
		label: "国家",
		comType: "TextField",
		required: true,
	},
	{
		name: "location.province",
		label: "省/州",
		comType: "TextField",
		required: true,
	},
	{
		name: "location.city",
		label: "城市",
		comType: "TextField",
		required: true,
	},
	{
		name: "location.district",
		label: "区/县",
		comType: "TextField",
		required: true,
	},
];

/**
	* NPC 可外呼时段（半开本地小时）；默认 9–22。
	*/
export const USER_OUTBOUND_WINDOW_ITEMS: AutoFormItem[] = [
	{
		name: "outboundWindow",
		label: "NPC 可外呼时段",
		comType: "LocalHourRangeField",
		required: true,
		helperText: "半开区间：本地小时 h 满足 from ≤ h < to；窗外定时外呼会延后。",
	},
];

/**
	* 新建与详情可编辑字段全集（同一配置）。
	* 不含 userId / createdAt / updatedAt（系统生成或只读展示）。
	*/
export const USER_EDITABLE_FORM_ITEMS: AutoFormItem[] = [
	...USER_BASIC_ITEMS,
	...USER_OUTBOUND_WINDOW_ITEMS,
	...USER_LOCATION_ITEMS,
];
