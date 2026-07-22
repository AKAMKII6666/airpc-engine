/**
	* 新建 / 详情玩家表单校验与 User↔投影映射轻量回归。
	*/
import { describe, expect, it } from "vitest";
import {
	buildUserFromForm,
	CREATE_USER_FORM_ITEMS,
	CREATE_USER_INITIAL_VALUES,
	validateCreateUserForm,
} from "@studio-v2/src/bis/pageBis/users/create/createUserForm";
import {
	applyUserDetailForm,
	toUserDetailFormValues,
	USER_BASIC_ITEMS,
	USER_LOCATION_ITEMS,
	USER_OUTBOUND_WINDOW_ITEMS,
	validateUserDetailForm,
} from "@studio-v2/src/bis/pageBis/users/detail/userDetailForm";
import { USER_EDITABLE_FORM_ITEMS } from "@studio-v2/src/bis/pageBis/users/form/userFormItems";
import {
	summaryToUser,
	userToSummary,
} from "@studio-v2/src/bis/pageBis/users/form/mapper/mapUserProfile";
import { resetStudioIdSeq } from "@studio-v2/typeFiles/ids/createStudioId";

const FILLED_USER_VALUES = {
	nickname: " 试写玩家 ",
	fullName: " 试写全名 ",
	gender: "female" as const,
	birthday: "1999-05-01",
	age: 26 as number | "",
	outboundWindow: { from: 9, to: 22 },
	location: {
		country: "中国",
		province: "浙江省",
		city: "杭州市",
		district: "西湖区",
	},
};

describe("createUserForm", () => {
	it("rejects empty required fields", () => {
		const errors = validateCreateUserForm(CREATE_USER_INITIAL_VALUES);
		expect(errors.nickname).toBe("请填写昵称");
		expect(errors.fullName).toBe("请填写全名");
		expect(errors.gender).toBe("请选择性别");
		expect(errors.birthday).toBe("请填写生日");
		expect(errors.age).toBe("请填写年龄");
		expect(errors.location).toMatchObject({
			country: "请填写国家",
			province: "请填写省/州",
			city: "请填写城市",
			district: "请填写区/县",
		});
	});

	it("builds draft summary with system userId and timestamps", () => {
		resetStudioIdSeq(50);
		const summary = buildUserFromForm(FILLED_USER_VALUES);
		expect(summary.nickname).toBe("试写玩家");
		expect(summary.fullName).toBe("试写全名");
		expect(summary.gender).toBe("female");
		expect(summary.birthday).toBe("1999-05-01");
		expect(summary.age).toBe(26);
		expect(summary.location.city).toBe("杭州市");
		expect(summary.userId.startsWith("user_")).toBe(true);
		expect(summary.createdAt.length).toBeGreaterThan(0);
		expect(summary.updatedAt).toBe(summary.createdAt);
	});

	it("shares editable items with detail form config", () => {
		expect(CREATE_USER_FORM_ITEMS).toEqual(USER_EDITABLE_FORM_ITEMS);
		expect(CREATE_USER_FORM_ITEMS.map((i) => i.name)).toEqual([
			...USER_BASIC_ITEMS.map((i) => i.name),
			...USER_OUTBOUND_WINDOW_ITEMS.map((i) => i.name),
			...USER_LOCATION_ITEMS.map((i) => i.name),
		]);
		expect(CREATE_USER_FORM_ITEMS.every((i) => i.comType && i.required)).toBe(
			true,
		);
	});
});

describe("userDetailForm", () => {
	it("rejects empty nickname without age-birthday cross check", () => {
		resetStudioIdSeq(60);
		const base = buildUserFromForm(FILLED_USER_VALUES);
		const values = toUserDetailFormValues(base);
		values.nickname = "  ";
		values.age = 99;
		values.birthday = "2000-01-01";
		const errors = validateUserDetailForm(values);
		expect(errors.nickname).toBe("请填写昵称");
		expect(errors.age).toBeUndefined();
		expect(errors.birthday).toBeUndefined();
	});

	it("applies identity fields without changing userId or createdAt", () => {
		resetStudioIdSeq(70);
		const base = buildUserFromForm({
			...FILLED_USER_VALUES,
			nickname: "基线",
			gender: "male",
		});
		const values = toUserDetailFormValues(base);
		values.nickname = "新昵称";
		values.fullName = "新全名";
		values.gender = "female";
		values.location.district = "滨江区";
		const next = applyUserDetailForm(base, values);
		expect(next.userId).toBe(base.userId);
		expect(next.createdAt).toBe(base.createdAt);
		expect(next.nickname).toBe("新昵称");
		expect(next.fullName).toBe("新全名");
		expect(next.gender).toBe("female");
		expect(next.location.district).toBe("滨江区");
		expect(next.updatedAt >= base.updatedAt).toBe(true);
	});
});

describe("mapUserProfile", () => {
	it("round-trips summary ↔ User without age-birthday cross rewrite", () => {
		resetStudioIdSeq(80);
		const summary = buildUserFromForm({
			...FILLED_USER_VALUES,
			age: 40,
			birthday: "2005-01-01",
		});
		const user = summaryToUser(summary);
		expect(user.age).toBe(40);
		expect(user.birthday).toBe("2005-01-01");
		expect(user.gender).toBe("female");
		expect(user.location?.district).toBe("西湖区");
		const back = userToSummary(user);
		expect(back).toEqual(summary);
	});

	it("fills optional disk gaps for edit form projection", () => {
		const back = userToSummary({
			userId: "demo-user",
			nickname: "小明",
			createdAt: "2026-07-13T00:00:00.000Z",
			updatedAt: "2026-07-13T00:00:00.000Z",
		});
		expect(back.fullName).toBe("");
		expect(back.gender).toBe("male");
		expect(back.birthday).toBe("");
		expect(back.age).toBe(0);
		expect(back.location.country).toBe("");
	});
});
