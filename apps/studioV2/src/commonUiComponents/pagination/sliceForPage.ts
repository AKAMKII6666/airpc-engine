/**
 * 纯前端分页切片工具。
 * 列表数据仍在内存；本函数只负责按页截取，不发请求。
 */

/** 由总条数与每页大小计算页数；空列表仍视为 1 页，便于 Pagination 展示 */
export function computePageCount(total: number, pageSize: number): number {
  if (pageSize <= 0) return 0;
  if (total <= 0) return 1;
  return Math.ceil(total / pageSize);
}

/**
 * 按 1-based page 截取当前页条目。
 * page < 1 时按第 1 页处理，避免业务页传入 0 得到空数组。
 */
export function sliceForPage<T>(
  items: readonly T[],
  page: number,
  pageSize: number,
): T[] {
  if (pageSize <= 0) return [];
  const safePage = page < 1 ? 1 : page;
  const start = (safePage - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
