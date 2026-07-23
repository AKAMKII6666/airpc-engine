/**
 * 模块名称：工作区状态（Host 内存缓存）
 * 模块说明：由 ContentPort.loadWorkspaceSnapshot 投影而来；引擎不再直读 fs。
 * 按需读故事卡经 ContentPort.readCard（见 loadCardViaPort）。
 */
import type { CallCardDefinition, StoryPackageConf } from "../schema/callCard.js";
import type { CharacterDef } from "../schema/character.js";
import type { WorkspaceSnapshot } from "../ports/contentPort.js";
import { engineError, type EngineError } from "../host/errors.js";
import { FREE_PACKAGE_ID, SCHEDULE_PACKAGE_ID } from "../constants.js";

export interface LoadedPackage {
  conf: StoryPackageConf;
  /**
   * 实现定位提示（本机为包目录绝对路径）；引擎不当作公共 API 拼路径读盘。
   * 读卡只经 ContentPort。
   */
  dir: string;
  /** 按需填充；不在 loadWorkspace 时预读全部卡 / layout */
  cards: Map<string, CallCardDefinition>;
}

export interface WorkspaceState {
  rootDir: string;
  packages: Map<string, LoadedPackage>;
  characters: Map<string, CharacterDef>;
  /** characters/free-cards/*.s-card.json */
  freeCards: Map<string, CallCardDefinition>;
  /** characters/schedule-cards/*.s-card.json */
  scheduleCards: Map<string, CallCardDefinition>;
}

/** Port 快照 → Host 内存 WorkspaceState（纯投影，无 IO）。 */
export function workspaceStateFromSnapshot(
  snap: WorkspaceSnapshot,
): WorkspaceState {
  const packages = new Map<string, LoadedPackage>();
  for (const pkg of snap.packages) {
    packages.set(pkg.packageId, {
      conf: pkg.conf,
      dir: pkg.packageLocator ?? "",
      cards: new Map(),
    });
  }
  const characters = new Map<string, CharacterDef>();
  for (const def of snap.characters) {
    characters.set(def.agentId, def);
  }
  const freeCards = new Map<string, CallCardDefinition>();
  for (const card of snap.freeCards) {
    freeCards.set(card.cardId, card);
  }
  const scheduleCards = new Map<string, CallCardDefinition>();
  for (const card of snap.scheduleCards) {
    scheduleCards.set(card.cardId, card);
  }
  return {
    rootDir: snap.workspaceKey,
    packages,
    characters,
    freeCards,
    scheduleCards,
  };
}

export function getFreeCard(
  ws: WorkspaceState,
  cardId: string,
): CallCardDefinition | EngineError {
  const card = ws.freeCards.get(cardId);
  if (!card) {
    return engineError("NOT_FOUND", `free card not found: ${cardId}`);
  }
  if (card.cardKind !== "free" && card.cardKind !== "schedule") {
    return engineError(
      "VALIDATION_FAILED",
      `free card ${cardId} has invalid cardKind=${card.cardKind}`,
    );
  }
  return card;
}

export function getScheduleCard(
  ws: WorkspaceState,
  cardId: string,
): CallCardDefinition | EngineError {
  const card = ws.scheduleCards.get(cardId);
  if (!card) {
    return engineError("NOT_FOUND", `schedule card not found: ${cardId}`);
  }
  if (card.cardKind !== "schedule") {
    return engineError(
      "VALIDATION_FAILED",
      `schedule card ${cardId} must be cardKind=schedule, got ${card.cardKind}`,
    );
  }
  return card;
}

/** 角色侧（free／schedule）或故事包卡；resolve pending 用 */
export function lookupCharacterSideCard(
  ws: WorkspaceState,
  packageId: string,
  cardId: string,
): CallCardDefinition | undefined {
  if (packageId === FREE_PACKAGE_ID) {
    return ws.freeCards.get(cardId);
  }
  if (packageId === SCHEDULE_PACKAGE_ID) {
    return ws.scheduleCards.get(cardId);
  }
  return ws.packages.get(packageId)?.cards.get(cardId);
}
