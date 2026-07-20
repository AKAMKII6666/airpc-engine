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
  callMode: "story",
  packageId: "golden_handoff",
  cardId: "doubao_intro_outbound",
  agentId: "doubao-sister",
  sessionId: null,
  snapshot: null,
  lastEndResult: null,
  lastToolResult: null,
  lastSimEvent: null,
  chatTurns: [],
  chatDraft: "",
  chatStreaming: false,
  loading: false,
  error: null,
  answeredCompleted: true,
  beatChecked: true,
  outcomeExtraFlags: {},
  displayLevel: "author",
  revealPrivate: false,
  clockDeltaMinutes: 10,
  localTimeOverrideEnabled: true,
  localNowIsoOverride: "2026-07-13T16:00:00+08:00",
  timeZone: "Asia/Shanghai",
  toolId: "share_expert_number",
  toolTargetAgentId: "xiaoyu",
  memorySearchQuery: "Free call",
  refreshStamp: 0,
};
