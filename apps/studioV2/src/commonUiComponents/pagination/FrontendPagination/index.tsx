/**
 * 纯前端 slice 分页控件。
 * 只负责页码 UI；数据截取见 sliceForPage，请求分页不在本组件职责内。
 */
"use client";

import type { FC, ChangeEvent } from "react";
import { Pagination, Typography } from "@mui/material";
import type { FrontendPaginationProps } from "../paginationTypes";
import { computePageCount } from "../sliceForPage";
import styles from "./index.module.scss";

export const FrontendPagination: FC<FrontendPaginationProps> = function (
  props,
) {
  const { page, pageSize, total, onChange } = props;
  const pageCount = computePageCount(total, pageSize);

  function handleChange(_event: ChangeEvent<unknown>, nextPage: number): void {
    if (nextPage === page) return;
    onChange(nextPage);
  }

  return (
    <div className={styles.root}>
      <Typography component="span" className={styles.summary}>
        共 {total} 条
      </Typography>
      <Pagination
        page={page}
        count={pageCount}
        onChange={handleChange}
        color="primary"
        size="small"
        siblingCount={1}
        boundaryCount={1}
        disabled={total <= 0}
        showFirstButton
        showLastButton
      />
    </div>
  );
};
