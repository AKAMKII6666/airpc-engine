/**
 * 调试器右侧：角色挂卡 / 外呼队列投影；非 store dump。
 */
"use client";

import type { FC } from "react";
import { Button, Typography } from "@mui/material";
import type { DebugRoleBoardItem } from "@studio-v2/typeFiles/debugger/debugSessionView";
import { formatDelayRemaining } from "@studio-v2/typeFiles/debugger/debugLabels";
import styles from "../DebuggerShell.module.scss";

export type RoleBoardPanelProps = {
  roles: readonly DebugRoleBoardItem[];
};

export const RoleBoardPanel: FC<RoleBoardPanelProps> = function (props) {
  const { roles } = props;
  return (
    <aside className={styles.panel} aria-label="角色状态与挂卡">
      <h2 className={styles.panelTitle}>角色状态</h2>
      {roles.map((r) => (
        <div key={r.characterName} className={styles.roleCard}>
          <div className={styles.roleName}>{r.characterName}</div>
          <div className={styles.roleMeta}>
            {r.freeDialable ? "可自由通话" : "剧情挂卡中"}
            {r.pendingCardTitle
              ? ` · 挂卡「${r.pendingCardTitle}」`
              : " · 无挂卡"}
            {r.pendingSource ? ` · ${r.pendingSource}` : ""}
            {r.hasOutbound ? " · 待外呼" : ""}
          </div>
          {r.delayRemainingMs != null ? (
            <div className={styles.delayHint}>
              {formatDelayRemaining(r.delayRemainingMs)}
              <br />
              用户现在呼入将消费该外呼卡
            </div>
          ) : null}
        </div>
      ))}
      <Typography variant="caption" className={styles.roleMeta}>
        时间推进（静态示意）
      </Typography>
      <div className={styles.eventRow}>
        <Button size="small" variant="outlined" disabled>
          +1 分钟
        </Button>
        <Button size="small" variant="outlined" disabled>
          触发到期外呼
        </Button>
      </div>
    </aside>
  );
};
