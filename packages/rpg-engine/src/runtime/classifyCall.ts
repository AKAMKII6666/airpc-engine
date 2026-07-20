/**
 * 统一通话叙事分类（休整 REST-E5）。
 * begin/end/StorySave/ActiveStoryLock/FreePostPipeline 共用，避免 begin/end 各写一套条件。
 */
import { FREE_PACKAGE_ID, SCHEDULE_PACKAGE_ID } from "../constants.js";
import type { CardKind } from "../schema/callCard.js";

export type CallClassifyInput = {
  packageId?: string | null;
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

/**
 * StoryCard / story_pending / simulate story → narrative。
 * FreeCard / ScheduleCard / __free__ / __schedule__ → free-like，非 narrative。
 */
export function classifyCall(input: CallClassifyInput): CallClassifyResult {
  const packageId = input.packageId ?? "";
  const cardKind = input.cardKind ?? "";
  const source = input.source ?? "";

  const isSchedule =
    cardKind === "schedule" || packageId === SCHEDULE_PACKAGE_ID;

  const isFreeLike =
    isSchedule ||
    cardKind === "free" ||
    packageId === FREE_PACKAGE_ID ||
    source === "free";

  // story_pending 挂的可能是 schedule pending；schedule 优先判为非剧情
  const isNarrative =
    !isFreeLike &&
    (cardKind === "story" ||
      source === "story_pending" ||
      source === "simulate" ||
      (packageId !== "" &&
        packageId !== FREE_PACKAGE_ID &&
        packageId !== SCHEDULE_PACKAGE_ID));

  return { isNarrative, isFreeLike, isSchedule };
}
