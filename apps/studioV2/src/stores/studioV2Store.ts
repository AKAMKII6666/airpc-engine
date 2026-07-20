/**
 * 工作台壳层状态（Zustand）。
 * 静态页阶段仅记账；不得当作 Profile / Memory 真源，不得发请求。
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
