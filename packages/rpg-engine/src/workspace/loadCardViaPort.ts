/**
 * 模块名称：经 ContentPort 按需载卡
 * 模块说明：free/schedule 用快照内存；故事包卡经 Port.readCard 并写入 Host 缓存。
 */
import type { CallCardDefinition } from "../schema/callCard.js";
import type { ContentPort } from "../ports/contentPort.js";
import { engineError, isEngineError, type EngineError } from "../host/errors.js";
import { FREE_PACKAGE_ID, SCHEDULE_PACKAGE_ID } from "../constants.js";
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
  packageId: string,
  cardId: string,
): Promise<CallCardDefinition | EngineError> {
  if (packageId === FREE_PACKAGE_ID) {
    return getFreeCard(ws, cardId);
  }
  if (packageId === SCHEDULE_PACKAGE_ID) {
    return getScheduleCard(ws, cardId);
  }
  const pkg = ws.packages.get(packageId);
  if (!pkg) {
    return engineError("NOT_FOUND", `package not found: ${packageId}`);
  }
  const cached = pkg.cards.get(cardId);
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
      packageId,
      cardId,
    });
  } catch (err) {
    if (isEngineError(err)) {
      return err;
    }
    return engineError("ENGINE_INTERNAL", "readCard failed", err);
  }
  if (!card) {
    return engineError("NOT_FOUND", `card not found: ${packageId}/${cardId}`);
  }
  pkg.cards.set(cardId, card);
  return card;
}
