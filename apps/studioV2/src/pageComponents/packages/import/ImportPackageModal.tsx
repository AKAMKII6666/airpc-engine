/**
 * 导入故事包三步弹层：选文件 → 预检 mock → 确认。
 * 主流程入口；不写盘。整页 /packages/import 仅为薄备选。
 */
"use client";

import type { FC } from "react";
import { useState } from "react";
import { AppModal } from "@studio-v2/src/commonUiComponents/modal/app/AppModal";
import { MOCK_IMPORT_PRECHECK } from "@studio-v2/src/utils/ajaxProxy/packages/mockPackageTransfer";
import { commitImportPackageMock } from "@studio-v2/src/bis/pageBis/packages/importPackage_bis";
import {
  IMPORT_DEMO_FILE_LABEL,
  ImportActiveStep,
  ImportStepNav,
  type ImportFlowStep,
} from "./ImportStepPanels";

export type ImportPackageModalProps = {
  open: boolean;
  onClose: () => void;
  /**
   * 确认导入并写入会话 mock 后回调。
   * 调用方负责刷新列表 / 跳转编辑器；本组件不声称写盘成功。
   */
  onImported: (packageId: string) => void;
};

export const ImportPackageModal: FC<ImportPackageModalProps> = function (
  props,
) {
  const { open, onClose, onImported } = props;
  const [step, setStep] = useState<ImportFlowStep>("pick");
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const report = MOCK_IMPORT_PRECHECK;
  const canImport = report.verdict !== "blocked";

  function resetFlow(): void {
    setStep("pick");
    setFileLabel(null);
  }

  function handleClose(): void {
    resetFlow();
    onClose();
  }

  function onPickDemo(): void {
    setFileLabel(IMPORT_DEMO_FILE_LABEL);
    setStep("precheck");
  }

  function onConfirmImport(): void {
    const { packageId } = commitImportPackageMock(report);
    resetFlow();
    onImported(packageId);
  }

  return (
    <AppModal
      open={open}
      title="导入故事包"
      description="先检查，再确认。不会直接写入或覆盖当前工程。"
      onClose={handleClose}
      maxWidth="md"
    >
      <ImportStepNav step={step} />
      <ImportActiveStep
        step={step}
        fileLabel={fileLabel}
        report={report}
        canImport={canImport}
        onPickDemo={onPickDemo}
        onCancel={handleClose}
        onBackToPick={() => setStep("pick")}
        onContinuePrecheck={() => setStep("confirm")}
        onBackToPrecheck={() => setStep("precheck")}
        onConfirmImport={onConfirmImport}
      />
    </AppModal>
  );
};
