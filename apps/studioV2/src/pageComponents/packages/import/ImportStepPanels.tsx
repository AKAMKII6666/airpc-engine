/**
 * 导入三步面板：选文件 / 预检 / 确认。
 * 预检只读 mock；确认步由调用方生成内部 packageId，不覆盖已有包。
 */
"use client";

import type { FC } from "react";
import {
  Button,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
} from "@mui/material";
import type { ImportPrecheckReport } from "@studio-v2/typeFiles/story/transfer/packageTransfer";
import { importVerdictLabel } from "@studio-v2/typeFiles/story/labels/statusLabels";
import styles from "./ImportPackageView.module.scss";

/** 导入向导步骤；done 仅用于确认后跳转前的瞬时态。 */
export type ImportFlowStep = "pick" | "precheck" | "confirm" | "done";

const STEP_CLASS = {
  active: styles.stepActive,
  idle: styles.step,
} as const;

type StepNavProps = {
  step: ImportFlowStep;
};

export const ImportStepNav: FC<StepNavProps> = function (props) {
  const { step } = props;
  return (
    <ol className={styles.steps} aria-label="导入步骤">
      <li className={step === "pick" ? STEP_CLASS.active : STEP_CLASS.idle}>
        选择文件
      </li>
      <li
        className={step === "precheck" ? STEP_CLASS.active : STEP_CLASS.idle}
      >
        预检报告
      </li>
      <li
        className={
          step === "confirm" || step === "done"
            ? STEP_CLASS.active
            : STEP_CLASS.idle
        }
      >
        确认导入
      </li>
    </ol>
  );
};

/** 演示包投影：文件名与大小；不真解析 zip。 */
export const IMPORT_DEMO_FILE_LABEL =
  "zhang_boss_callback.storypack.json · 128 KB";

type PickProps = {
  onPickDemo: () => void;
  onCancel: () => void;
};

export const ImportPickPanel: FC<PickProps> = function (props) {
  const { onPickDemo, onCancel } = props;
  return (
    <section className={styles.panel}>
      <p className={styles.metaLine}>
        演示：点此装载 mock 包（不读写真实磁盘）
      </p>
      <button type="button" className={styles.dropzone} onClick={onPickDemo}>
        <span className={styles.dropTitle}>装载演示包</span>
        <span className={styles.dropHint}>{IMPORT_DEMO_FILE_LABEL}</span>
      </button>
      <div className={styles.footer}>
        <Button type="button" variant="text" onClick={onCancel}>
          取消
        </Button>
      </div>
    </section>
  );
};

type PrecheckProps = {
  report: ImportPrecheckReport;
  fileLabel: string | null;
  canImport: boolean;
  onBack: () => void;
  onContinue: () => void;
};

export const ImportPrecheckPanel: FC<PrecheckProps> = function (props) {
  const { report, fileLabel, canImport, onBack, onContinue } = props;
  return (
    <section className={styles.panel}>
      <Typography variant="subtitle1" className={styles.panelHeading}>
        {report.packageTitle}
      </Typography>
      <p className={styles.metaLine}>
        文件：{fileLabel ?? "—"} · Schema {report.schemaVersion}
      </p>
      <p className={styles.metaLine}>
        {report.cardCount} 卡 · {report.characterCount} 角色 ·{" "}
        {report.assetCount} 资源
      </p>
      <p className={styles.verdict}>
        结论：{importVerdictLabel(report.verdict)}
      </p>
      <ul className={styles.msgList}>
        {report.messages.map((m) => (
          <li key={m}>{m}</li>
        ))}
        {report.missingAssets ? (
          <li>资源不完整（可导入，正式导出前需补齐）</li>
        ) : null}
        {report.needsMigration ? (
          <li>需要迁移到当前 Studio 支持的版本</li>
        ) : null}
      </ul>
      <div className={styles.footer}>
        <Button variant="text" onClick={onBack}>
          重选文件
        </Button>
        <Button variant="contained" disabled={!canImport} onClick={onContinue}>
          继续
        </Button>
      </div>
    </section>
  );
};

type ConfirmProps = {
  onBack: () => void;
  onConfirm: () => void;
};

export const ImportConfirmPanel: FC<ConfirmProps> = function (props) {
  const { onBack, onConfirm } = props;
  return (
    <section className={styles.panel}>
      <Typography variant="subtitle1" className={styles.panelHeading}>
        确认导入选项
      </Typography>
      <RadioGroup value="as_new" name="import-mode">
        <FormControlLabel
          value="as_new"
          control={<Radio />}
          label="导入为新故事包（推荐）"
        />
        <FormControlLabel
          value="overwrite"
          control={<Radio disabled />}
          label="覆盖已有故事包（第一版不提供）"
        />
      </RadioGroup>
      <FormControlLabel
        control={<Radio checked disabled />}
        label="复制资源到资源库"
      />
      <FormControlLabel
        control={<Radio checked disabled />}
        label="重新生成内部 ID"
      />
      <div className={styles.footer}>
        <Button variant="text" onClick={onBack}>
          返回预检
        </Button>
        <Button variant="contained" onClick={onConfirm}>
          确认导入
        </Button>
      </div>
    </section>
  );
};

type ActiveStepProps = {
  step: ImportFlowStep;
  fileLabel: string | null;
  report: ImportPrecheckReport;
  canImport: boolean;
  onPickDemo: () => void;
  onCancel: () => void;
  onBackToPick: () => void;
  onContinuePrecheck: () => void;
  onBackToPrecheck: () => void;
  onConfirmImport: () => void;
};

export const ImportActiveStep: FC<ActiveStepProps> = function (props) {
  const {
    step,
    fileLabel,
    report,
    canImport,
    onPickDemo,
    onCancel,
    onBackToPick,
    onContinuePrecheck,
    onBackToPrecheck,
    onConfirmImport,
  } = props;

  if (step === "pick") {
    return <ImportPickPanel onPickDemo={onPickDemo} onCancel={onCancel} />;
  }
  if (step === "precheck") {
    return (
      <ImportPrecheckPanel
        report={report}
        fileLabel={fileLabel}
        canImport={canImport}
        onBack={onBackToPick}
        onContinue={onContinuePrecheck}
      />
    );
  }
  if (step === "confirm") {
    return (
      <ImportConfirmPanel
        onBack={onBackToPrecheck}
        onConfirm={onConfirmImport}
      />
    );
  }
  return null;
};
