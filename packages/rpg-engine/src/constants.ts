/**
 * 模块名称：Free／Schedule 哨兵与预算常量
 */
export const FREE_PACKAGE_ID = "__free__" as const;

/**
 * ScheduleCard 存放于 characters/schedule-cards/，不进 storis-packages。
 * pending／once intent 用此 packageId 才能走 resolve → beginCall。
 */
export const SCHEDULE_PACKAGE_ID = "__schedule__" as const;

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
