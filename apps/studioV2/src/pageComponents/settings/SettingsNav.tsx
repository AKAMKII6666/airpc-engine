/**
 * 设置左侧分类导航。
 */
"use client";

import type { FC } from "react";
import type { SettingsCategoryId } from "@studio-v2/typeFiles/settings/studioSettings";
import { SETTINGS_NAV } from "@studio-v2/src/utils/ajaxProxy/settings/mockSettingsData";
import styles from "./SettingsShell.module.scss";

export type SettingsNavProps = {
  active: SettingsCategoryId;
  onSelect: (id: SettingsCategoryId) => void;
};

export const SettingsNav: FC<SettingsNavProps> = function (props) {
  const { active, onSelect } = props;
  return (
    <nav className={styles.nav} aria-label="设置分类">
      <h1 className={styles.navTitle}>设置</h1>
      <ul className={styles.navList}>
        {SETTINGS_NAV.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={
                item.id === active ? styles.navBtnActive : styles.navBtn
              }
              onClick={() => onSelect(item.id)}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};
