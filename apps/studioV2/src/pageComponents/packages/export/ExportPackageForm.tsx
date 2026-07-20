/**
 * 导出表单区：选包、用途与动作按钮；摘要由 ExportSummaryPanel 展示。
 */
"use client";

import type { FC } from "react";
import Link from "next/link";
import {
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import { MOCK_STORY_PACKAGES } from "@studio-v2/src/utils/ajaxProxy/packages/mockWorkbenchData";
import type { ExportKind, ExportSummary } from "@studio-v2/typeFiles/story/transfer/packageTransfer";
import { ExportSummaryPanel } from "@studio-v2/src/pageComponents/packages/export/ExportSummaryPanel";
import styles from "./ExportPackageView.module.scss";

type Props = {
  packageId: string;
  kind: ExportKind;
  summary: ExportSummary | null;
  formalBlocked: boolean;
  canExport: boolean;
  doneMsg: string | null;
  onPackageChange: (packageId: string) => void;
  onKindChange: (kind: ExportKind) => void;
  onExport: () => void;
};

export const ExportPackageForm: FC<Props> = function (props) {
  const {
    packageId,
    kind,
    summary,
    formalBlocked,
    canExport,
    doneMsg,
    onPackageChange,
    onKindChange,
    onExport,
  } = props;

  return (
    <section className={styles.panel}>
      <FormControl size="small" fullWidth>
        <InputLabel id="export-pkg-label">故事包</InputLabel>
        <Select
          labelId="export-pkg-label"
          label="故事包"
          value={packageId}
          onChange={(e) => onPackageChange(e.target.value)}
        >
          {MOCK_STORY_PACKAGES.map((p) => (
            <MenuItem key={p.packageId} value={p.packageId}>
              {p.title}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" fullWidth>
        <InputLabel id="export-kind-label">导出用途</InputLabel>
        <Select
          labelId="export-kind-label"
          label="导出用途"
          value={kind}
          onChange={(e) => onKindChange(e.target.value as ExportKind)}
        >
          <MenuItem value="formal">正式故事包（引擎 / 话机）</MenuItem>
          <MenuItem value="debug">调试故事包</MenuItem>
          <MenuItem value="source">源工程包（含布局）</MenuItem>
        </Select>
      </FormControl>

      {summary ? (
        <ExportSummaryPanel
          summary={summary}
          kind={kind}
          formalBlocked={formalBlocked}
        />
      ) : null}

      {doneMsg ? (
        <Typography variant="body2" color="success.main">
          {doneMsg}
        </Typography>
      ) : null}

      <div className={styles.footer}>
        <Button component={Link} href="/packages" variant="text">
          返回
        </Button>
        <Button variant="contained" disabled={!canExport} onClick={onExport}>
          导出文件
        </Button>
      </div>
    </section>
  );
};
