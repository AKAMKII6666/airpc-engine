/**
 * 导出摘要区：版本/卡数/校验与错误列表。
 * formalBlocked 时由父级禁用正式导出按钮。
 */
"use client";

import type { FC } from "react";
import { Typography } from "@mui/material";
import type { ExportKind, ExportSummary } from "@studio-v2/typeFiles/story/transfer/packageTransfer";
import { validationLabel } from "@studio-v2/typeFiles/story/labels/statusLabels";
import styles from "./ExportPackageView.module.scss";

type Props = {
  summary: ExportSummary;
  kind: ExportKind;
  formalBlocked: boolean;
};

export const ExportSummaryPanel: FC<Props> = function (props) {
  const { summary, kind, formalBlocked } = props;
  return (
    <div className={styles.summary}>
      <Typography variant="subtitle1" className={styles.summaryTitle}>
        导出摘要 · {summary.packageTitle}
      </Typography>
      <p className={styles.line}>
        版本 {summary.packageVersion} · {summary.cardCount} 卡 ·{" "}
        {summary.characterCount} 角色 · {summary.assetCount} 资源
      </p>
      <p className={styles.line}>
        起点：{summary.startCardTitle} · 章节结束：
        {summary.chapterEndSummary}
      </p>
      <p className={styles.line}>
        校验：{validationLabel(summary.validation)}
      </p>
      {summary.warnings.length > 0 ? (
        <ul className={styles.warnList}>
          {summary.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}
      {summary.errors.length > 0 ? (
        <ul className={styles.errList}>
          {summary.errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}
      {formalBlocked && kind === "formal" ? (
        <p className={styles.blockNote}>
          正式导出已禁用。可改选调试包继续排查。
        </p>
      ) : null}
    </div>
  );
};
