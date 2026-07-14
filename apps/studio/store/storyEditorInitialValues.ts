/**
 * 模块名称：StoryEditor 初值
 */
import type { IStoryEditorSlice } from "@studio/types/frontEnd/store/studioStore.types";

export const INITIAL_STORY_EDITOR_SLICE: IStoryEditorSlice = {
  packageId: null,
  title: "",
  conf: null,
  layout: null,
  cards: {},
  characters: [],
  selectedCardId: null,
  selectedEdgeId: null,
  panelTab: "card",
  cardDraftJson: "",
  confDraftJson: "",
  exitDraftJson: "",
  validation: null,
  loading: false,
  saving: false,
  error: null,
  dirtyLayout: false,
  dirtyCard: false,
  dirtyConf: false,
  refreshStamp: 0,
  historyTick: 0,
};
