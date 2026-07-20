/**
 * 工作台顶栏：工作区名、占位搜索、导入/新建入口。
 * 搜索禁用：本批仅静态验收，不接检索。
 */
"use client";

import type { FC } from "react";
import Link from "next/link";
import { Button, IconButton, TextField, Tooltip } from "@mui/material";
import styles from "./WorkbenchShell.module.scss";

type Props = {
  workspaceTitle: string;
};

export const WorkbenchTopBar: FC<Props> = function (props) {
  const { workspaceTitle } = props;
  return (
    <header className={styles.topBar}>
      <div className={styles.workspace}>
        <span className={styles.workspaceName}>{workspaceTitle}</span>
        <span className={styles.workspaceHint}>本机工作区 · 静态验收</span>
      </div>
      <div className={styles.search}>
        <TextField
          className={styles.searchField}
          size="small"
          placeholder="搜索故事包 / 角色 / 资源"
          inputProps={{ "aria-label": "全局搜索" }}
          disabled
        />
      </div>
      <div className={styles.topActions}>
        <Button component={Link} href="/packages/import" variant="outlined">
          导入
        </Button>
        <Button component={Link} href="/packages/create" variant="contained">
          新建故事包
        </Button>
        <Tooltip title="帮助（占位）">
          <IconButton size="small" aria-label="帮助" disabled>
            ?
          </IconButton>
        </Tooltip>
        <Tooltip title="设置">
          <IconButton
            component={Link}
            href="/settings"
            size="small"
            aria-label="设置"
          >
            ≡
          </IconButton>
        </Tooltip>
      </div>
    </header>
  );
};
