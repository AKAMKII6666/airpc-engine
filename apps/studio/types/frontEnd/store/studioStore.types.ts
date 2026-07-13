/**
 * 模块名称：StudioStore 类型（P3）
 */

export interface IStudioLayoutSlice {
  userId: string | null;
  userNickname: string | null;
  bannerError: string | null;
  schemaDialog: { open: boolean; message: string } | null;
}

export interface IStorySummary {
  packageId: string;
  title: string;
  schemaVersion: number;
  cardCount: number;
}

export interface IStoriesPackageDetail {
  packageId: string;
  title: string;
  cardIds: string[];
}

export interface IStoriesSlice {
  items: IStorySummary[];
  loading: boolean;
  error: string | null;
  refreshStamp: number;
  packageDetail: IStoriesPackageDetail | null;
  packageDetailLoading: boolean;
  packageDetailError: string | null;
  packageDetailRefreshStamp: number;
}

export interface IDebuggerSnapshot {
  userId: string;
  board: unknown;
  telephony: unknown;
  characters: unknown;
  activeSession: {
    sessionId: string;
    status: string;
    cardId: string;
    agentId: string;
    packageId: string;
    composeScene: unknown;
    selectedExit?: unknown;
    effectPlanResult?: unknown;
    outcome?: unknown;
  } | null;
  recentLogs: unknown[];
}

export interface IDebuggerSlice {
  packageId: string;
  cardId: string;
  sessionId: string | null;
  snapshot: IDebuggerSnapshot | null;
  lastEndResult: unknown;
  loading: boolean;
  error: string | null;
  answeredCompleted: boolean;
  beatChecked: boolean;
  refreshStamp: number;
}

export interface IStudioStoreState {
  layout: IStudioLayoutSlice;
  stories: IStoriesSlice;
  debugger: IDebuggerSlice;
}

export interface IStudioStoreActions {
  setLayoutUserId: (userId: string | null, nickname?: string | null) => void;
  setBannerError: (message: string | null) => void;
  setSchemaDialog: (dialog: IStudioLayoutSlice["schemaDialog"]) => void;
  applyStoriesLoadResult: (items: IStorySummary[]) => void;
  setStoriesLoading: (loading: boolean) => void;
  setStoriesError: (error: string | null) => void;
  bumpStoriesRefreshStamp: () => void;
  setStoriesPackageDetail: (detail: IStoriesPackageDetail | null) => void;
  setStoriesPackageDetailLoading: (loading: boolean) => void;
  setStoriesPackageDetailError: (error: string | null) => void;
  setDebuggerTargets: (packageId: string, cardId: string) => void;
  setDebuggerSessionId: (sessionId: string | null) => void;
  applyDebuggerSnapshot: (snapshot: IDebuggerSnapshot) => void;
  setDebuggerEndResult: (result: unknown) => void;
  setDebuggerLoading: (loading: boolean) => void;
  setDebuggerError: (error: string | null) => void;
  setDebuggerOutcomeFlags: (flags: {
    answeredCompleted: boolean;
    beatChecked: boolean;
  }) => void;
  bumpDebuggerRefreshStamp: () => void;
}

export type TStudioStore = IStudioStoreState & IStudioStoreActions;
