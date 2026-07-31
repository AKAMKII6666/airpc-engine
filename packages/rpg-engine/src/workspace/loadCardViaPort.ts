/**
 * 模块名称：经 ContentPort 按需载卡
 * 模块说明：free/schedule 用快照内存；故事章卡经 Port.readCard 并写入 Host 缓存。
 */
import type { CallCardDefinition } from "../schema/callCard.js";
import type { ContentPort } from "../ports/contentPort.js";
import { engineError, isEngineError, type EngineError } from "../host/errors.js";
import { FREE_CHAPTER_ID, SCHEDULE_CHAPTER_ID } from "../constants.js";
import {
  getFreeCard,
  getScheduleCard,
  type WorkspaceState,
} from "./loadWorkspace.js";

/**
 * 按需读卡并缓存。ContentPort 未注入 → ENGINE_INTERNAL。
 * Port 返回 null → NOT_FOUND（与迁前 loadCard 一致）。
 */
export async function loadCardViaPort(
  ws: WorkspaceState,
  contentPort: ContentPort | null,
  chapterId: string,
  cardId: string,
): Promise<CallCardDefinition | EngineError> {
  if (chapterId === FREE_CHAPTER_ID) {
    return getFreeCard(ws, cardId);
  }
  if (chapterId === SCHEDULE_CHAPTER_ID) {
    return getScheduleCard(ws, cardId);
  }
  const ch = ws.chapters.get(chapterId);
  if (!ch) {
    return engineError("NOT_FOUND", `chapter not found: ${chapterId}`);
  }
  const cached = ch.cards.get(cardId);
  if (cached) {
    return cached;
  }
  if (!contentPort) {
    return engineError(
      "ENGINE_INTERNAL",
      "ContentPort required: inject createFsContentPort (engineIOModule) or test fake",
    );
  }
  let card: CallCardDefinition | null;
  try {
    card = await contentPort.readCard({
      workspaceKey: ws.rootDir,
      chapterId,
      cardId,
    });
  } catch (err) {
    if (isEngineError(err)) {
      return err;
    }
    return engineError("ENGINE_INTERNAL", "readCard failed", err);
  }
  if (!card) {
    return engineError("NOT_FOUND", `card not found: ${chapterId}/${cardId}`);
  }
  ch.cards.set(cardId, card);
  return card;
}
