/**
	* 玩家配置 Formik values：与 AutoForm name 对齐（含 location.* 嵌套）。
	*/
import type { UserGender } from "@studio-v2/typeFiles/library/users/userProfileSummary";
import type { UserProfileSummary } from "@studio-v2/typeFiles/library/users/userProfileSummary";

/**
	* 详情/新建共用 values；age 空串表示未填（IntegerInput 约定）。
	* 交叉 Record 以满足 Formik / AutoForm 约束。
	*/
export type UserFormValues = {
	nickname: string;
	fullName: string;
	/** 空串表示未选；提交前校验必选 */
	gender: UserGender | "";
	birthday: string;
	age: number | "";
	/** 半开本地小时窗；与 LocalHourRangeField 对齐 */
	outboundWindow: {
		from: number;
		to: number;
	};
	location: {
		country: string;
		province: string;
		city: string;
		district: string;
	};
} & Record<string, unknown>;

/** 新建弹窗初始空表；时间戳与 userId 由提交时系统写入 */
export const USER_FORM_INITIAL_VALUES: UserFormValues = {
	nickname: "",
	fullName: "",
	gender: "",
	birthday: "",
	age: "",
	outboundWindow: { from: 9, to: 22 },
	location: {
		country: "",
		province: "",
		city: "",
		district: "",
	},
};

/**
	* 将玩家投影扁平化为详情 Formik values。
	*/
export function toUserFormValues(profile: UserProfileSummary): UserFormValues {
	return {
		nickname: profile.nickname,
		fullName: profile.fullName,
		gender: profile.gender,
		birthday: profile.birthday,
		age: profile.age,
		outboundWindow: {
			from: profile.outboundWindow.from,
			to: profile.outboundWindow.to,
		},
		location: {
			country: profile.location.country,
			province: profile.location.province,
			city: profile.location.city,
			district: profile.location.district,
		},
	};
}
