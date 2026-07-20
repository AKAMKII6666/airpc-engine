/**
 * 首页最近故事包列表：紧凑行 + 打开入口。
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
import { workbenchBadgeClass } from "@studio-v2/src/pageComponents/home/helper/workbenchBadgeClass";
import styles from "../WorkbenchShell.module.scss";

type Props = {
  items: readonly StoryPackageSummary[];
};

export const RecentPackageRows: FC<Props> = function (props) {
  const { items } = props;
  return (
    <section className={styles.panel} aria-labelledby="recent-packages-title">
      <div className={styles.panelTitleRow}>
        <h3 id="recent-packages-title" className={styles.panelTitle}>
          最近故事包
        </h3>
        <Link href="/packages" className={styles.linkMuted}>
          查看全部
        </Link>
      </div>
      <ul className={styles.rowList}>
        {items.map((pkg) => (
          <li key={pkg.packageId} className={styles.row}>
            <div>
              <div className={styles.rowTitle}>{pkg.title}</div>
              <div className={styles.rowSub}>
                {pkg.cardCount} 卡 · {pkg.characterCount} 角色 ·{" "}
                {saveStateLabel(pkg.saveState)}
              </div>
            </div>
            <div className={styles.rowMeta}>
              <span className={workbenchBadgeClass(pkg.validation)}>
                {validationLabel(pkg.validation)}
              </span>
              <div>{formatRelativeEdit(pkg.lastEditedAt)}</div>
            </div>
            <div className={styles.rowActions}>
              <Button
                component={Link}
                href={`/stories/${pkg.packageId}`}
                size="small"
                variant="text"
              >
                打开
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};
