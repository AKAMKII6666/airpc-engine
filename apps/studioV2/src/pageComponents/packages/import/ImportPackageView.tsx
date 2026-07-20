/**
 * 导入故事包薄入口：主流程在列表 ImportPackageModal。
 * 本页仅提示并链回列表；不写盘、不接真实导入管线。
 */
"use client";

import type { FC } from "react";
import Link from "next/link";
import { Button, Typography } from "@mui/material";
import styles from "./ImportPackageView.module.scss";

export const ImportPackageView: FC = function () {
  return (
    <main className={styles.root}>
      <Typography variant="h5" component="h1" className={styles.title}>
        导入故事包
      </Typography>
      <Typography variant="body2" className={styles.sub}>
        主流程请从「故事包」列表打开导入弹层（选文件 → 预检 → 确认）。本页为薄备选入口，不写盘。
      </Typography>
      <div className={styles.footer}>
        <Button component={Link} href="/packages" variant="contained">
          返回故事包列表
        </Button>
      </div>
    </main>
  );
};
