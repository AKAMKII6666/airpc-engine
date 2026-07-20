/**
 * 工作台右侧：快速开始 / 工程状态 / 最近调试。
 * 数据来自 mock；不发起 Host 请求。
 */
"use client";

import type { FC } from "react";
import Link from "next/link";
import { Button } from "@mui/material";
import {
  MOCK_ENGINEERING_STATUS,
  MOCK_RECENT_DEBUGS,
} from "@studio-v2/src/utils/ajaxProxy/packages/mockWorkbenchData";
import {
  formatRelativeEdit,
  validationLabel,
} from "@studio-v2/typeFiles/story/labels/statusLabels";
import { workbenchBadgeClass } from "@studio-v2/src/pageComponents/home/helper/workbenchBadgeClass";
import styles from "./WorkbenchShell.module.scss";

export const WorkbenchSideCol: FC = function () {
  return (
    <aside className={styles.sideCol}>
      <section className={styles.panel} aria-labelledby="quick-start-title">
        <h3 id="quick-start-title" className={styles.panelTitle}>
          快速开始
        </h3>
        <ul className={styles.quickList}>
          <li>
            <Link href="/packages/create" className={styles.quickLink}>
              新建空故事包
            </Link>
          </li>
          <li>
            <Link href="/packages/create" className={styles.quickLink}>
              从模板创建（入口预留）
            </Link>
          </li>
          <li>
            <Link href="/packages/import" className={styles.quickLink}>
              导入故事包
            </Link>
          </li>
        </ul>
      </section>

      <section className={styles.panel} aria-labelledby="eng-status-title">
        <h3 id="eng-status-title" className={styles.panelTitle}>
          工程状态
        </h3>
        <ul className={styles.statusList}>
          {MOCK_ENGINEERING_STATUS.map((item) => (
            <li key={item.id} className={styles.statusItem}>
              <span className={styles.statusLabel}>
                <span className={workbenchBadgeClass(item.level)}>
                  {validationLabel(item.level)}
                </span>{" "}
                {item.label}
              </span>
              <span className={styles.statusDetail}>{item.detail}</span>
            </li>
          ))}
        </ul>
        <Button
          component={Link}
          href="/settings"
          size="small"
          sx={{ mt: 1, px: 0 }}
        >
          打开校验报告 / 工程状态
        </Button>
      </section>

      <section className={styles.panel} aria-labelledby="recent-debug-title">
        <h3 id="recent-debug-title" className={styles.panelTitle}>
          最近调试
        </h3>
        {MOCK_RECENT_DEBUGS.map((d) => (
          <div key={d.sessionId} className={styles.debugItem}>
            <div className={styles.debugTitle}>{d.packageTitle}</div>
            <div className={styles.debugMeta}>
              起始：{d.startCardTitle}
              {d.hitExitTitle ? ` · 出口：${d.hitExitTitle}` : ""}
              <br />
              {d.resultLabel} · {formatRelativeEdit(d.at)}
            </div>
            <Button
              component={Link}
              href="/debugger"
              size="small"
              sx={{ mt: 0.5, px: 0 }}
            >
              打开调试记录
            </Button>
          </div>
        ))}
      </section>
    </aside>
  );
};
