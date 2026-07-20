/**
 * 校验报告面板：按严重度分类；提供跳转，不贴 Zod 原文。
 */
"use client";

import type { FC } from "react";
import Link from "next/link";
import { Button } from "@mui/material";
import type { ValidationIssue } from "@studio-v2/typeFiles/settings/studioSettings";
import { issueSeverityLabel } from "@studio-v2/typeFiles/settings/settingsLabels";
import styles from "../SettingsShell.module.scss";

function sevClass(severity: ValidationIssue["severity"]): string {
  if (severity === "error") return styles.sevError;
  if (severity === "warning") return styles.sevWarn;
  return styles.sevHint;
}

export type ValidationReportPanelProps = {
  issues: readonly ValidationIssue[];
};

export const ValidationReportPanel: FC<ValidationReportPanelProps> = function (
  props,
) {
  const { issues } = props;
  return (
    <div>
      <h2 className={styles.sectionTitle}>校验报告</h2>
      <p className={styles.sectionSub}>
        从首页、导出前或设置页进入。问题用人话说明，并尽量带定位。
      </p>
      <ul className={styles.issueList}>
        {issues.map((issue) => (
          <li key={issue.id} className={styles.issueCard}>
            <div className={styles.issueHead}>
              <span className={styles.issueTitle}>{issue.title}</span>
              <span className={sevClass(issue.severity)}>
                {issueSeverityLabel(issue.severity)}
              </span>
            </div>
            <div className={styles.issueBody}>
              影响：{issue.impact}
              <br />
              建议：{issue.suggestion}
            </div>
            {issue.locateHref && issue.locateLabel ? (
              <Button
                component={Link}
                href={issue.locateHref}
                size="small"
                sx={{ mt: 1, px: 0 }}
              >
                {issue.locateLabel}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
};
