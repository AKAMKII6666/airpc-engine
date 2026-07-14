/**
 * 模块名称：Free 哨兵与预算常量
 */
export const FREE_PACKAGE_ID = "__free__" as const;

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
