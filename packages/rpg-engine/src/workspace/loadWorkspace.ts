/**
 * 模块名称：工作区状态（Host 内存缓存）
 * 模块说明：由 ContentPort.loadWorkspaceSnapshot 投影而来；引擎不再直读 fs。
 * 按需读故事卡经 ContentPort.readCard（见 loadCardViaPort）。
 */
import type { CallCardDefinition, ChapterConf } from "../schema/callCard.js";
import type { CharacterDef } from "../schema/character.js";
import type { WorkspaceSnapshot } from "../ports/contentPort.js";
import { engineError, type EngineError } from "../host/errors.js";
import { FREE_CHAPTER_ID, SCHEDULE_CHAPTER_ID } from "../constants.js";

export interface LoadedChapter {
	conf: ChapterConf;
	/** 所属故事包容器 id */
	containerPackageId: string;
	/**
	 * 实现定位提示（本机为章目录绝对路径）；引擎不当作公共 API 拼路径读盘。
	 * 读卡只经 ContentPort。
	 */
	dir: string;
	/** 按需填充；不在 loadWorkspace 时预读全部卡 / layout */
	cards: Map<string, CallCardDefinition>;
}

export interface WorkspaceState {
	rootDir: string;
	/** chapterId → 章（工作区内全局唯一） */
	chapters: Map<string, LoadedChapter>;
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
	const chapters = new Map<string, LoadedChapter>();
	for (const pkg of snap.packages) {
		for (const ch of pkg.chapters) {
			chapters.set(ch.chapterId, {
				conf: ch.conf,
				containerPackageId: pkg.packageId,
				dir: ch.chapterLocator ?? "",
				cards: new Map(),
			});
		}
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
		chapters,
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

/** 角色侧（free／schedule）或故事章卡；resolve pending 用 */
export function lookupCharacterSideCard(
	ws: WorkspaceState,
	chapterId: string,
	cardId: string,
): CallCardDefinition | undefined {
	if (chapterId === FREE_CHAPTER_ID) {
		return ws.freeCards.get(cardId);
	}
	if (chapterId === SCHEDULE_CHAPTER_ID) {
		return ws.scheduleCards.get(cardId);
	}
	return ws.chapters.get(chapterId)?.cards.get(cardId);
}

/** 按 chapterId 取章 conf（内存索引） */
export function getChapterConf(
	ws: WorkspaceState,
	chapterId: string,
): ChapterConf | undefined {
	return ws.chapters.get(chapterId)?.conf;
}
