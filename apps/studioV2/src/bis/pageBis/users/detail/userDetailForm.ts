/**
	* 玩家详情 Formik 契约：复用共享字段配置；保存编排见 save/saveUser_bis。
	* 无调试偏好主区；不做年龄↔生日交叉校验。
	*/
import type { UserProfileSummary } from "@studio-v2/typeFiles/library/users/userProfileSummary";
import {
	USER_BASIC_ITEMS,
	USER_LOCATION_ITEMS,
	USER_OUTBOUND_WINDOW_ITEMS,
} from "../form/userFormItems";
import {
	toUserFormValues,
	type UserFormValues,
} from "../form/userFormValues";
import { validateUserForm } from "../form/userFormValidate";

/** 详情页 Formik values；与新建共用 UserFormValues，保证字段与校验一致 */
export type UserDetailFormValues = UserFormValues;

export {
	USER_BASIC_ITEMS,
	USER_LOCATION_ITEMS,
	USER_OUTBOUND_WINDOW_ITEMS,
	toUserFormValues,
};

/** 将会话投影映射为详情表单初值；只读系统字段不进表单 */
export const toUserDetailFormValues = toUserFormValues;

/** 详情校验复用共享 validateUserForm；失败字段名对齐 AutoForm */
export const validateUserDetailForm = validateUserForm;

/**
	* 将详情表单合并回既有玩家投影（保留 userId / createdAt；刷新 updatedAt）。
	*/
export function applyUserDetailForm(
	previous: UserProfileSummary,
	values: UserDetailFormValues,
): UserProfileSummary {
	const gender = values.gender === "female" ? "female" : "male";
	const age = typeof values.age === "number" ? values.age : previous.age;
	return {
		...previous,
		nickname: values.nickname.trim(),
		fullName: values.fullName.trim(),
		gender,
		birthday: values.birthday.trim(),
		age,
		outboundWindow: {
			from: values.outboundWindow.from,
			to: values.outboundWindow.to,
		},
		location: {
			country: values.location.country.trim(),
			province: values.location.province.trim(),
			city: values.location.city.trim(),
			district: values.location.district.trim(),
		},
		updatedAt: new Date().toISOString(),
	};
}
