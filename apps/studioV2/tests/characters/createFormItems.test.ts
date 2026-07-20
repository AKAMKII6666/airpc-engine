/**
	* 创建弹窗 AutoForm items 契约：角色 / 资源 / 用户不再走 fields kind 主路径。
	*/
import { describe, expect, it } from "vitest";
import { CREATE_ASSET_FORM_ITEMS } from "@studio-v2/src/bis/pageBis/assets/createAssetForm";
import { CREATE_CHARACTER_FORM_ITEMS } from "@studio-v2/src/bis/pageBis/characters/create/createCharacterForm";
import { CREATE_USER_FORM_ITEMS } from "@studio-v2/src/bis/pageBis/users/create/createUserForm";

describe("create FormModal AutoForm items", () => {
	it("character create uses comType items", () => {
		expect(CREATE_CHARACTER_FORM_ITEMS.map((i) => i.name)).toEqual([
			"displayName",
			"kind",
			"bio",
		]);
		expect(CREATE_CHARACTER_FORM_ITEMS.every((i) => i.comType)).toBe(true);
	});

	it("asset create uses comType items", () => {
		expect(CREATE_ASSET_FORM_ITEMS.map((i) => i.name)).toEqual([
			"displayName",
			"kind",
			"note",
		]);
		expect(CREATE_ASSET_FORM_ITEMS.every((i) => i.comType)).toBe(true);
	});

	it("user create uses shared player identity items", () => {
		expect(CREATE_USER_FORM_ITEMS.map((i) => i.name)).toEqual([
			"nickname",
			"fullName",
			"gender",
			"birthday",
			"age",
			"outboundWindow",
			"location.country",
			"location.province",
			"location.city",
			"location.district",
		]);
		expect(CREATE_USER_FORM_ITEMS.every((i) => i.comType && i.required)).toBe(
			true,
		);
	});
});
