/**
 * 模块名称：故事编辑器操作 BIS
 */
"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  useStudioStore,
  useStudioStoreShallow,
} from "@studio/store/storeContext/studioStoreContext";
import type { IStoryEditorConf } from "@studio/types/frontEnd/store/studioStore.types";
import {
  deleteStoryCard,
  downloadContentExport,
  downloadSaveGameExport,
  postRenameStoryCard,
  postValidatePackage,
  putStoryCard,
  putStoryConf,
  putStoryLayout,
  saveBlobAsFile,
} from "@studio/utils/ajaxHelper/studio.ajax";
import {
  applyExitConnection,
  buildStoryCardTemplate,
  projectExitEdges,
  removeAttachEdgeFromCard,
  stripCardReferences,
  type ExitConnectKind,
} from "@studio/bis/storyEditor/storyExitEdges.bis";
import {
  canRedoStoryEditor,
  canUndoStoryEditor,
  popRedo,
  popUndo,
  pushStoryEditorHistory,
  resetStoryEditorHistory,
  type StoryEditorCanvasSnapshot,
} from "@studio/bis/storyEditor/storyEditorHistory.bis";
import {
  computeSwimLaneAutoLayout,
  yForLaneOrder,
} from "@studio/bis/storyEditor/storyEditorLayout.bis";
import {
  allocatePastedCardId,
  cloneCardForPaste,
  getStoryEditorClipboard,
  getStoryEditorClipboardVersion,
  hasStoryEditorClipboard,
  matchStoryCards,
  PASTE_LAYOUT_OFFSET,
  requestStoryCanvasFocus,
  setStoryEditorClipboard,
  subscribeStoryEditorClipboard,
  type StoryCardSearchHit,
} from "@studio/bis/storyEditor/storyEditorCanvasP1.bis";

export function useStoryEditorActionsBis() {
  const {
    packageId,
    layout,
    conf,
    cards,
    selectedCardId,
    selectedEdgeId,
    cardDraftJson,
    confDraftJson,
    exitDraftJson,
    dirtyLayout,
    dirtyCard,
    dirtyConf,
  } = useStudioStoreShallow(function (s) {
    return {
      packageId: s.storyEditor.packageId,
      layout: s.storyEditor.layout,
      conf: s.storyEditor.conf,
      cards: s.storyEditor.cards,
      selectedCardId: s.storyEditor.selectedCardId,
      selectedEdgeId: s.storyEditor.selectedEdgeId,
      cardDraftJson: s.storyEditor.cardDraftJson,
      confDraftJson: s.storyEditor.confDraftJson,
      exitDraftJson: s.storyEditor.exitDraftJson,
      dirtyLayout: s.storyEditor.dirtyLayout,
      dirtyCard: s.storyEditor.dirtyCard,
      dirtyConf: s.storyEditor.dirtyConf,
    };
  });

  const setStoryEditorSaving = useStudioStore((s) => s.setStoryEditorSaving);
  const setStoryEditorError = useStudioStore((s) => s.setStoryEditorError);
  const setStoryEditorValidation = useStudioStore(
    (s) => s.setStoryEditorValidation,
  );
  const markStoryEditorLayoutDirty = useStudioStore(
    (s) => s.markStoryEditorLayoutDirty,
  );
  const markStoryEditorCardDirty = useStudioStore(
    (s) => s.markStoryEditorCardDirty,
  );
  const markStoryEditorConfDirty = useStudioStore(
    (s) => s.markStoryEditorConfDirty,
  );
  const bumpStoryEditorRefreshStamp = useStudioStore(
    (s) => s.bumpStoryEditorRefreshStamp,
  );
  const setStoryEditorSelectedCard = useStudioStore(
    (s) => s.setStoryEditorSelectedCard,
  );
  const upsertStoryEditorCard = useStudioStore((s) => s.upsertStoryEditorCard);
  const replaceStoryEditorConf = useStudioStore(
    (s) => s.replaceStoryEditorConf,
  );
  const applyStoryEditorCanvasState = useStudioStore(
    (s) => s.applyStoryEditorCanvasState,
  );
  const setStoryEditorLayout = useStudioStore((s) => s.setStoryEditorLayout);
  const bumpStoryEditorHistoryTick = useStudioStore(
    (s) => s.bumpStoryEditorHistoryTick,
  );
  const historyTick = useStudioStore((s) => s.storyEditor.historyTick);
  const clipboardVersion = useSyncExternalStore(
    subscribeStoryEditorClipboard,
    getStoryEditorClipboardVersion,
    getStoryEditorClipboardVersion,
  );

  const currentSnapshot = useCallback(function (): StoryEditorCanvasSnapshot | null {
    if (!conf || !layout) return null;
    return { conf, layout, cards };
  }, [conf, layout, cards]);

  const checkpoint = useCallback(
    function (): void {
      const snap = currentSnapshot();
      if (snap) {
        pushStoryEditorHistory(snap);
        bumpStoryEditorHistoryTick();
      }
    },
    [currentSnapshot, bumpStoryEditorHistoryTick],
  );

  const persistCanvasState = useCallback(
    async function (snap: StoryEditorCanvasSnapshot): Promise<boolean> {
      if (!packageId) return false;
      setStoryEditorSaving(true);
      setStoryEditorError(null);
      for (const cardId of Object.keys(cards)) {
        if (!(cardId in snap.cards)) {
          const del = await deleteStoryCard(packageId, cardId);
          if (!del.ok) {
            setStoryEditorSaving(false);
            setStoryEditorError(del.message ?? `delete card failed: ${cardId}`);
            return false;
          }
        }
      }
      const confRes = await putStoryConf(packageId, snap.conf);
      if (!confRes.ok) {
        setStoryEditorSaving(false);
        setStoryEditorError(confRes.message ?? "save conf failed");
        return false;
      }
      const layoutRes = await putStoryLayout(packageId, snap.layout);
      if (!layoutRes.ok) {
        setStoryEditorSaving(false);
        setStoryEditorError(layoutRes.message ?? "save layout failed");
        return false;
      }
      for (const [cardId, card] of Object.entries(snap.cards)) {
        const cardRes = await putStoryCard(packageId, cardId, card);
        if (!cardRes.ok) {
          setStoryEditorSaving(false);
          setStoryEditorError(cardRes.message ?? `save card failed: ${cardId}`);
          return false;
        }
      }
      setStoryEditorSaving(false);
      applyStoryEditorCanvasState(snap);
      return true;
    },
    [
      packageId,
      cards,
      setStoryEditorSaving,
      setStoryEditorError,
      applyStoryEditorCanvasState,
    ],
  );

  const validate = useCallback(
    async function (): Promise<boolean> {
      if (!packageId) return false;
      setStoryEditorSaving(true);
      setStoryEditorError(null);
      const res = await postValidatePackage(packageId);
      setStoryEditorSaving(false);
      if (!res.ok || !res.data) {
        setStoryEditorError(res.message ?? "validate failed");
        return false;
      }
      setStoryEditorValidation(res.data.report);
      return res.data.report.errors.length === 0;
    },
    [
      packageId,
      setStoryEditorSaving,
      setStoryEditorError,
      setStoryEditorValidation,
    ],
  );

  const saveLayout = useCallback(
    async function (): Promise<boolean> {
      if (!packageId || !layout) return false;
      setStoryEditorSaving(true);
      setStoryEditorError(null);
      const res = await putStoryLayout(packageId, layout);
      setStoryEditorSaving(false);
      if (!res.ok) {
        setStoryEditorError(res.message ?? "save layout failed");
        return false;
      }
      markStoryEditorLayoutDirty(false);
      return true;
    },
    [
      packageId,
      layout,
      setStoryEditorSaving,
      setStoryEditorError,
      markStoryEditorLayoutDirty,
    ],
  );

  const saveConf = useCallback(
    async function (): Promise<boolean> {
      if (!packageId) return false;
      let parsed: IStoryEditorConf;
      try {
        parsed = JSON.parse(confDraftJson) as IStoryEditorConf;
      } catch {
        setStoryEditorError("story.conf JSON 格式无效");
        return false;
      }
      if (parsed.packageId && parsed.packageId !== packageId) {
        setStoryEditorError("conf.packageId 必须与路径一致");
        return false;
      }
      const next: IStoryEditorConf = { ...parsed, packageId };
      setStoryEditorSaving(true);
      setStoryEditorError(null);
      const res = await putStoryConf(packageId, next);
      setStoryEditorSaving(false);
      if (!res.ok) {
        setStoryEditorError(res.message ?? "save conf failed");
        return false;
      }
      replaceStoryEditorConf(next);
      markStoryEditorConfDirty(false);
      bumpStoryEditorRefreshStamp();
      return true;
    },
    [
      packageId,
      confDraftJson,
      setStoryEditorSaving,
      setStoryEditorError,
      replaceStoryEditorConf,
      markStoryEditorConfDirty,
      bumpStoryEditorRefreshStamp,
    ],
  );

  const saveCard = useCallback(
    async function (): Promise<boolean> {
      if (!packageId || !selectedCardId) return false;
      let parsed: unknown;
      try {
        parsed = JSON.parse(cardDraftJson);
      } catch {
        setStoryEditorError("卡 JSON 格式无效");
        return false;
      }
      setStoryEditorSaving(true);
      setStoryEditorError(null);
      const res = await putStoryCard(packageId, selectedCardId, parsed);
      setStoryEditorSaving(false);
      if (!res.ok) {
        setStoryEditorError(res.message ?? "save card failed");
        return false;
      }
      upsertStoryEditorCard(selectedCardId, parsed);
      markStoryEditorCardDirty(false);
      return true;
    },
    [
      packageId,
      selectedCardId,
      cardDraftJson,
      setStoryEditorSaving,
      setStoryEditorError,
      upsertStoryEditorCard,
      markStoryEditorCardDirty,
    ],
  );

  const renameCard = useCallback(
    async function (newCardId: string): Promise<boolean> {
      if (!packageId || !selectedCardId) return false;
      const next = newCardId.trim();
      if (!next || next === selectedCardId) return false;
      setStoryEditorSaving(true);
      setStoryEditorError(null);
      const res = await postRenameStoryCard(packageId, selectedCardId, next);
      setStoryEditorSaving(false);
      if (!res.ok || !res.data) {
        setStoryEditorError(res.message ?? "重命名 cardId 失败");
        return false;
      }
      setStoryEditorSelectedCard(res.data.cardId);
      bumpStoryEditorRefreshStamp();
      return true;
    },
    [
      packageId,
      selectedCardId,
      setStoryEditorSaving,
      setStoryEditorError,
      setStoryEditorSelectedCard,
      bumpStoryEditorRefreshStamp,
    ],
  );

  const saveExit = useCallback(
    async function (): Promise<boolean> {
      if (!packageId || !selectedEdgeId) return false;
      const parts = selectedEdgeId.split("::");
      const sourceCardId = parts[0];
      const exitId = parts[1];
      if (!sourceCardId || !exitId) return false;
      let exitParsed: Record<string, unknown>;
      try {
        exitParsed = JSON.parse(exitDraftJson) as Record<string, unknown>;
      } catch {
        setStoryEditorError("出口 JSON 格式无效");
        return false;
      }
      const sourceRaw = cards[sourceCardId];
      if (!sourceRaw || typeof sourceRaw !== "object") return false;
      const source = sourceRaw as {
        exits?: Array<Record<string, unknown>>;
        [key: string]: unknown;
      };
      const exits = (source.exits ?? []).map(function (e) {
        if (e.exitId === exitId) {
          return { ...exitParsed, exitId };
        }
        return e;
      });
      const nextCard = { ...source, exits };
      setStoryEditorSaving(true);
      setStoryEditorError(null);
      const res = await putStoryCard(packageId, sourceCardId, nextCard);
      setStoryEditorSaving(false);
      if (!res.ok) {
        setStoryEditorError(res.message ?? "save exit failed");
        return false;
      }
      upsertStoryEditorCard(sourceCardId, nextCard);
      markStoryEditorCardDirty(false);
      return true;
    },
    [
      packageId,
      selectedEdgeId,
      exitDraftJson,
      cards,
      setStoryEditorSaving,
      setStoryEditorError,
      upsertStoryEditorCard,
      markStoryEditorCardDirty,
    ],
  );

  const connectExitEdge = useCallback(
    async function (
      sourceCardId: string,
      targetCardId: string,
      kind: ExitConnectKind,
    ): Promise<boolean> {
      if (!packageId) return false;
      if (kind === "user_dial" || kind === "outbound_callback") {
        const existing = projectExitEdges(cards).find(function (e) {
          return e.source === sourceCardId && e.target === targetCardId;
        });
        if (existing) return true;
      }
      checkpoint();
      const result = applyExitConnection(
        cards[sourceCardId],
        cards[targetCardId],
        targetCardId,
        { packageId, kind },
      );
      if (!result) {
        setStoryEditorError("无法在源卡上写入出口 effect");
        return false;
      }
      setStoryEditorSaving(true);
      setStoryEditorError(null);
      const res = await putStoryCard(packageId, sourceCardId, result.card);
      setStoryEditorSaving(false);
      if (!res.ok) {
        setStoryEditorError(res.message ?? "save edge failed");
        return false;
      }
      upsertStoryEditorCard(sourceCardId, result.card);
      return true;
    },
    [
      packageId,
      cards,
      checkpoint,
      setStoryEditorSaving,
      setStoryEditorError,
      upsertStoryEditorCard,
    ],
  );

  const disconnectExitEdge = useCallback(
    async function (edgeId: string): Promise<boolean> {
      if (!packageId) return false;
      if (edgeId.startsWith("__start__::") || edgeId.startsWith("__term__::")) {
        return true;
      }
      const parts = edgeId.split("::");
      const sourceCardId = parts[0];
      const exitId = parts[1];
      const effectId = parts[2];
      if (!sourceCardId || !exitId || !effectId) return false;
      checkpoint();
      const next = removeAttachEdgeFromCard(
        cards[sourceCardId],
        exitId,
        effectId,
      );
      if (!next) return false;
      setStoryEditorSaving(true);
      setStoryEditorError(null);
      const res = await putStoryCard(packageId, sourceCardId, next);
      setStoryEditorSaving(false);
      if (!res.ok) {
        setStoryEditorError(res.message ?? "delete edge failed");
        return false;
      }
      upsertStoryEditorCard(sourceCardId, next);
      return true;
    },
    [
      packageId,
      cards,
      checkpoint,
      setStoryEditorSaving,
      setStoryEditorError,
      upsertStoryEditorCard,
    ],
  );

  const setEntryCard = useCallback(
    async function (cardId: string): Promise<boolean> {
      if (!packageId || !conf) return false;
      if (conf.entryCardId === cardId) return true;
      checkpoint();
      const nextConf: IStoryEditorConf = { ...conf, entryCardId: cardId };
      setStoryEditorSaving(true);
      setStoryEditorError(null);
      const res = await putStoryConf(packageId, nextConf);
      setStoryEditorSaving(false);
      if (!res.ok) {
        setStoryEditorError(res.message ?? "set entry failed");
        return false;
      }
      replaceStoryEditorConf(nextConf);
      return true;
    },
    [
      packageId,
      conf,
      checkpoint,
      setStoryEditorSaving,
      setStoryEditorError,
      replaceStoryEditorConf,
    ],
  );

  const changeCardOwnerAgent = useCallback(
    async function (
      cardId: string,
      ownerAgentId: string,
      position: { x: number; y: number },
    ): Promise<boolean> {
      if (!packageId || !layout) return false;
      const raw = cards[cardId];
      if (!raw || typeof raw !== "object") return false;
      const card = raw as { ownerAgentId?: string; [key: string]: unknown };
      const ownerChanged = card.ownerAgentId !== ownerAgentId;
      checkpoint();
      const nextCards = { ...cards };
      if (ownerChanged) {
        const nextCard = { ...card, ownerAgentId };
        nextCards[cardId] = nextCard;
        setStoryEditorSaving(true);
        setStoryEditorError(null);
        const res = await putStoryCard(packageId, cardId, nextCard);
        if (!res.ok) {
          setStoryEditorSaving(false);
          setStoryEditorError(res.message ?? "update owner failed");
          return false;
        }
        upsertStoryEditorCard(cardId, nextCard);
      }
      const nextNodes = layout.nodes.map(function (n) {
        if (n.cardId !== cardId) return n;
        return { cardId, x: position.x, y: position.y };
      });
      const nextLayout = { ...layout, nodes: nextNodes };
      setStoryEditorLayout(nextLayout);
      const layoutRes = await putStoryLayout(packageId, nextLayout);
      setStoryEditorSaving(false);
      if (!layoutRes.ok) {
        setStoryEditorError(layoutRes.message ?? "save layout failed");
        return false;
      }
      markStoryEditorLayoutDirty(false);
      return true;
    },
    [
      packageId,
      layout,
      cards,
      checkpoint,
      setStoryEditorSaving,
      setStoryEditorError,
      upsertStoryEditorCard,
      setStoryEditorLayout,
      markStoryEditorLayoutDirty,
    ],
  );

  const deleteSelectedCards = useCallback(
    async function (cardIds: string[]): Promise<boolean> {
      if (!packageId || !conf || !layout || cardIds.length === 0) return false;
      const removeSet = new Set(cardIds);
      checkpoint();
      const cleanedCards = stripCardReferences(cards, removeSet);
      const nextConf: IStoryEditorConf = {
        ...conf,
        cards: conf.cards.filter(function (c) {
          return !removeSet.has(c.cardId);
        }),
        entryCardId:
          conf.entryCardId && removeSet.has(conf.entryCardId)
            ? (conf.cards.find(function (c) {
                return !removeSet.has(c.cardId);
              })?.cardId ?? undefined)
            : conf.entryCardId,
      };
      const nextLayout = {
        ...layout,
        nodes: layout.nodes.filter(function (n) {
          return !removeSet.has(n.cardId);
        }),
      };
      setStoryEditorSaving(true);
      setStoryEditorError(null);
      for (const cardId of cardIds) {
        const del = await deleteStoryCard(packageId, cardId);
        if (!del.ok) {
          setStoryEditorSaving(false);
          setStoryEditorError(del.message ?? `delete card failed: ${cardId}`);
          return false;
        }
      }
      for (const [cardId, card] of Object.entries(cleanedCards)) {
        if (JSON.stringify(card) !== JSON.stringify(cards[cardId])) {
          const res = await putStoryCard(packageId, cardId, card);
          if (!res.ok) {
            setStoryEditorSaving(false);
            setStoryEditorError(res.message ?? "cleanup refs failed");
            return false;
          }
        }
      }
      const confRes = await putStoryConf(packageId, nextConf);
      if (!confRes.ok) {
        setStoryEditorSaving(false);
        setStoryEditorError(confRes.message ?? "save conf failed");
        return false;
      }
      const layoutRes = await putStoryLayout(packageId, nextLayout);
      setStoryEditorSaving(false);
      if (!layoutRes.ok) {
        setStoryEditorError(layoutRes.message ?? "save layout failed");
        return false;
      }
      applyStoryEditorCanvasState({
        conf: nextConf,
        layout: nextLayout,
        cards: cleanedCards,
      });
      return true;
    },
    [
      packageId,
      conf,
      layout,
      cards,
      checkpoint,
      setStoryEditorSaving,
      setStoryEditorError,
      applyStoryEditorCanvasState,
    ],
  );

  const undoCanvas = useCallback(
    async function (): Promise<boolean> {
      const current = currentSnapshot();
      if (!current) return false;
      const prev = popUndo(current);
      if (!prev) return false;
      bumpStoryEditorHistoryTick();
      return persistCanvasState(prev);
    },
    [currentSnapshot, persistCanvasState, bumpStoryEditorHistoryTick],
  );

  const redoCanvas = useCallback(
    async function (): Promise<boolean> {
      const current = currentSnapshot();
      if (!current) return false;
      const next = popRedo(current);
      if (!next) return false;
      bumpStoryEditorHistoryTick();
      return persistCanvasState(next);
    },
    [currentSnapshot, persistCanvasState, bumpStoryEditorHistoryTick],
  );

  const initHistoryScope = useCallback(
    function (pkgId: string | null): void {
      resetStoryEditorHistory(pkgId);
      bumpStoryEditorHistoryTick();
    },
    [bumpStoryEditorHistoryTick],
  );

  void historyTick;
  void clipboardVersion;

  const addParticipant = useCallback(
    async function (agentId: string): Promise<boolean> {
      if (!packageId || !conf || !layout) return false;
      if (conf.participants.includes(agentId)) return true;
      const nextConf: IStoryEditorConf = {
        ...conf,
        participants: [...conf.participants, agentId],
      };
      const nextLayout = {
        ...layout,
        lanes: [
          ...layout.lanes,
          { agentId, order: layout.lanes.length },
        ],
      };
      setStoryEditorSaving(true);
      setStoryEditorError(null);
      const confRes = await putStoryConf(packageId, nextConf);
      if (!confRes.ok) {
        setStoryEditorSaving(false);
        setStoryEditorError(confRes.message ?? "save conf failed");
        return false;
      }
      const layoutRes = await putStoryLayout(packageId, nextLayout);
      setStoryEditorSaving(false);
      if (!layoutRes.ok) {
        setStoryEditorError(layoutRes.message ?? "save layout failed");
        return false;
      }
      replaceStoryEditorConf(nextConf);
      bumpStoryEditorRefreshStamp();
      return true;
    },
    [
      packageId,
      conf,
      layout,
      setStoryEditorSaving,
      setStoryEditorError,
      replaceStoryEditorConf,
      bumpStoryEditorRefreshStamp,
    ],
  );

  const createCardFromTemplate = useCallback(
    async function (ownerAgentId: string): Promise<boolean> {
      if (!packageId || !conf || !layout) return false;
      checkpoint();
      const existingIds = new Set(conf.cards.map(function (c) {
        return c.cardId;
      }));
      let n = existingIds.size + 1;
      let cardId = `${ownerAgentId.replace(/-/g, "_")}_story_${n}`;
      while (existingIds.has(cardId)) {
        n += 1;
        cardId = `${ownerAgentId.replace(/-/g, "_")}_story_${n}`;
      }
      const card = buildStoryCardTemplate({
        cardId,
        ownerAgentId,
        title: `新卡 ${cardId}`,
      });
      const nextConf: IStoryEditorConf = {
        ...conf,
        participants: conf.participants.includes(ownerAgentId)
          ? conf.participants
          : [...conf.participants, ownerAgentId],
        cards: [...conf.cards, { cardId }],
        entryCardId: conf.entryCardId ?? cardId,
      };
      const laneOrder =
        nextConf.participants.indexOf(ownerAgentId) >= 0
          ? nextConf.participants.indexOf(ownerAgentId)
          : 0;
      const nextNodes = [
        ...layout.nodes,
        {
          cardId,
          x: 200 + (layout.nodes.length % 3) * 260,
          y: yForLaneOrder(laneOrder),
        },
      ];
      const nextLayout = {
        ...layout,
        lanes: nextConf.participants.map(function (id, order) {
          const existing = layout.lanes.find(function (l) {
            return l.agentId === id;
          });
          return { agentId: id, order: existing?.order ?? order };
        }),
        nodes: nextNodes,
      };

      setStoryEditorSaving(true);
      setStoryEditorError(null);
      const cardRes = await putStoryCard(packageId, cardId, card);
      if (!cardRes.ok) {
        setStoryEditorSaving(false);
        setStoryEditorError(cardRes.message ?? "create card failed");
        return false;
      }
      const confRes = await putStoryConf(packageId, nextConf);
      if (!confRes.ok) {
        setStoryEditorSaving(false);
        setStoryEditorError(confRes.message ?? "save conf failed");
        return false;
      }
      const layoutRes = await putStoryLayout(packageId, nextLayout);
      setStoryEditorSaving(false);
      if (!layoutRes.ok) {
        setStoryEditorError(layoutRes.message ?? "save layout failed");
        return false;
      }
      bumpStoryEditorRefreshStamp();
      return true;
    },
    [
      packageId,
      conf,
      layout,
      checkpoint,
      setStoryEditorSaving,
      setStoryEditorError,
      bumpStoryEditorRefreshStamp,
    ],
  );

  const exportContent = useCallback(
    async function (): Promise<boolean> {
      if (!packageId) return false;
      setStoryEditorSaving(true);
      setStoryEditorError(null);
      const res = await downloadContentExport(packageId);
      setStoryEditorSaving(false);
      if (!res.ok || !res.blob) {
        if (res.report) {
          setStoryEditorValidation(res.report);
        }
        setStoryEditorError(res.message ?? "export blocked");
        return false;
      }
      saveBlobAsFile(res.blob, res.filename ?? `${packageId}-content.zip`);
      return true;
    },
    [packageId, setStoryEditorSaving, setStoryEditorError, setStoryEditorValidation],
  );

  const exportSaveGame = useCallback(
    async function (userId: string): Promise<boolean> {
      setStoryEditorSaving(true);
      setStoryEditorError(null);
      const res = await downloadSaveGameExport(userId);
      setStoryEditorSaving(false);
      if (!res.ok || !res.blob) {
        setStoryEditorError(res.message ?? "savegame export failed");
        return false;
      }
      saveBlobAsFile(res.blob, res.filename ?? `${userId}-profile.save.json`);
      return true;
    },
    [setStoryEditorSaving, setStoryEditorError],
  );

  const searchCards = useCallback(
    function (query: string): StoryCardSearchHit[] {
      return matchStoryCards(query, cards);
    },
    [cards],
  );

  const locateCard = useCallback(
    function (cardId: string): boolean {
      if (!cards[cardId]) return false;
      setStoryEditorSelectedCard(cardId);
      requestStoryCanvasFocus(cardId);
      return true;
    },
    [cards, setStoryEditorSelectedCard],
  );

  const copySelectedCard = useCallback(
    function (): boolean {
      if (!packageId || !selectedCardId) return false;
      const card = cards[selectedCardId];
      if (!card) return false;
      setStoryEditorClipboard({
        packageId,
        card,
        sourceCardId: selectedCardId,
      });
      return true;
    },
    [packageId, selectedCardId, cards],
  );

  const pasteClipboardCard = useCallback(
    async function (): Promise<boolean> {
      if (!packageId || !conf || !layout) return false;
      const clip = getStoryEditorClipboard(packageId);
      if (!clip) {
        setStoryEditorError("剪贴板为空或来自其他故事包（不做跨包粘贴）");
        return false;
      }
      checkpoint();
      const existingIds = new Set(
        conf.cards.map(function (c) {
          return c.cardId;
        }),
      );
      const newCardId = allocatePastedCardId(clip.sourceCardId, existingIds);
      const nextCard = cloneCardForPaste(clip.card, newCardId);
      const sourceNode = layout.nodes.find(function (n) {
        return n.cardId === clip.sourceCardId;
      });
      const nextConf: IStoryEditorConf = {
        ...conf,
        cards: [...conf.cards, { cardId: newCardId }],
      };
      const nextLayout = {
        ...layout,
        nodes: [
          ...layout.nodes,
          {
            cardId: newCardId,
            x: (sourceNode?.x ?? 200) + PASTE_LAYOUT_OFFSET,
            y: (sourceNode?.y ?? yForLaneOrder(0)) + PASTE_LAYOUT_OFFSET,
          },
        ],
      };
      const nextCards = { ...cards, [newCardId]: nextCard };

      setStoryEditorSaving(true);
      setStoryEditorError(null);
      const cardRes = await putStoryCard(packageId, newCardId, nextCard);
      if (!cardRes.ok) {
        setStoryEditorSaving(false);
        setStoryEditorError(cardRes.message ?? "paste card failed");
        return false;
      }
      const confRes = await putStoryConf(packageId, nextConf);
      if (!confRes.ok) {
        setStoryEditorSaving(false);
        setStoryEditorError(confRes.message ?? "save conf failed");
        return false;
      }
      const layoutRes = await putStoryLayout(packageId, nextLayout);
      setStoryEditorSaving(false);
      if (!layoutRes.ok) {
        setStoryEditorError(layoutRes.message ?? "save layout failed");
        return false;
      }
      applyStoryEditorCanvasState({
        conf: nextConf,
        layout: nextLayout,
        cards: nextCards,
      });
      setStoryEditorSelectedCard(newCardId);
      requestStoryCanvasFocus(newCardId);
      return true;
    },
    [
      packageId,
      conf,
      layout,
      cards,
      checkpoint,
      setStoryEditorSaving,
      setStoryEditorError,
      applyStoryEditorCanvasState,
      setStoryEditorSelectedCard,
    ],
  );

  const autoLayoutCanvas = useCallback(
    async function (): Promise<boolean> {
      if (!packageId || !conf || !layout) return false;
      checkpoint();
      const nextLayout = computeSwimLaneAutoLayout(layout, conf, cards);
      setStoryEditorSaving(true);
      setStoryEditorError(null);
      setStoryEditorLayout(nextLayout);
      const layoutRes = await putStoryLayout(packageId, nextLayout);
      setStoryEditorSaving(false);
      if (!layoutRes.ok) {
        setStoryEditorError(layoutRes.message ?? "auto layout save failed");
        return false;
      }
      markStoryEditorLayoutDirty(false);
      return true;
    },
    [
      packageId,
      conf,
      layout,
      cards,
      checkpoint,
      setStoryEditorSaving,
      setStoryEditorError,
      setStoryEditorLayout,
      markStoryEditorLayoutDirty,
    ],
  );

  return {
    validate,
    saveLayout,
    saveConf,
    saveCard,
    renameCard,
    saveExit,
    connectExitEdge,
    disconnectExitEdge,
    setEntryCard,
    changeCardOwnerAgent,
    deleteSelectedCards,
    undoCanvas,
    redoCanvas,
    canUndo: canUndoStoryEditor(),
    canRedo: canRedoStoryEditor(),
    initHistoryScope,
    checkpoint,
    addParticipant,
    createCardFromTemplate,
    exportContent,
    exportSaveGame,
    searchCards,
    locateCard,
    copySelectedCard,
    pasteClipboardCard,
    canPaste: hasStoryEditorClipboard(packageId),
    autoLayoutCanvas,
    dirtyLayout,
    dirtyCard,
    dirtyConf,
    setStoryEditorSelectedCard,
  };
}
