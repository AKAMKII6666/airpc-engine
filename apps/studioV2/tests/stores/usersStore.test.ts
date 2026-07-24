/**
	* usersStore 结果型 action 回归：load / select / upsert / stamp / prefer。
	*/
import { beforeEach, describe, expect, it } from "vitest";
import {
	pickUsersSelectedId,
	useUsersStore,
} from "@studio-v2/src/stores/users/usersStore";
import type { UserProfileSummary } from "@studio-v2/typeFiles/library/users/userProfileSummary";

function summary(userId: string, nickname = userId): UserProfileSummary {
	return {
		userId,
		nickname,
		fullName: "",
		gender: "male",
		birthday: "",
		age: 0,
		outboundWindow: { from: 9, to: 22 },
		location: {
			country: "",
			province: "",
			city: "",
			district: "",
		},
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
	};
}

describe("pickUsersSelectedId", () => {
	it("优先 prefer，其次旧选中，否则首项", function () {
		const list = [summary("a"), summary("b")];
		expect(pickUsersSelectedId(list, "b", "a")).toBe("b");
		expect(pickUsersSelectedId(list, undefined, "b")).toBe("b");
		expect(pickUsersSelectedId(list, "missing", "gone")).toBe("a");
		expect(pickUsersSelectedId([], undefined, "a")).toBe("");
	});
});

describe("usersStore", () => {
	beforeEach(function () {
		useUsersStore.getState().resetUsersSession();
		useUsersStore.setState({ refreshStamp: 0 });
	});

	it("applyListLoadResult 成功灌列表并清 prefer", function () {
		useUsersStore.getState().setPreferSelectedId("b");
		useUsersStore.getState().applyListLoadStarted();
		expect(useUsersStore.getState().loading).toBe(true);

		useUsersStore.getState().applyListLoadResult({
			ok: true,
			profiles: [summary("a"), summary("b")],
		});

		const state = useUsersStore.getState();
		expect(state.loading).toBe(false);
		expect(state.loadError).toBeUndefined();
		expect(state.profiles).toHaveLength(2);
		expect(state.selectedId).toBe("b");
		expect(state.preferSelectedId).toBeUndefined();
	});

	it("applyListLoadResult 失败清空列表", function () {
		useUsersStore.getState().applyListLoadResult({
			ok: true,
			profiles: [summary("a")],
		});
		useUsersStore.getState().applyListLoadResult({
			ok: false,
			message: "boom",
		});
		const state = useUsersStore.getState();
		expect(state.profiles).toEqual([]);
		expect(state.selectedId).toBe("");
		expect(state.loadError).toBe("boom");
		expect(state.loading).toBe(false);
	});

	it("applyUserUpsertResult 更新或追加并选中", function () {
		useUsersStore.getState().applyListLoadResult({
			ok: true,
			profiles: [summary("a", "旧昵称")],
		});
		useUsersStore
			.getState()
			.applyUserUpsertResult(summary("a", "新昵称"));
		expect(useUsersStore.getState().profiles[0]?.nickname).toBe("新昵称");
		useUsersStore
			.getState()
			.applyUserUpsertResult(summary("b", "新增"));
		expect(useUsersStore.getState().profiles).toHaveLength(2);
		expect(useUsersStore.getState().selectedId).toBe("b");
	});

	it("bumpUsersRefreshStamp 递增且 reset 保留 stamp", function () {
		useUsersStore.getState().bumpUsersRefreshStamp();
		useUsersStore.getState().bumpUsersRefreshStamp();
		expect(useUsersStore.getState().refreshStamp).toBe(2);
		useUsersStore.getState().applyListLoadResult({
			ok: true,
			profiles: [summary("a")],
		});
		useUsersStore.getState().resetUsersSession();
		const state = useUsersStore.getState();
		expect(state.profiles).toEqual([]);
		expect(state.refreshStamp).toBe(2);
	});
});
