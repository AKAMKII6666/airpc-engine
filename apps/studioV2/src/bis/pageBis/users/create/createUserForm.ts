/**
	* 新建玩家表单契约：与详情共用同一套 AutoForm 字段配置。
	* userId / createdAt / updatedAt 由系统生成；落盘见 createUser_bis。
	*/
import { createStudioId } from "@studio-v2/typeFiles/ids/createStudioId";
import type { UserProfileSummary } from "@studio-v2/typeFiles/library/users/userProfileSummary";
import { USER_EDITABLE_FORM_ITEMS } from "../form/userFormItems";
import {
	USER_FORM_INITIAL_VALUES,
	type UserFormValues,
} from "../form/userFormValues";
import { validateUserForm } from "../form/userFormValidate";

/** 新建玩家 Formik values；与详情共用 UserFormValues，避免两套字段漂移 */
export type CreateUserFormValues = UserFormValues;

/** 新建弹窗初始空表；userId / 时间戳由 buildMockUserFromForm 系统写入 */
export const CREATE_USER_INITIAL_VALUES = USER_FORM_INITIAL_VALUES;

/** 与详情可编辑区同一套 items[] */
export const CREATE_USER_FORM_ITEMS = USER_EDITABLE_FORM_ITEMS;

/** 新建校验复用共享 validateUserForm；失败字段名对齐 AutoForm */
export const validateCreateUserForm = validateUserForm;

/**
	* 由表单值生成待写盘的玩家投影；userId 与时间戳系统生成。
	*/
export function buildMockUserFromForm(
	values: CreateUserFormValues,
): UserProfileSummary {
	const nickname = values.nickname.trim();
	const now = new Date().toISOString();
	const gender = values.gender === "female" ? "female" : "male";
	const age = typeof values.age === "number" ? values.age : 0;
	return {
		userId: createStudioId("user", nickname),
		nickname,
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
		createdAt: now,
		updatedAt: now,
	};
}
