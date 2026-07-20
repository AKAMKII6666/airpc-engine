/**
 * 按设置分类渲染右侧内容；装配层，不含偏好真源写盘。
 */
"use client";

import type { FC } from "react";
import type { SettingsCategoryId } from "@studio-v2/typeFiles/settings/studioSettings";
import {
  AppearancePanel,
  DebuggerPrefsPanel,
  EditorPrefsPanel,
} from "@studio-v2/src/pageComponents/settings/com/SettingsPrefsPanels";
import {
  AdvancedPrefsPanel,
  ImportExportPrefsPanel,
  SchemaEnginePanel,
} from "@studio-v2/src/pageComponents/settings/com/SettingsEnginePanels";

export type SettingsContentProps = {
  category: SettingsCategoryId;
  showReport: boolean;
  onToggleReport: () => void;
};

/** 分类 → 面板映射；新增分类时在此补齐，避免巨型 switch 堆业务。 */
export const SettingsContent: FC<SettingsContentProps> = function (props) {
  const { category, showReport, onToggleReport } = props;
  if (category === "appearance") return <AppearancePanel />;
  if (category === "editor") return <EditorPrefsPanel />;
  if (category === "debugger") return <DebuggerPrefsPanel />;
  if (category === "import_export") return <ImportExportPrefsPanel />;
  if (category === "advanced") return <AdvancedPrefsPanel />;
  return (
    <SchemaEnginePanel
      showReport={showReport}
      onToggleReport={onToggleReport}
    />
  );
};
