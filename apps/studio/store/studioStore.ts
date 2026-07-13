/**
 * 模块名称：StudioStore 工厂
 */
import { createStore, type StoreApi } from "zustand/vanilla";
import type {
  IDebuggerSnapshot,
  IStoriesPackageDetail,
  IStorySummary,
  TStudioStore,
} from "@studio/types/frontEnd/store/studioStore.types";
import {
  INITIAL_DEBUGGER_SLICE,
  INITIAL_LAYOUT_SLICE,
  INITIAL_STORIES_SLICE,
} from "./studioStoreInitialValues";

export type StudioStore = TStudioStore;

export function createStudioStore(): StoreApi<StudioStore> {
  return createStore<StudioStore>()(function (set) {
    return {
      layout: { ...INITIAL_LAYOUT_SLICE },
      stories: { ...INITIAL_STORIES_SLICE },
      debugger: { ...INITIAL_DEBUGGER_SLICE },

      setLayoutUserId: function (userId, nickname = null): void {
        set(function (state) {
          return {
            layout: {
              ...state.layout,
              userId,
              userNickname: nickname,
            },
          };
        });
      },
      setBannerError: function (message): void {
        set(function (state) {
          return {
            layout: { ...state.layout, bannerError: message },
          };
        });
      },
      setSchemaDialog: function (dialog): void {
        set(function (state) {
          return {
            layout: { ...state.layout, schemaDialog: dialog },
          };
        });
      },
      applyStoriesLoadResult: function (items: IStorySummary[]): void {
        set(function (state) {
          return {
            stories: {
              ...state.stories,
              items,
              loading: false,
              error: null,
            },
          };
        });
      },
      setStoriesLoading: function (loading): void {
        set(function (state) {
          return { stories: { ...state.stories, loading } };
        });
      },
      setStoriesError: function (error): void {
        set(function (state) {
          return {
            stories: { ...state.stories, error, loading: false },
          };
        });
      },
      bumpStoriesRefreshStamp: function (): void {
        set(function (state) {
          return {
            stories: {
              ...state.stories,
              refreshStamp: state.stories.refreshStamp + 1,
            },
          };
        });
      },
      setStoriesPackageDetail: function (
        detail: IStoriesPackageDetail | null,
      ): void {
        set(function (state) {
          return {
            stories: {
              ...state.stories,
              packageDetail: detail,
              packageDetailLoading: false,
              packageDetailError: null,
            },
          };
        });
      },
      setStoriesPackageDetailLoading: function (loading): void {
        set(function (state) {
          return {
            stories: { ...state.stories, packageDetailLoading: loading },
          };
        });
      },
      setStoriesPackageDetailError: function (error): void {
        set(function (state) {
          return {
            stories: {
              ...state.stories,
              packageDetailError: error,
              packageDetailLoading: false,
            },
          };
        });
      },
      setDebuggerTargets: function (packageId, cardId): void {
        set(function (state) {
          return {
            debugger: { ...state.debugger, packageId, cardId },
          };
        });
      },
      setDebuggerSessionId: function (sessionId): void {
        set(function (state) {
          return { debugger: { ...state.debugger, sessionId } };
        });
      },
      applyDebuggerSnapshot: function (snapshot: IDebuggerSnapshot): void {
        set(function (state) {
          return {
            debugger: {
              ...state.debugger,
              snapshot,
              loading: false,
              error: null,
            },
          };
        });
      },
      setDebuggerEndResult: function (result): void {
        set(function (state) {
          return { debugger: { ...state.debugger, lastEndResult: result } };
        });
      },
      setDebuggerLoading: function (loading): void {
        set(function (state) {
          return { debugger: { ...state.debugger, loading } };
        });
      },
      setDebuggerError: function (error): void {
        set(function (state) {
          return {
            debugger: { ...state.debugger, error, loading: false },
          };
        });
      },
      setDebuggerOutcomeFlags: function (flags): void {
        set(function (state) {
          return {
            debugger: {
              ...state.debugger,
              answeredCompleted: flags.answeredCompleted,
              beatChecked: flags.beatChecked,
            },
          };
        });
      },
      bumpDebuggerRefreshStamp: function (): void {
        set(function (state) {
          return {
            debugger: {
              ...state.debugger,
              refreshStamp: state.debugger.refreshStamp + 1,
            },
          };
        });
      },
    };
  });
}
