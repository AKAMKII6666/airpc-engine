/**
 * 模块名称：Free／Schedule 哨兵与预算常量
 */
/** 纯 Free 会话 chapterId 哨兵；禁止当真实章目录 */
export const FREE_CHAPTER_ID = "__free__" as const;

/**
 * ScheduleCard 存放于 characters/schedule-cards/，不进 storis-packages。
 * pending／once intent 用此 chapterId 才能走 resolve → beginCall。
 */
export const SCHEDULE_CHAPTER_ID = "__schedule__" as const;

/** @deprecated 使用 FREE_CHAPTER_ID */
export const FREE_PACKAGE_ID = FREE_CHAPTER_ID;

/** @deprecated 使用 SCHEDULE_CHAPTER_ID */
export const SCHEDULE_PACKAGE_ID = SCHEDULE_CHAPTER_ID;

/** projectForCall 默认预算 */
export const MEMORY_PROJECT_DEFAULTS = {
  maxCallSummaries: 5,
  maxVignettes: 8,
  maxRollups: 2,
  maxSoftChars: 2000,
} as const;

export const MEMORY_SEARCH_DEFAULTS = {
  defaultMaxResults: 5,
  hardMaxResults: 10,
  searchSnippetChars: 200,
  getByIdChars: 500,
} as const;

/** rollupIfNeeded：有界聚合，无 LLM */
export const MEMORY_ROLLUP_DEFAULTS = {
  maxEntriesPerPeriod: 40,
  maxSummaryChars: 400,
  /** 单条摘录取前缀 */
  entrySnippetChars: 80,
} as const;
