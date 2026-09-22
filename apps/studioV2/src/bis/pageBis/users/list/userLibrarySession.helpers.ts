/**
	* 用户库列表：store 切片（从 session bis 抽出以降函数行数）。
	*/
"use client";

import { useUsersStore } from "@studio-v2/src/stores/users/usersStore";
import { useStudioSessionStore } from "@studio-v2/src/stores/studioSession/studioSessionStore";
import type { UserProfileSummary } from "@studio-v2/typeFiles/library/users/summary/userProfileSummary";

/** 用户库列表会话所需的 store 投影与写口 */
export type UserLibraryStoreSlice = {
	/** UserLibraryStoreSlice.profiles：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	profiles: UserProfileSummary[];
	/** UserLibraryStoreSlice.selectedId：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	selectedId: string;
	/** UserLibraryStoreSlice.loading：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	loading: boolean;
	/** UserLibraryStoreSlice.loadError：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	loadError: string | undefined;
	/** UserLibraryStoreSlice.setSelectedIdStore：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	setSelectedIdStore: (userId: string) => void;
	/** UserLibraryStoreSlice.applyUserUpsertResult：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	applyUserUpsertResult: (next: UserProfileSummary) => void;
	/** UserLibraryStoreSlice.setPreferSelectedId：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	setPreferSelectedId: (userId: string) => void;
	/** UserLibraryStoreSlice.bumpUsersRefreshStamp：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	bumpUsersRefreshStamp: () => void;
	/** UserLibraryStoreSlice.setCurrentUser：由所属 store 或 bis 持有；可空与刷新时序不在 UI 解释。 */
	setCurrentUser: (user: { userId: string; nickname: string }) => void;
};

/** 订 users + studioSession 切片；禁止 UI 直读 store。 */
export function useUserLibraryStoreSlice(): UserLibraryStoreSlice {
	const profiles = useUsersStore(function (s) {
		return s.profiles;
	});
	const selectedId = useUsersStore(function (s) {
		return s.selectedId;
	});
	const loading = useUsersStore(function (s) {
		return s.loading;
	});
	const loadError = useUsersStore(function (s) {
		return s.loadError;
	});
	const setSelectedIdStore = useUsersStore(function (s) {
		return s.setSelectedId;
	});
	const applyUserUpsertResult = useUsersStore(function (s) {
		return s.applyUserUpsertResult;
	});
	const setPreferSelectedId = useUsersStore(function (s) {
		return s.setPreferSelectedId;
	});
	const bumpUsersRefreshStamp = useUsersStore(function (s) {
		return s.bumpUsersRefreshStamp;
	});
	const setCurrentUser = useStudioSessionStore(function (s) {
		return s.setCurrentUser;
	});
	return {
		profiles,
		selectedId,
		loading,
		loadError,
		setSelectedIdStore,
		applyUserUpsertResult,
		setPreferSelectedId,
		bumpUsersRefreshStamp,
		setCurrentUser,
	};
}
