/**
 * 模块名称：StudioStore 初值
 */
import type {
  IDebuggerSlice,
  IStoriesSlice,
  IStudioLayoutSlice,
} from "@studio/types/frontEnd/store/studioStore.types";

export const INITIAL_LAYOUT_SLICE: IStudioLayoutSlice = {
  userId: null,
  userNickname: null,
  bannerError: null,
  schemaDialog: null,
};

export const INITIAL_STORIES_SLICE: IStoriesSlice = {
  items: [],
  loading: false,
  error: null,
  refreshStamp: 0,
  packageDetail: null,
  packageDetailLoading: false,
  packageDetailError: null,
  packageDetailRefreshStamp: 0,
};

export const INITIAL_DEBUGGER_SLICE: IDebuggerSlice = {
  packageId: "golden_handoff",
  cardId: "doubao_intro_outbound",
  sessionId: null,
  snapshot: null,
  lastEndResult: null,
  loading: false,
  error: null,
  answeredCompleted: true,
  beatChecked: true,
  refreshStamp: 0,
};
