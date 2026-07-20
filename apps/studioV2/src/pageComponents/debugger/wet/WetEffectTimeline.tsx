/**
 * 底部时间线 + 高级 JSON 抽屉（默认收起，不得占主视图）。
 */
"use client";

import type { FC } from "react";
import { useState } from "react";
import { Button, Typography } from "@mui/material";
import type {
  DebugAdvancedSnapshot,
  DebugTimelineItem,
} from "@studio-v2/typeFiles/debugger/debugSessionView";
import styles from "../DebuggerShell.module.scss";

export type WetEffectTimelineProps = {
  items: readonly DebugTimelineItem[];
  advanced: DebugAdvancedSnapshot;
};

export const WetEffectTimeline: FC<WetEffectTimelineProps> = function (props) {
  const { items, advanced } = props;
  const [openAdvanced, setOpenAdvanced] = useState(false);

  return (
    <section className={styles.bottom} aria-label="WET 与 Effect 时间线">
      <h2 className={styles.panelTitle}>推进时间线</h2>
      <ul className={styles.timeline}>
        {items.map((item) => (
          <li key={item.id} className={styles.timelineItem}>
            <span className={styles.timelinePhase}>{item.phase}</span>
            <span className={styles.timelineSummary}>{item.summary}</span>
            <span className={styles.timelineStatus}>{item.statusLabel}</span>
          </li>
        ))}
      </ul>
      <div>
        <Button
          size="small"
          variant="text"
          onClick={() => setOpenAdvanced((v) => !v)}
        >
          {openAdvanced ? "收起高级视图" : "打开高级视图（raw JSON）"}
        </Button>
      </div>
      {openAdvanced ? (
        <div className={styles.drawer}>
          <Typography variant="subtitle2">高级快照 · 非主界面</Typography>
          <pre className={styles.drawerPre}>{advanced.rawJson}</pre>
          <ul className={styles.timeline}>
            {advanced.logLines.map((line) => (
              <li key={line} className={styles.timelineSummary}>
                {line}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
};
