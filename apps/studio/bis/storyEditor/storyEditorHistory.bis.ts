/**
 * 模块名称：故事编辑器内存撤销／重做栈（会话内，不落盘）
 */
import type {
  IStoryEditorConf,
  IStoryEditorLayout,
} from "@studio/types/frontEnd/store/studioStore.types";

export interface StoryEditorCanvasSnapshot {
  conf: IStoryEditorConf;
  layout: IStoryEditorLayout;
  cards: Record<string, unknown>;
}

const MAX_HISTORY = 40;

let past: StoryEditorCanvasSnapshot[] = [];
let future: StoryEditorCanvasSnapshot[] = [];
let packageScope: string | null = null;

function cloneSnapshot(
  snap: StoryEditorCanvasSnapshot,
): StoryEditorCanvasSnapshot {
  return {
    conf: structuredClone(snap.conf),
    layout: structuredClone(snap.layout),
    cards: structuredClone(snap.cards),
  };
}

export function resetStoryEditorHistory(packageId: string | null): void {
  past = [];
  future = [];
  packageScope = packageId;
}

export function pushStoryEditorHistory(snap: StoryEditorCanvasSnapshot): void {
  if (!snap.conf || !snap.layout) return;
  if (packageScope && snap.conf.packageId !== packageScope) {
    resetStoryEditorHistory(snap.conf.packageId);
  }
  past.push(cloneSnapshot(snap));
  if (past.length > MAX_HISTORY) {
    past.shift();
  }
  future = [];
}

export function popUndo(
  current: StoryEditorCanvasSnapshot,
): StoryEditorCanvasSnapshot | null {
  const prev = past.pop();
  if (!prev) return null;
  future.push(cloneSnapshot(current));
  return prev;
}

export function popRedo(
  current: StoryEditorCanvasSnapshot,
): StoryEditorCanvasSnapshot | null {
  const next = future.pop();
  if (!next) return null;
  past.push(cloneSnapshot(current));
  return next;
}

export function canUndoStoryEditor(): boolean {
  return past.length > 0;
}

export function canRedoStoryEditor(): boolean {
  return future.length > 0;
}
