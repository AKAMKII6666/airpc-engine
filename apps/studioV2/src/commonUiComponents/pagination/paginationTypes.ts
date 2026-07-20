/**
 * FrontendPagination 的受控 props。
 * 分页只做内存 slice；page 从 1 起，与 MUI Pagination 一致。
 */
export type FrontendPaginationProps = {
  /** 当前页，从 1 起（不是 0-based） */
  page: number;
  /** 每页条数 */
  pageSize: number;
  /** 总条数（未 slice 前的完整列表长度） */
  total: number;
  /** 页码变更；入参为下一页的 1-based 页码 */
  onChange: (page: number) => void;
};
