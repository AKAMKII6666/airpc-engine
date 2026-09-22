/**
	* 用户库域账本（Zustand）。
	* 切片：列表 / 选中 / loading·loadError / refreshStamp；只结果型 write。
	* 禁网络、禁 import bis / ajaxProxy / next/navigation（STRUCT-022）。
	* 灌账在 shellBis；CRUD 编排在 pageBis；本文件不挂 UI。
	*/
import { create } from "zustand";
import {
	createUsersSessionSlice,
	type UsersStoreState,
} from "@studio-v2/src/stores/users/model/usersStoreModel";
import { createUsersListActions } from "@studio-v2/src/stores/users/writes/usersStoreListWrites";

export type { UsersStoreState } from "@studio-v2/src/stores/users/model/usersStoreModel";
export { pickUsersSelectedId } from "@studio-v2/src/stores/users/model/usersStoreModel";

export const useUsersStore = create<UsersStoreState>((set) => ({
	...createUsersSessionSlice(),
	refreshStamp: 0,
	...createUsersListActions(set),
}));
