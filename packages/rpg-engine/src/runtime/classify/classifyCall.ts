/**
 * 统一通话叙事分类（休整 REST-E5）。
 * begin/end/StorySave/ActiveStoryLock/FreePostPipeline 共用，避免 begin/end 各写一套条件。
 */
import { FREE_CHAPTER_ID, SCHEDULE_CHAPTER_ID } from "../../constants.js";
import type { CardKind } from "../../schema/call/callCard.js";

export type CallClassifyInput = {
	chapterId?: string | null;
	cardKind?: CardKind | string | null;
	/** resolve 来源：story_pending / free / simulate 等 */
	source?: string | null;
};

export type CallClassifyResult = {
	/** 是否剧情通话（应激活 StorySave / ActiveStoryLock） */
	isNarrative: boolean;
	/** 是否走 FreeCallPostPipeline（含 ScheduleCard） */
	isFreeLike: boolean;
	/** ScheduleCard / __schedule__ 哨兵 */
	isSchedule: boolean;
};

function isScheduleCall(
	chapterId: string,
	cardKind: string,
): boolean {
	return cardKind === "schedule" || chapterId === SCHEDULE_CHAPTER_ID;
}

function isFreeLikeCall(
	chapterId: string,
	cardKind: string,
	source: string,
	isSchedule: boolean,
): boolean {
	if (isSchedule) return true;
	if (cardKind === "free") return true;
	if (chapterId === FREE_CHAPTER_ID) return true;
	return source === "free";
}

function isNarrativeChapterId(chapterId: string): boolean {
	if (chapterId === "") return false;
	if (chapterId === FREE_CHAPTER_ID) return false;
	if (chapterId === SCHEDULE_CHAPTER_ID) return false;
	return true;
}

function isNarrativeCall(
	chapterId: string,
	cardKind: string,
	source: string,
	isFreeLike: boolean,
): boolean {
	if (isFreeLike) return false;
	if (cardKind === "story") return true;
	if (source === "story_pending") return true;
	if (source === "simulate") return true;
	return isNarrativeChapterId(chapterId);
}

/**
 * StoryCard / story_pending / simulate story → narrative。
 * FreeCard / ScheduleCard / __free__ / __schedule__ → free-like，非 narrative。
 */
export function classifyCall(input: CallClassifyInput): CallClassifyResult {
	const chapterId = input.chapterId ?? "";
	const cardKind = input.cardKind ?? "";
	const source = input.source ?? "";
	const isSchedule = isScheduleCall(chapterId, cardKind);
	const isFreeLike = isFreeLikeCall(chapterId, cardKind, source, isSchedule);
	const isNarrative = isNarrativeCall(chapterId, cardKind, source, isFreeLike);
	return { isNarrative, isFreeLike, isSchedule };
}
