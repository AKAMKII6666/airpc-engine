/**
	* 工作台壳层极薄偏好（Zustand）。
	* 仅 workspace 标题等壳 UI；禁止把列表/选中/编辑会话塞进本 store（一域一账本见 stores/<domain>/）。
	* 不得当作 Profile / Memory 真源，不得发请求 / import bis。
	*/
import { create } from "zustand";

export type StudioV2ShellState = {
	/** 当前工作区标题，仅 UI 展示 */
	workspaceTitle: string;
	setWorkspaceTitle: (title: string) => void;
};

export const useStudioV2Store = create<StudioV2ShellState>((set) => ({
	workspaceTitle: "AirPC Studio V2",
	setWorkspaceTitle(title) {
		set({ workspaceTitle: title });
	},
}));
