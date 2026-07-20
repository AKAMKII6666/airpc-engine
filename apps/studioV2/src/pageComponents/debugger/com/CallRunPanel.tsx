/**
 * 调试器中部：通话运行区 + 出口命中 + Effect 结果。
 * 剧情语义按钮；不以 raw JSON 为主体。
 */
"use client";

import type { FC } from "react";
import { Button, Typography } from "@mui/material";
import type {
  DebugCallRunView,
  DebugEffectItem,
  DebugExitHitView,
} from "@studio-v2/typeFiles/debugger/debugSessionView";
import {
  debugCallKindLabel,
  effectStatusLabel,
} from "@studio-v2/typeFiles/debugger/debugLabels";
import styles from "../DebuggerShell.module.scss";

const EVENT_BUTTONS = [
  "用户正常沟通",
  "用户拒绝",
  "用户无应答",
  "用户提前挂断",
  "角色完成目标",
  "工具调用成功",
  "工具调用失败",
] as const;

function effectStatusClass(status: DebugEffectItem["status"]): string {
  if (status === "succeeded") return styles.badgeOk;
  if (status === "running" || status === "pending") return styles.badgeWarn;
  if (status === "failed_critical") return styles.badgeDanger;
  return styles.badgeMuted;
}

export type CallRunPanelProps = {
  call: DebugCallRunView;
  exitHit: DebugExitHitView;
  effects: readonly DebugEffectItem[];
};

export const CallRunPanel: FC<CallRunPanelProps> = function (props) {
  const { call, exitHit, effects } = props;
  return (
    <section className={styles.panel} aria-label="通话运行区">
      <div className={styles.callHero}>
        <span className={styles.callBadge}>
          {debugCallKindLabel(call.callKind)} · {call.characterName}
        </span>
        <h2 className={styles.callCardTitle}>{call.cardTitle}</h2>
        <div className={styles.summaryBlock}>
          <div className={styles.summaryLabel}>本轮目标</div>
          {call.goalSummary}
        </div>
        <div className={styles.summaryBlock}>
          <div className={styles.summaryLabel}>上下文</div>
          {call.contextSummary || "（暂无）"}
        </div>
        <div className={styles.summaryBlock}>
          <div className={styles.summaryLabel}>用户事件</div>
          {call.userEventSummary}
        </div>
        <div className={styles.summaryBlock}>
          <div className={styles.summaryLabel}>角色回复</div>
          {call.replySummary}
        </div>
      </div>

      <Typography variant="caption" className={styles.fieldLabel}>
        模拟事件（静态示意）
      </Typography>
      <div className={styles.eventRow}>
        {EVENT_BUTTONS.map((label) => (
          <Button key={label} size="small" variant="outlined" disabled>
            {label}
          </Button>
        ))}
        <Button size="small" variant="contained" disabled>
          结束通话并判定出口
        </Button>
      </div>

      <div className={styles.exitBox}>
        <h3 className={styles.exitTitle}>
          命中出口：{exitHit.exitTitle}
          {exitHit.isFallback ? "（兜底）" : ""}
        </h3>
        <div className={styles.exitReason}>原因：{exitHit.reason}</div>
        <ol className={styles.actionList}>
          {exitHit.actionLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      </div>

      <h3 className={styles.panelTitle}>Effect 执行（需确认，非 fire-and-forget）</h3>
      <ul className={styles.effectList}>
        {effects.map((fx) => (
          <li key={fx.id} className={styles.effectItem}>
            <div className={styles.effectHead}>
              <span>
                {fx.actionLabel} → {fx.targetLabel}
                {fx.critical ? " · critical" : ""}
              </span>
              <span className={effectStatusClass(fx.status)}>
                {effectStatusLabel(fx.status)}
              </span>
            </div>
            <div>{fx.inputSummary}</div>
            {fx.detail ? <div className={styles.roleMeta}>{fx.detail}</div> : null}
          </li>
        ))}
      </ul>
    </section>
  );
};
