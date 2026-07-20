/**
 * 模块名称：故事画布 P1（搜索／包内剪贴板／粘贴克隆／聚焦总线）
 * 模块说明：不改 CallCard 数据模型语义；跨包粘贴不做；多选复制分期。
 */

export interface StoryCardSearchHit {
  cardId: string;
  title: string;
  ownerAgentId: string;
}

type FocusListener = (cardId: string) => void;
type ClipboardListener = () => void;

const focusListeners = new Set<FocusListener>();
const clipboardListeners = new Set<ClipboardListener>();

/** 包内剪贴板（不做跨包粘贴） */
let packageClipboard: {
  packageId: string;
  card: unknown;
  sourceCardId: string;
} | null = null;
let clipboardVersion = 0;

function bumpClipboardVersion(): void {
  clipboardVersion += 1;
  for (const listener of clipboardListeners) {
    listener();
  }
}

export function subscribeStoryEditorClipboard(
  listener: ClipboardListener,
): () => void {
  clipboardListeners.add(listener);
  return function (): void {
    clipboardListeners.delete(listener);
  };
}

export function getStoryEditorClipboardVersion(): number {
  return clipboardVersion;
}

export function requestStoryCanvasFocus(cardId: string): void {
  for (const listener of focusListeners) {
    listener(cardId);
  }
}

export function subscribeStoryCanvasFocus(listener: FocusListener): () => void {
  focusListeners.add(listener);
  return function (): void {
    focusListeners.delete(listener);
  };
}

export function cardTitleOf(card: unknown, cardId: string): string {
  if (card && typeof card === "object" && "title" in card) {
    const title = (card as { title?: unknown }).title;
    if (typeof title === "string" && title.trim()) return title;
  }
  return cardId;
}

export function cardOwnerOf(card: unknown): string {
  if (card && typeof card === "object" && "ownerAgentId" in card) {
    const owner = (card as { ownerAgentId?: unknown }).ownerAgentId;
    if (typeof owner === "string") return owner;
  }
  return "";
}

/**
 * 按 cardId／title／ownerAgentId 子串匹配（大小写不敏感）。
 */
export function matchStoryCards(
  query: string,
  cards: Record<string, unknown>,
): StoryCardSearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: StoryCardSearchHit[] = [];
  for (const [cardId, card] of Object.entries(cards)) {
    const title = cardTitleOf(card, cardId);
    const ownerAgentId = cardOwnerOf(card);
    if (
      cardId.toLowerCase().includes(q) ||
      title.toLowerCase().includes(q) ||
      ownerAgentId.toLowerCase().includes(q)
    ) {
      hits.push({ cardId, title, ownerAgentId });
    }
  }
  hits.sort(function (a, b) {
    return a.cardId.localeCompare(b.cardId);
  });
  return hits;
}

export function setStoryEditorClipboard(payload: {
  packageId: string;
  card: unknown;
  sourceCardId: string;
}): void {
  packageClipboard = {
    packageId: payload.packageId,
    card: structuredClone(payload.card),
    sourceCardId: payload.sourceCardId,
  };
  bumpClipboardVersion();
}

export function getStoryEditorClipboard(packageId: string): {
  card: unknown;
  sourceCardId: string;
} | null {
  if (!packageClipboard || packageClipboard.packageId !== packageId) {
    return null;
  }
  return {
    card: structuredClone(packageClipboard.card),
    sourceCardId: packageClipboard.sourceCardId,
  };
}

export function hasStoryEditorClipboard(packageId: string | null): boolean {
  if (!packageId || !packageClipboard) return false;
  return packageClipboard.packageId === packageId;
}

/**
 * 为粘贴分配新 cardId：优先 `{source}_copy`，冲突则 `_copy2`…
 */
export function allocatePastedCardId(
  sourceCardId: string,
  existingIds: Set<string>,
): string {
  const base = `${sourceCardId}_copy`;
  if (!existingIds.has(base)) return base;
  let n = 2;
  while (existingIds.has(`${sourceCardId}_copy${n}`)) {
    n += 1;
  }
  return `${sourceCardId}_copy${n}`;
}

/**
 * 深拷贝卡定义并改写自身 cardId。
 * v1 出口／effect 目标：**保留指向**（不随粘贴改写、不清空）。
 */
export function cloneCardForPaste(
  sourceCard: unknown,
  newCardId: string,
): Record<string, unknown> {
  const cloned = structuredClone(sourceCard) as Record<string, unknown>;
  cloned.cardId = newCardId;
  if (typeof cloned.title === "string" && cloned.title.trim()) {
    cloned.title = `${cloned.title}（副本）`;
  } else {
    cloned.title = newCardId;
  }
  return cloned;
}

export const PASTE_LAYOUT_OFFSET = 40;
