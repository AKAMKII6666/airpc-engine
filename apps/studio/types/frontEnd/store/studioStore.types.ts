/**
 * 模块名称：StudioStore 类型（P3）
 */

export interface IStudioLayoutSlice {
  userId: string | null;
  userNickname: string | null;
  bannerError: string | null;
  schemaDialog: { open: boolean; message: string } | null;
}

export type TStoryValidationStatus = "ok" | "warning" | "error" | "unknown";

export interface IStorySummary {
  packageId: string;
  title: string;
  schemaVersion: number;
  cardCount: number;
  validationStatus?: TStoryValidationStatus;
  errorCount?: number;
  warningCount?: number;
}

export interface ICharacterSummary {
  agentId: string;
  displayName: string;
  dialable: boolean;
  isNarrativeOnly?: boolean;
  freeCardId?: string;
}

export type TStoryEditorPanelTab = "conf" | "card" | "exit";

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

export type TDebuggerCallMode = "story" | "free";
export type TDebuggerDisplayLevel = "author" | "playtest";

export interface IDebuggerSnapshot {
  userId: string;
  board: unknown;
  telephony: unknown;
  characters: unknown;
  worldSummary?: {
    lore: unknown;
    factCount: number;
    facts: unknown[];
    knowledgeKeys: string[];
    knowledgeSample: Record<string, unknown>;
  };
  activeSession: {
    sessionId: string;
    status: string;
    cardId: string;
    agentId: string;
    packageId: string;
    resolveSource?: string;
    cardKind?: string;
    interactionPhase?: string;
    playback?: {
      clipId: string;
      resolved: boolean;
      stubUri?: string;
    } | null;
    phoneFlags?: Record<string, boolean>;
    composeScene: unknown;
    renderedPrompt?: {
      systemHard: string[];
      openingSpeakable?: string;
      openingPrivate?: string;
      speakable: string;
      private: string;
      softContext: string[];
      matchedLayerIds: string[];
      debug?: { notes?: string[] };
    };
    matchedLayerIds?: string[];
    toolPolicy?: {
      mode: string;
      allowedToolIds: string[] | null;
    } | null;
    exitCandidates?: Array<{
      candidateId: string;
      toolId: string;
      priority: number;
      registeredAt: string;
    }>;
    toolTrace?: unknown[];
    selectedExit?: unknown;
    effectPlanResult?: unknown;
    lastSimEvent?: {
      kind: string;
      promptKey: string;
      variantId: string | null;
      text: string | null;
      reason: string;
      at: string;
    } | null;
    outcome?: unknown;
  } | null;
  recentLogs: unknown[];
}

export interface IDebuggerSlice {
  callMode: TDebuggerCallMode;
  packageId: string;
  cardId: string;
  agentId: string;
  sessionId: string | null;
  snapshot: IDebuggerSnapshot | null;
  lastEndResult: unknown;
  lastToolResult: unknown;
  lastSimEvent: unknown;
  loading: boolean;
  error: string | null;
  answeredCompleted: boolean;
  beatChecked: boolean;
  /** 电话事件预填 flags（与 answeredCompleted 合并进 Outcome） */
  outcomeExtraFlags: Record<string, boolean>;
  displayLevel: TDebuggerDisplayLevel;
  revealPrivate: boolean;
  clockDeltaMinutes: number;
  localTimeOverrideEnabled: boolean;
  localNowIsoOverride: string;
  timeZone: string;
  toolId: string;
  toolTargetAgentId: string;
  memorySearchQuery: string;
  refreshStamp: number;
}

export interface IValidationIssueDto {
  ruleId: string;
  level: "error" | "warning";
  path: string;
  message: string;
}

export interface IValidationReportDto {
  packageId: string;
  errors: IValidationIssueDto[];
  warnings: IValidationIssueDto[];
}

export interface IStoryEditorLayout {
  schemaVersion: number;
  packageId: string;
  lanes: Array<{ agentId: string; order: number }>;
  nodes: Array<{ cardId: string; x: number; y: number }>;
}

export interface IStoryEditorConf {
  schemaVersion: number;
  packageId: string;
  title?: string;
  entryCardId?: string;
  participants: string[];
  cards: Array<{ cardId: string }>;
}

export interface IStoryEditorSlice {
  packageId: string | null;
  title: string;
  conf: IStoryEditorConf | null;
  layout: IStoryEditorLayout | null;
  cards: Record<string, unknown>;
  characters: ICharacterSummary[];
  selectedCardId: string | null;
  selectedEdgeId: string | null;
  panelTab: TStoryEditorPanelTab;
  cardDraftJson: string;
  confDraftJson: string;
  exitDraftJson: string;
  validation: IValidationReportDto | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  dirtyLayout: boolean;
  dirtyCard: boolean;
  dirtyConf: boolean;
  refreshStamp: number;
  historyTick: number;
}

export interface IStudioStoreState {
  layout: IStudioLayoutSlice;
  stories: IStoriesSlice;
  debugger: IDebuggerSlice;
  storyEditor: IStoryEditorSlice;
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
  setDebuggerCallMode: (mode: TDebuggerCallMode) => void;
  setDebuggerAgentId: (agentId: string) => void;
  setDebuggerToolFields: (patch: {
    toolId?: string;
    toolTargetAgentId?: string;
    memorySearchQuery?: string;
  }) => void;
  setDebuggerLastToolResult: (result: unknown) => void;
  setDebuggerLastSimEvent: (result: unknown) => void;
  setDebuggerSessionId: (sessionId: string | null) => void;
  applyDebuggerSnapshot: (snapshot: IDebuggerSnapshot) => void;
  setDebuggerEndResult: (result: unknown) => void;
  setDebuggerLoading: (loading: boolean) => void;
  setDebuggerError: (error: string | null) => void;
  setDebuggerOutcomeFlags: (flags: {
    answeredCompleted: boolean;
    beatChecked: boolean;
  }) => void;
  setDebuggerOutcomeExtraFlags: (flags: Record<string, boolean>) => void;
  setDebuggerDisplayLevel: (
    level: TDebuggerDisplayLevel,
    revealPrivate?: boolean,
  ) => void;
  setDebuggerClockDeltaMinutes: (minutes: number) => void;
  setDebuggerLocalTime: (patch: {
    overrideEnabled?: boolean;
    localNowIso?: string;
    timeZone?: string;
  }) => void;
  bumpDebuggerRefreshStamp: () => void;
  applyStoryEditorLoad: (payload: {
    packageId: string;
    title: string;
    conf: IStoryEditorConf;
    layout: IStoryEditorLayout | null;
    cards: Record<string, unknown>;
    characters?: ICharacterSummary[];
  }) => void;
  setStoryEditorCharacters: (characters: ICharacterSummary[]) => void;
  setStoryEditorSelectedCard: (cardId: string | null) => void;
  setStoryEditorSelectedEdge: (edgeId: string | null) => void;
  setStoryEditorPanelTab: (tab: TStoryEditorPanelTab) => void;
  setStoryEditorCardDraft: (json: string) => void;
  setStoryEditorConfDraft: (json: string) => void;
  setStoryEditorExitDraft: (json: string) => void;
  setStoryEditorLayoutNodes: (
    nodes: IStoryEditorLayout["nodes"],
  ) => void;
  upsertStoryEditorCard: (cardId: string, card: unknown) => void;
  replaceStoryEditorConf: (conf: IStoryEditorConf) => void;
  applyStoryEditorCanvasState: (payload: {
    conf: IStoryEditorConf;
    layout: IStoryEditorLayout;
    cards: Record<string, unknown>;
  }) => void;
  setStoryEditorLayout: (layout: IStoryEditorLayout) => void;
  setStoryEditorValidation: (report: IValidationReportDto | null) => void;
  setStoryEditorLoading: (loading: boolean) => void;
  setStoryEditorSaving: (saving: boolean) => void;
  setStoryEditorError: (error: string | null) => void;
  markStoryEditorLayoutDirty: (dirty: boolean) => void;
  markStoryEditorCardDirty: (dirty: boolean) => void;
  markStoryEditorConfDirty: (dirty: boolean) => void;
  bumpStoryEditorRefreshStamp: () => void;
  bumpStoryEditorHistoryTick: () => void;
}

export type TStudioStore = IStudioStoreState & IStudioStoreActions;
