/**
 * 故事包列表单行：校验徽章与编辑器/调试/导出入口。
 * 从 PackageListView 抽出以满足函数行数硬上限。
 */
"use client";

import type { FC } from "react";
import Link from "next/link";
import { Button } from "@mui/material";
import type { StoryPackageSummary } from "@studio-v2/typeFiles/story/summary/storyPackageSummary";
import {
  formatRelativeEdit,
  saveStateLabel,
  validationLabel,
} from "@studio-v2/typeFiles/story/labels/statusLabels";
import styles from "../PackageListView.module.scss";

type Props = {
  pkg: StoryPackageSummary;
};

function badgeClass(v: StoryPackageSummary["validation"]): string {
  if (v === "ok") return styles.badgeOk;
  if (v === "warning") return styles.badgeWarn;
  return styles.badgeErr;
}

export const PackageListItem: FC<Props> = function (props) {
  const { pkg } = props;
  return (
    <li className={styles.item}>
      <div className={styles.itemMain}>
        <div className={styles.itemTitle}>{pkg.title}</div>
        <div className={styles.itemDesc}>{pkg.description}</div>
        <div className={styles.itemStats}>
          {formatRelativeEdit(pkg.lastEditedAt)} · {pkg.characterCount} 角色 ·{" "}
          {pkg.cardCount} 卡 · {pkg.assetCount} 资源 ·{" "}
          {saveStateLabel(pkg.saveState)}
          {pkg.lastExportedAt
            ? ` · 曾导出 ${formatRelativeEdit(pkg.lastExportedAt)}`
            : " · 未导出"}
        </div>
      </div>
      <div className={styles.itemSide}>
        <span className={badgeClass(pkg.validation)}>
          {validationLabel(pkg.validation)}
        </span>
        <div className={styles.itemActions}>
          <Button
            component={Link}
            href={`/stories/${pkg.packageId}`}
            size="small"
            variant="contained"
          >
            编辑器
          </Button>
          <Button component={Link} href="/debugger" size="small" variant="outlined">
            调试
          </Button>
          <Button
            component={Link}
            href="/packages/export"
            size="small"
            variant="text"
          >
            导出
          </Button>
        </div>
      </div>
    </li>
  );
};
