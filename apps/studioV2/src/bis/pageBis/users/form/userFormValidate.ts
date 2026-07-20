/**
	* 玩家配置编辑态校验：展示字段全必填；不做年龄↔生日交叉校验。
	*/
import type { FormikErrors } from "formik";
import type { UserFormValues } from "./userFormValues";

function requireNonEmpty(
	value: string,
	message: string,
): string | undefined {
	if (value.trim().length === 0) return message;
	return undefined;
}

function validateOutboundWindow(
	values: UserFormValues,
): string | undefined {
	const from = values.outboundWindow?.from;
	const to = values.outboundWindow?.to;
	if (
		typeof from !== "number" ||
		typeof to !== "number" ||
		from < 0 ||
		from > 23 ||
		to < 0 ||
		to > 24 ||
		!(from < to)
	) {
		return "请填写有效的可外呼时段（from < to）";
	}
	return undefined;
}

function validateLocation(
	values: UserFormValues,
): FormikErrors<UserFormValues["location"]> | undefined {
	const locationErrors: Record<string, string> = {};
	const countryErr = requireNonEmpty(values.location.country, "请填写国家");
	if (countryErr) locationErrors.country = countryErr;
	const provinceErr = requireNonEmpty(values.location.province, "请填写省/州");
	if (provinceErr) locationErrors.province = provinceErr;
	const cityErr = requireNonEmpty(values.location.city, "请填写城市");
	if (cityErr) locationErrors.city = cityErr;
	const districtErr = requireNonEmpty(values.location.district, "请填写区/县");
	if (districtErr) locationErrors.district = districtErr;
	if (Object.keys(locationErrors).length === 0) return undefined;
	return locationErrors as FormikErrors<UserFormValues["location"]>;
}

/**
	* 轻量校验：基本信息 + 可外呼窗 + 地理位置；年龄与生日各填各的。
	*/
export function validateUserForm(
	values: UserFormValues,
): FormikErrors<UserFormValues> {
	const errors: FormikErrors<UserFormValues> = {};

	const nicknameErr = requireNonEmpty(values.nickname, "请填写昵称");
	if (nicknameErr) errors.nickname = nicknameErr;

	const fullNameErr = requireNonEmpty(values.fullName, "请填写全名");
	if (fullNameErr) errors.fullName = fullNameErr;

	if (values.gender !== "male" && values.gender !== "female") {
		errors.gender = "请选择性别";
	}

	const birthdayErr = requireNonEmpty(values.birthday, "请填写生日");
	if (birthdayErr) errors.birthday = birthdayErr;

	if (values.age === "" || typeof values.age !== "number") {
		errors.age = "请填写年龄";
	}

	const windowErr = validateOutboundWindow(values);
	if (windowErr) {
		errors.outboundWindow = windowErr as never;
	}

	const locationErr = validateLocation(values);
	if (locationErr) errors.location = locationErr;

	return errors;
}
