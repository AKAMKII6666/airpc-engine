/**
 * 导出流：选包 → 校验摘要 → 导出动作。
 * error 禁正式包；debug 包可作排查出口。静态 mock，无真实打包。
 */
"use client";

import type { FC } from "react";
import { useMemo, useState } from "react";
import { Typography } from "@mui/material";
import { buildMockExportSummary } from "@studio-v2/src/utils/ajaxProxy/packages/mockPackageTransfer";
import type { ExportKind } from "@studio-v2/typeFiles/story/transfer/packageTransfer";
import { MOCK_STORY_PACKAGES } from "@studio-v2/src/utils/ajaxProxy/packages/mockWorkbenchData";
import { ExportPackageForm } from "@studio-v2/src/pageComponents/packages/export/ExportPackageForm";
import styles from "./ExportPackageView.module.scss";

const EXPORT_KIND_LABEL: Record<ExportKind, string> = {
  formal: "正式故事包",
  debug: "调试故事包",
  source: "源工程包",
};

export const ExportPackageView: FC = function () {
  const [packageId, setPackageId] = useState(
    MOCK_STORY_PACKAGES[0]?.packageId ?? "",
  );
  const [kind, setKind] = useState<ExportKind>("formal");
  const [doneMsg, setDoneMsg] = useState<string | null>(null);

  const summary = useMemo(
    () => (packageId ? buildMockExportSummary(packageId) : null),
    [packageId],
  );

  const formalBlocked = Boolean(summary && summary.errors.length > 0);
  const canExport = summary != null && (kind !== "formal" || !formalBlocked);

  function onExport() {
    if (!summary || !canExport) return;
    setDoneMsg(
      `已模拟导出「${summary.packageTitle}」为${EXPORT_KIND_LABEL[kind]}（未写盘）。`,
    );
  }

  function onPackageChange(nextId: string) {
    setPackageId(nextId);
    setDoneMsg(null);
  }

  function onKindChange(nextKind: ExportKind) {
    setKind(nextKind);
    setDoneMsg(null);
  }

  return (
    <main className={styles.root}>
      <Typography variant="h5" component="h1" className={styles.title}>
        导出故事包
      </Typography>
      <Typography variant="body2" className={styles.sub}>
        先校验，再打包。有错误时禁止正式导出。
      </Typography>

      <ExportPackageForm
        packageId={packageId}
        kind={kind}
        summary={summary}
        formalBlocked={formalBlocked}
        canExport={canExport}
        doneMsg={doneMsg}
        onPackageChange={onPackageChange}
        onKindChange={onKindChange}
        onExport={onExport}
      />
    </main>
  );
};
