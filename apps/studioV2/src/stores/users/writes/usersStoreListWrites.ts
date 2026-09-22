/**
	* users 列表 / 选中 / stamp / reset 结果型 write。
	*/
import type { StoreApi } from "zustand";
import type { UserProfileSummary } from "@studio-v2/typeFiles/library/users/summary/userProfileSummary";
import type { UsersLoadResult } from "@studio-v2/typeFiles/library/users/store/usersStoreState";
import {
	createUsersSessionSlice,
	pickUsersSelectedId,
	type UsersStoreState,
} from "@studio-v2/src/stores/users/model/usersStoreModel";

type UsersSet = StoreApi<UsersStoreState>["setState"];

/** 列表灌账（started / result） */
function createUsersListLoadActions(
	set: UsersSet,
): Pick<UsersStoreState, "applyListLoadStarted" | "applyListLoadResult"> {
	return {
		applyListLoadStarted() {
			set({
				loading: true,
				loadError: undefined,
			});
		},

		applyListLoadResult(result: UsersLoadResult) {
			if (!result.ok) {
				set({
					loading: false,
					loadError: result.message,
					profiles: [],
					selectedId: "",
				});
				return;
			}
			set(function (prev) {
				const list = [...result.profiles];
				const selectedId = pickUsersSelectedId(
					list,
					prev.preferSelectedId,
					prev.selectedId,
				);
				return {
					loading: false,
					loadError: undefined,
					profiles: list,
					selectedId,
					preferSelectedId: undefined,
				};
			});
		},
	};
}

/** 选中、upsert、prefer、stamp、reset */
function createUsersListMutationActions(
	set: UsersSet,
): Pick<
	UsersStoreState,
	| "setSelectedId"
	| "applyUserUpsertResult"
	| "setPreferSelectedId"
	| "bumpUsersRefreshStamp"
	| "resetUsersSession"
> {
	return {
		setSelectedId(userId) {
			set({ selectedId: userId });
		},

		applyUserUpsertResult(summary: UserProfileSummary) {
			set(function (prev) {
				const idx = prev.profiles.findIndex(
					(u) => u.userId === summary.userId,
				);
				const next =
					idx < 0
						? [...prev.profiles, summary]
						: prev.profiles.map(function (u, i) {
								return i === idx ? summary : u;
							});
				return {
					profiles: next,
					selectedId: summary.userId,
				};
			});
		},

		setPreferSelectedId(userId) {
			set({ preferSelectedId: userId });
		},

		bumpUsersRefreshStamp() {
			set(function (prev) {
				return { refreshStamp: prev.refreshStamp + 1 };
			});
		},

		resetUsersSession() {
			set(function (prev) {
				return {
					...createUsersSessionSlice(),
					refreshStamp: prev.refreshStamp,
				};
			});
		},
	};
}

/** 列表灌账、选中、upsert、stamp、reset */
export function createUsersListActions(
	set: UsersSet,
): Pick<
	UsersStoreState,
	| "applyListLoadStarted"
	| "applyListLoadResult"
	| "setSelectedId"
	| "applyUserUpsertResult"
	| "setPreferSelectedId"
	| "bumpUsersRefreshStamp"
	| "resetUsersSession"
> {
	return {
		...createUsersListLoadActions(set),
		...createUsersListMutationActions(set),
	};
}
