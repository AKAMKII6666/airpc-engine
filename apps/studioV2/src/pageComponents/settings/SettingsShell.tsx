/**
 * 设置页壳：左分类 + 右内容；含 Schema 兼容与校验报告入口。
 */
"use client";

import type { FC } from "react";
import { useState } from "react";
import type { SettingsCategoryId } from "@studio-v2/typeFiles/settings/studioSettings";
import { SettingsNav } from "@studio-v2/src/pageComponents/settings/SettingsNav";
import { SettingsContent } from "@studio-v2/src/pageComponents/settings/SettingsContent";
import styles from "./SettingsShell.module.scss";

export const SettingsShell: FC = function () {
  const [category, setCategory] = useState<SettingsCategoryId>("schema");
  const [showReport, setShowReport] = useState(true);

  return (
    <main className={styles.root}>
      <SettingsNav active={category} onSelect={setCategory} />
      <div className={styles.content}>
        <SettingsContent
          category={category}
          showReport={showReport}
          onToggleReport={() => setShowReport((v) => !v)}
        />
      </div>
    </main>
  );
};
