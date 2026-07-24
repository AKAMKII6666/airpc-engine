/**
	* 工作台域账本（Zustand）。
	* 切片：侧栏工程状态 / 最近调试 / loading·error / refreshStamp；只结果型 write。
	* 故事包列表复用 packages store；禁网络、禁 import bis / ajaxProxy（STRUCT-022）。
	*/
import { create } from "zustand";
import type {
	WorkbenchSideLoadResult,
	WorkbenchSideSnapshot,
} from "@studio-v2/typeFiles/home/store/workbenchStoreState";

export type WorkbenchStoreState = {
	/**
		* 右侧工程状态 + 最近调试；null 表示尚未灌入或已 reset。
		* 静态阶段来自 mock；非磁盘真源。
		*/
	side: WorkbenchSideSnapshot | null;
	/** 侧栏灌入进行中 */
	sideLoading: boolean;
	/** 侧栏灌入失败人话；成功时 undefined */
	sideLoadError: string | undefined;
	/**
		* shell 有界重灌侧栏计数。
		* feature bump 后 shell 再灌；store 自身不读 mock。
		*/
	sideRefreshStamp: number;

	/** shell 开始灌侧栏 */
	applySideLoadStarted: () => void;
	/** shell 灌侧栏结果 */
	applySideLoadResult: (result: WorkbenchSideLoadResult) => void;
	/** feature 请求 shell 重灌侧栏 */
	bumpSideRefreshStamp: () => void;
	/** 离页或强制清空侧栏会话（保留 stamp） */
	resetWorkbenchSession: () => void;
};

function createWorkbenchSessionSlice(): Pick<
	WorkbenchStoreState,
	"side" | "sideLoading" | "sideLoadError"
> {
	return {
		side: null,
		sideLoading: false,
		sideLoadError: undefined,
	};
}

export const useWorkbenchStore = create<WorkbenchStoreState>((set) => ({
	...createWorkbenchSessionSlice(),
	sideRefreshStamp: 0,

	applySideLoadStarted() {
		set({
			sideLoading: true,
			sideLoadError: undefined,
		});
	},

	applySideLoadResult(result) {
		if (!result.ok) {
			set({
				sideLoading: false,
				sideLoadError: result.message,
				side: null,
			});
			return;
		}
		set({
			sideLoading: false,
			sideLoadError: undefined,
			side: result.side,
		});
	},

	bumpSideRefreshStamp() {
		set(function (prev) {
			return { sideRefreshStamp: prev.sideRefreshStamp + 1 };
		});
	},

	resetWorkbenchSession() {
		set(function (prev) {
			return {
				...createWorkbenchSessionSlice(),
				sideRefreshStamp: prev.sideRefreshStamp,
			};
		});
	},
}));
