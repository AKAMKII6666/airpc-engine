/**
	* 资源库域账本（Zustand）。
	* 切片：列表 / 选中 / loading·loadError / refreshStamp；只结果型 write。
	* 禁网络、禁 import bis / ajaxProxy / next/navigation（STRUCT-022）。
	* 灌账在 shellBis；CRUD 编排在 pageBis；本文件不挂 UI。
	*/
import { create } from "zustand";
import type { AssetSummary } from "@studio-v2/typeFiles/library/assets/assetSummary";
import type { AssetsLoadResult } from "@studio-v2/typeFiles/library/assets/store/assetsStoreState";

/**
	* 刷新后选中 id：优先 preferSelectedId / 旧选中，否则首项。
	* 纯函数；供 applyListLoadResult 与单测共用。
	*/
export function pickAssetsSelectedId(
	list: readonly AssetSummary[],
	preferId: string | undefined,
	prevSelectedId: string,
): string {
	const want = preferId ?? prevSelectedId;
	if (want !== "" && list.some((a) => a.assetId === want)) {
		return want;
	}
	return list[0]?.assetId ?? "";
}

export type AssetsStoreState = {
	/** 列表投影；非磁盘 meta 全文 */
	assets: AssetSummary[];
	/** 当前选中 assetId；空串表示无选中 */
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
		* 下次成功加载时优先选中的 assetId。
		* create 成功后写入，load 成功消费后清掉。
		*/
	preferSelectedId: string | undefined;

	/** shell 开始拉列表：清错误、置 loading */
	applyListLoadStarted: () => void;
	/** shell 拉列表结果：成功灌列表并解析选中；失败只记 loadError */
	applyListLoadResult: (result: AssetsLoadResult) => void;
	/** UI 经 bis 切换选中 */
	setSelectedId: (assetId: string) => void;
	/**
		* 详情保存 / 创建后的单条 upsert。
		* 不碰 refreshStamp；调用方若需全量重拉应另 bump。
		*/
	applyAssetUpsertResult: (summary: AssetSummary) => void;
	/** feature 请求下次加载优先选中某 id（常与 bump 连用） */
	setPreferSelectedId: (assetId: string | undefined) => void;
	/** feature 请求 shell 有界重拉 */
	bumpAssetsRefreshStamp: () => void;
	/** 离页或强制清空会话 */
	resetAssetsSession: () => void;
};

function createAssetsSessionSlice(): Pick<
	AssetsStoreState,
	| "assets"
	| "selectedId"
	| "loading"
	| "loadError"
	| "preferSelectedId"
> {
	return {
		assets: [],
		selectedId: "",
		loading: false,
		loadError: undefined,
		preferSelectedId: undefined,
	};
}

export const useAssetsStore = create<AssetsStoreState>((set) => ({
	...createAssetsSessionSlice(),
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
				assets: [],
				selectedId: "",
			});
			return;
		}
		set(function (prev) {
			const list = [...result.assets];
			const selectedId = pickAssetsSelectedId(
				list,
				prev.preferSelectedId,
				prev.selectedId,
			);
			return {
				loading: false,
				loadError: undefined,
				assets: list,
				selectedId,
				preferSelectedId: undefined,
			};
		});
	},

	setSelectedId(assetId) {
		set({ selectedId: assetId });
	},

	applyAssetUpsertResult(summary) {
		set(function (prev) {
			const idx = prev.assets.findIndex(
				(a) => a.assetId === summary.assetId,
			);
			const next =
				idx < 0
					? [...prev.assets, summary]
					: prev.assets.map(function (a, i) {
							return i === idx ? summary : a;
						});
			return {
				assets: next,
				selectedId: summary.assetId,
			};
		});
	},

	setPreferSelectedId(assetId) {
		set({ preferSelectedId: assetId });
	},

	bumpAssetsRefreshStamp() {
		set(function (prev) {
			return { refreshStamp: prev.refreshStamp + 1 };
		});
	},

	resetAssetsSession() {
		set(function (prev) {
			return {
				...createAssetsSessionSlice(),
				refreshStamp: prev.refreshStamp,
			};
		});
	},
}));
