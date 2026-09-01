/**
 * commitBootstrapUserLoreWithOptionalSave：dirty 时先 PUT 再 POST bootstrap。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserProfileSummary } from "@studio-v2/typeFiles/library/users/userProfileSummary";

vi.mock("@studio-v2/src/bis/pageBis/users/detail/save/saveUser_bis", () => ({
	commitSaveUserDetail: vi.fn(),
}));

vi.mock("@studio-v2/src/utils/ajaxProxy/library/api/usersApi", () => ({
	postBootstrapUserLore: vi.fn(),
}));

import { commitSaveUserDetail } from "@studio-v2/src/bis/pageBis/users/detail/save/saveUser_bis";
import { postBootstrapUserLore } from "@studio-v2/src/utils/ajaxProxy/library/api/usersApi";
import {
	commitBootstrapUserLoreWithOptionalSave,
} from "../../src/bis/pageBis/users/detail/bootstrapUserLore_bis";
import type { UserDetailFormValues } from "../../src/bis/pageBis/users/detail/userDetailForm";

const profileFixture: UserProfileSummary = {
	userId: "demo-user",
	nickname: "测",
	fullName: "测",
	gender: "male",
	birthday: "2000-01-01",
	age: 26,
	outboundWindow: { from: 9, to: 22 },
	location: {
		country: "中国",
		province: "北京市",
		city: "昌平区",
		district: "北七家",
	},
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

const valuesFixture: UserDetailFormValues = {
	nickname: "测",
	fullName: "测",
	gender: "male",
	birthday: "2000-01-01",
	age: 26,
	outboundWindow: { from: 9, to: 22 },
	location: {
		country: "中国",
		province: "北京市",
		city: "昌平区",
		district: "北七家",
	},
};

describe("commitBootstrapUserLoreWithOptionalSave", () => {
	beforeEach(function () {
		vi.mocked(commitSaveUserDetail).mockReset();
		vi.mocked(postBootstrapUserLore).mockReset();
		vi.mocked(postBootstrapUserLore).mockResolvedValue({
			lore: {
				source: "llm",
				generatedAt: "2026-08-28T00:00:00.000Z",
				sharedPremise: "北京昌平的世界",
				location: {
					country: "中国",
					province: "北京市",
					city: "昌平区",
					district: "北七家",
				},
			},
			usedFallback: false,
		});
	});

	it("dirty 时先 commitSaveUserDetail 再 postBootstrapUserLore", async function () {
		const callOrder: string[] = [];
		vi.mocked(commitSaveUserDetail).mockImplementation(async function () {
			callOrder.push("save");
			return {
				summary: profileFixture,
				lorePreview: {
					source: "llm",
					generatedAt: "2026-08-28T00:00:00.000Z",
					sharedPremise: "旧 lore",
				},
			};
		});
		vi.mocked(postBootstrapUserLore).mockImplementation(async function () {
			callOrder.push("bootstrap");
			return {
				lore: {
					source: "llm",
					generatedAt: "2026-08-28T00:00:00.000Z",
					sharedPremise: "北京昌平的世界",
				},
				usedFallback: false,
			};
		});

		const result = await commitBootstrapUserLoreWithOptionalSave(
			profileFixture,
			valuesFixture,
			{ dirty: true },
		);

		expect(callOrder).toEqual(["save", "bootstrap"]);
		expect(result.save).toBeDefined();
		expect(result.bootstrap.lorePreview.source).toBe("llm");
		expect(commitSaveUserDetail).toHaveBeenCalledOnce();
		expect(postBootstrapUserLore).toHaveBeenCalledWith("demo-user", {
			force: true,
		});
	});

	it("未 dirty 时跳过保存，直接 bootstrap", async function () {
		await commitBootstrapUserLoreWithOptionalSave(
			profileFixture,
			valuesFixture,
			{ dirty: false },
		);

		expect(commitSaveUserDetail).not.toHaveBeenCalled();
		expect(postBootstrapUserLore).toHaveBeenCalledOnce();
	});
});
