/**
	* 用户库域账本（Zustand）。
	* 切片：列表 / 选中 / loading·loadError / refreshStamp；只结果型 write。
	* 禁网络、禁 import bis / ajaxProxy / next/navigation（STRUCT-022）。
	* 灌账在 shellBis；CRUD 编排在 pageBis；本文件不挂 UI。
	*/
import { create } from "zustand";
import type { UserProfileSummary } from "@studio-v2/typeFiles/library/users/userProfileSummary";
import type { UsersLoadResult } from "@studio-v2/typeFiles/library/users/store/usersStoreState";

/**
	* 刷新后选中 id：优先 preferSelectedId / 旧选中，否则首项。
	* 纯函数；供 applyListLoadResult 与单测共用。
	*/
export function pickUsersSelectedId(
	list: readonly UserProfileSummary[],
	preferId: string | undefined,
	prevSelectedId: string,
): string {
	const want = preferId ?? prevSelectedId;
	if (want !== "" && list.some((u) => u.userId === want)) {
		return want;
	}
	return list[0]?.userId ?? "";
}

export type UsersStoreState = {
	/** 列表投影；非 Profile 全文 */
	profiles: UserProfileSummary[];
	/** 当前选中 userId；空串表示无选中 */
	selectedId: string;
	/** 列表 GET 进行中 */
	loading: boolean;
	/** 列表加载失败人话；成功时 undefined */
	loadError: string | undefined;
	/**
		* shell 有界重拉计数。
		* feature bump 后 shell 再拉；store 自身不发请求。
		*/
	refreshStamp: number;
	/**
		* 下次成功加载时优先选中的 userId。
		* create 成功后写入，load 成功消费后清掉。
		*/
	preferSelectedId: string | undefined;

	/** shell 开始拉列表：清错误、置 loading */
	applyListLoadStarted: () => void;
	/** shell 拉列表结果：成功灌列表并解析选中；失败只记 loadError */
	applyListLoadResult: (result: UsersLoadResult) => void;
	/** UI 经 bis 切换选中 */
	setSelectedId: (userId: string) => void;
	/**
		* 详情保存 / 创建后的单条 upsert。
		* 不碰 refreshStamp；调用方若需全量重拉应另 bump。
		*/
	applyUserUpsertResult: (summary: UserProfileSummary) => void;
	/** feature 请求下次加载优先选中某 id（常与 bump 连用） */
	setPreferSelectedId: (userId: string | undefined) => void;
	/** feature 请求 shell 有界重拉 */
	bumpUsersRefreshStamp: () => void;
	/** 离页或强制清空会话 */
	resetUsersSession: () => void;
};

function createUsersSessionSlice(): Pick<
	UsersStoreState,
	| "profiles"
	| "selectedId"
	| "loading"
	| "loadError"
	| "preferSelectedId"
> {
	return {
		profiles: [],
		selectedId: "",
		loading: false,
		loadError: undefined,
		preferSelectedId: undefined,
	};
}

export const useUsersStore = create<UsersStoreState>((set) => ({
	...createUsersSessionSlice(),
	refreshStamp: 0,

	applyListLoadStarted() {
		set({
			loading: true,
			loadError: undefined,
		});
	},

	applyListLoadResult(result) {
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

	setSelectedId(userId) {
		set({ selectedId: userId });
	},

	applyUserUpsertResult(summary) {
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
}));
