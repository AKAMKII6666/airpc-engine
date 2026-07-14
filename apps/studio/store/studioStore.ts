/**
 * 模块名称：StudioStore 工厂
 */
import { createStore, type StoreApi } from "zustand/vanilla";
import type {
  IDebuggerSnapshot,
  IStoriesPackageDetail,
  IStorySummary,
  TDebuggerCallMode,
  TStudioStore,
} from "@studio/types/frontEnd/store/studioStore.types";
import {
  INITIAL_DEBUGGER_SLICE,
  INITIAL_LAYOUT_SLICE,
  INITIAL_STORIES_SLICE,
} from "./studioStoreInitialValues";
import { INITIAL_STORY_EDITOR_SLICE } from "./storyEditorInitialValues";

export type StudioStore = TStudioStore;

export function createStudioStore(): StoreApi<StudioStore> {
  return createStore<StudioStore>()(function (set) {
    return {
      layout: { ...INITIAL_LAYOUT_SLICE },
      stories: { ...INITIAL_STORIES_SLICE },
      debugger: { ...INITIAL_DEBUGGER_SLICE },
      storyEditor: { ...INITIAL_STORY_EDITOR_SLICE },

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
      setDebuggerCallMode: function (mode: TDebuggerCallMode): void {
        set(function (state) {
          return { debugger: { ...state.debugger, callMode: mode } };
        });
      },
      setDebuggerAgentId: function (agentId): void {
        set(function (state) {
          return { debugger: { ...state.debugger, agentId } };
        });
      },
      setDebuggerToolFields: function (patch): void {
        set(function (state) {
          return {
            debugger: {
              ...state.debugger,
              toolId: patch.toolId ?? state.debugger.toolId,
              toolTargetAgentId:
                patch.toolTargetAgentId ?? state.debugger.toolTargetAgentId,
              memorySearchQuery:
                patch.memorySearchQuery ?? state.debugger.memorySearchQuery,
            },
          };
        });
      },
      setDebuggerLastToolResult: function (result): void {
        set(function (state) {
          return { debugger: { ...state.debugger, lastToolResult: result } };
        });
      },
      setDebuggerLastSimEvent: function (result): void {
        set(function (state) {
          return { debugger: { ...state.debugger, lastSimEvent: result } };
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
      setDebuggerOutcomeExtraFlags: function (flags): void {
        set(function (state) {
          return {
            debugger: {
              ...state.debugger,
              outcomeExtraFlags: flags,
            },
          };
        });
      },
      setDebuggerDisplayLevel: function (level, revealPrivate): void {
        set(function (state) {
          return {
            debugger: {
              ...state.debugger,
              displayLevel: level,
              revealPrivate:
                revealPrivate !== undefined
                  ? revealPrivate
                  : level === "author"
                    ? false
                    : state.debugger.revealPrivate,
            },
          };
        });
      },
      setDebuggerClockDeltaMinutes: function (minutes): void {
        set(function (state) {
          return {
            debugger: {
              ...state.debugger,
              clockDeltaMinutes: minutes,
            },
          };
        });
      },
      setDebuggerLocalTime: function (patch): void {
        set(function (state) {
          return {
            debugger: {
              ...state.debugger,
              localTimeOverrideEnabled:
                patch.overrideEnabled ??
                state.debugger.localTimeOverrideEnabled,
              localNowIsoOverride:
                patch.localNowIso ?? state.debugger.localNowIsoOverride,
              timeZone: patch.timeZone ?? state.debugger.timeZone,
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

      applyStoryEditorLoad: function (payload): void {
        set(function () {
          return {
            storyEditor: {
              ...INITIAL_STORY_EDITOR_SLICE,
              packageId: payload.packageId,
              title: payload.title,
              conf: payload.conf,
              layout: payload.layout,
              cards: payload.cards,
              characters: payload.characters ?? [],
              confDraftJson: JSON.stringify(payload.conf, null, 2),
              loading: false,
              error: null,
              dirtyLayout: false,
              dirtyCard: false,
              dirtyConf: false,
            },
          };
        });
      },
      setStoryEditorCharacters: function (characters): void {
        set(function (state) {
          return {
            storyEditor: { ...state.storyEditor, characters },
          };
        });
      },
      setStoryEditorSelectedCard: function (cardId): void {
        set(function (state) {
          const card = cardId ? state.storyEditor.cards[cardId] : null;
          return {
            storyEditor: {
              ...state.storyEditor,
              selectedCardId: cardId,
              selectedEdgeId: null,
              panelTab: "card" as const,
              cardDraftJson: card
                ? JSON.stringify(card, null, 2)
                : "",
              dirtyCard: false,
            },
          };
        });
      },
      setStoryEditorSelectedEdge: function (edgeId): void {
        set(function (state) {
          if (!edgeId) {
            return {
              storyEditor: {
                ...state.storyEditor,
                selectedEdgeId: null,
              },
            };
          }
          const parts = edgeId.split("::");
          const sourceCardId = parts[0] ?? "";
          const exitId = parts[1] ?? "";
          const card = state.storyEditor.cards[sourceCardId] as
            | { exits?: Array<{ exitId: string }> }
            | undefined;
          const exit = card?.exits?.find(function (e) {
            return e.exitId === exitId;
          });
          return {
            storyEditor: {
              ...state.storyEditor,
              selectedEdgeId: edgeId,
              selectedCardId: sourceCardId || state.storyEditor.selectedCardId,
              panelTab: "exit" as const,
              exitDraftJson: exit ? JSON.stringify(exit, null, 2) : "",
            },
          };
        });
      },
      setStoryEditorPanelTab: function (tab): void {
        set(function (state) {
          return {
            storyEditor: { ...state.storyEditor, panelTab: tab },
          };
        });
      },
      setStoryEditorCardDraft: function (json): void {
        set(function (state) {
          return {
            storyEditor: {
              ...state.storyEditor,
              cardDraftJson: json,
              dirtyCard: true,
            },
          };
        });
      },
      setStoryEditorConfDraft: function (json): void {
        set(function (state) {
          return {
            storyEditor: {
              ...state.storyEditor,
              confDraftJson: json,
              dirtyConf: true,
            },
          };
        });
      },
      setStoryEditorExitDraft: function (json): void {
        set(function (state) {
          return {
            storyEditor: {
              ...state.storyEditor,
              exitDraftJson: json,
              dirtyCard: true,
            },
          };
        });
      },
      setStoryEditorLayoutNodes: function (nodes): void {
        set(function (state) {
          if (!state.storyEditor.layout) return state;
          return {
            storyEditor: {
              ...state.storyEditor,
              layout: {
                ...state.storyEditor.layout,
                nodes,
              },
              dirtyLayout: true,
            },
          };
        });
      },
      upsertStoryEditorCard: function (cardId, card): void {
        set(function (state) {
          return {
            storyEditor: {
              ...state.storyEditor,
              cards: {
                ...state.storyEditor.cards,
                [cardId]: card,
              },
              cardDraftJson:
                state.storyEditor.selectedCardId === cardId
                  ? JSON.stringify(card, null, 2)
                  : state.storyEditor.cardDraftJson,
            },
          };
        });
      },
      replaceStoryEditorConf: function (conf): void {
        set(function (state) {
          return {
            storyEditor: {
              ...state.storyEditor,
              conf,
              title: conf.title ?? conf.packageId,
              confDraftJson: JSON.stringify(conf, null, 2),
              dirtyConf: false,
            },
          };
        });
      },
      applyStoryEditorCanvasState: function (payload): void {
        set(function (state) {
          const selected =
            state.storyEditor.selectedCardId &&
            payload.cards[state.storyEditor.selectedCardId]
              ? state.storyEditor.selectedCardId
              : (payload.conf.cards[0]?.cardId ?? null);
          const card = selected ? payload.cards[selected] : null;
          return {
            storyEditor: {
              ...state.storyEditor,
              conf: payload.conf,
              layout: payload.layout,
              cards: payload.cards,
              title: payload.conf.title ?? payload.conf.packageId,
              confDraftJson: JSON.stringify(payload.conf, null, 2),
              selectedCardId: selected,
              selectedEdgeId: null,
              cardDraftJson: card ? JSON.stringify(card, null, 2) : "",
              dirtyLayout: false,
              dirtyCard: false,
              dirtyConf: false,
            },
          };
        });
      },
      setStoryEditorLayout: function (layout): void {
        set(function (state) {
          return {
            storyEditor: {
              ...state.storyEditor,
              layout,
              dirtyLayout: true,
            },
          };
        });
      },
      setStoryEditorValidation: function (report): void {
        set(function (state) {
          return {
            storyEditor: {
              ...state.storyEditor,
              validation: report,
            },
          };
        });
      },
      setStoryEditorLoading: function (loading): void {
        set(function (state) {
          return {
            storyEditor: { ...state.storyEditor, loading },
          };
        });
      },
      setStoryEditorSaving: function (saving): void {
        set(function (state) {
          return {
            storyEditor: { ...state.storyEditor, saving },
          };
        });
      },
      setStoryEditorError: function (error): void {
        set(function (state) {
          return {
            storyEditor: {
              ...state.storyEditor,
              error,
              loading: false,
              saving: false,
            },
          };
        });
      },
      markStoryEditorLayoutDirty: function (dirty): void {
        set(function (state) {
          return {
            storyEditor: { ...state.storyEditor, dirtyLayout: dirty },
          };
        });
      },
      markStoryEditorCardDirty: function (dirty): void {
        set(function (state) {
          return {
            storyEditor: { ...state.storyEditor, dirtyCard: dirty },
          };
        });
      },
      markStoryEditorConfDirty: function (dirty): void {
        set(function (state) {
          return {
            storyEditor: { ...state.storyEditor, dirtyConf: dirty },
          };
        });
      },
      bumpStoryEditorRefreshStamp: function (): void {
        set(function (state) {
          return {
            storyEditor: {
              ...state.storyEditor,
              refreshStamp: state.storyEditor.refreshStamp + 1,
            },
          };
        });
      },
      bumpStoryEditorHistoryTick: function (): void {
        set(function (state) {
          return {
            storyEditor: {
              ...state.storyEditor,
              historyTick: state.storyEditor.historyTick + 1,
            },
          };
        });
      },
    };
  });
}
