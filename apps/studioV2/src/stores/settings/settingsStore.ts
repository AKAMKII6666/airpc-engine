/**
	* 设置域账本（Zustand）。
	* 切片：整包偏好快照 / loading·error / refreshStamp；只结果型 write。
	* 禁网络、禁 import bis / ajaxProxy / next/navigation（STRUCT-022）。
	* 灌账在 shellBis；分类选中等 UI 瞬时态不进本 store。
	*/
import { create } from "zustand";
import type {
	SettingsLoadResult,
	SettingsSnapshot,
} from "@studio-v2/typeFiles/settings/store/settingsStoreState";

export type SettingsStoreState = {
	/**
		* 设置整包快照；null 表示尚未灌入或已 reset。
		* 静态阶段来自 mock；不写盘、非引擎真源。
		*/
	snapshot: SettingsSnapshot | null;
	/** 灌入进行中 */
	loading: boolean;
	/** 灌入失败人话；成功时 undefined */
	loadError: string | undefined;
	/**
		* shell 有界重灌计数。
		* feature bump 后 shell 再灌；store 自身不读 mock。
		*/
	refreshStamp: number;

	/** shell 开始灌设置 */
	applyLoadStarted: () => void;
	/** shell 灌设置结果 */
	applyLoadResult: (result: SettingsLoadResult) => void;
	/** feature 请求 shell 重灌 */
	bumpSettingsRefreshStamp: () => void;
	/** 离页或强制清空（保留 stamp） */
	resetSettingsSession: () => void;
};

function createSettingsSessionSlice(): Pick<
	SettingsStoreState,
	"snapshot" | "loading" | "loadError"
> {
	return {
		snapshot: null,
		loading: false,
		loadError: undefined,
	};
}

export const useSettingsStore = create<SettingsStoreState>((set) => ({
	...createSettingsSessionSlice(),
	refreshStamp: 0,

	applyLoadStarted() {
		set({
			loading: true,
			loadError: undefined,
		});
	},

	applyLoadResult(result) {
		if (!result.ok) {
			set({
				loading: false,
				loadError: result.message,
				snapshot: null,
			});
			return;
		}
		set({
			loading: false,
			loadError: undefined,
			snapshot: result.snapshot,
		});
	},

	bumpSettingsRefreshStamp() {
		set(function (prev) {
			return { refreshStamp: prev.refreshStamp + 1 };
		});
	},

	resetSettingsSession() {
		set(function (prev) {
			return {
				...createSettingsSessionSlice(),
				refreshStamp: prev.refreshStamp,
			};
		});
	},
}));
