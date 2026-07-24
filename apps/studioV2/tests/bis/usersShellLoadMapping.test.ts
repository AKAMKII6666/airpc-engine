/**
	* users shell 加载映射：User 列表 → UsersLoadResult。
	*/
import { describe, expect, it } from "vitest";
import { toUsersLoadResult } from "@studio-v2/src/bis/shellBis/users/users.shell.bis";
import type { User } from "@studio-v2/typeFiles/library/users/engineUser";

function minimalUser(userId: string): User {
	return {
		userId,
		nickname: userId,
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
	};
}

describe("toUsersLoadResult", () => {
	it("映射为 ok 列表投影", function () {
		const result = toUsersLoadResult([minimalUser("user_1")]);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.profiles).toHaveLength(1);
		expect(result.profiles[0]?.userId).toBe("user_1");
	});
});
