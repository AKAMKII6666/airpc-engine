/**
 * 外观 / 编辑器 / 调试器偏好面板。
 * 静态演示；不写盘、无泳道相关项。
 */
"use client";

import type { FC } from "react";
import { FormControlLabel, Switch } from "@mui/material";
import {
  MOCK_APPEARANCE,
  MOCK_DEBUGGER_PREFS,
  MOCK_EDITOR_PREFS,
} from "@studio-v2/src/utils/ajaxProxy/settings/mockSettingsData";
import styles from "../SettingsShell.module.scss";

export const AppearancePanel: FC = function () {
  return (
    <div>
      <h2 className={styles.sectionTitle}>外观</h2>
      <p className={styles.sectionSub}>
        默认暗色调色板。本步不做浅色主题落地。
      </p>
      <div className={styles.prefGrid}>
        <div className={styles.prefRow}>
          <span className={styles.prefLabel}>主题</span>
          <span className={styles.prefValue}>暗色（默认）</span>
        </div>
        <div className={styles.prefRow}>
          <span className={styles.prefLabel}>画布点阵强度</span>
          <span className={styles.prefValue}>{MOCK_APPEARANCE.gridStrength}%</span>
        </div>
        <FormControlLabel
          control={<Switch checked={MOCK_APPEARANCE.edgeAnimation} disabled />}
          label="连线动画"
        />
        <div className={styles.prefRow}>
          <span className={styles.prefLabel}>高亮强度</span>
          <span className={styles.prefValue}>
            {MOCK_APPEARANCE.highlightStrength}%
          </span>
        </div>
      </div>
    </div>
  );
};

export const EditorPrefsPanel: FC = function () {
  return (
    <div>
      <h2 className={styles.sectionTitle}>编辑器</h2>
      <p className={styles.sectionSub}>
        基础偏好。无泳道设置；不提供手工 ID 生成规则。
      </p>
      <div className={styles.prefGrid}>
        <div className={styles.prefRow}>
          <span className={styles.prefLabel}>默认缩放</span>
          <span className={styles.prefValue}>
            {MOCK_EDITOR_PREFS.defaultZoomPercent}%
          </span>
        </div>
        <FormControlLabel
          control={<Switch checked={MOCK_EDITOR_PREFS.showMinimap} disabled />}
          label="显示小地图"
        />
        <FormControlLabel
          control={
            <Switch checked={MOCK_EDITOR_PREFS.showValidationFloat} disabled />
          }
          label="默认显示校验浮窗"
        />
        <FormControlLabel
          control={<Switch checked={MOCK_EDITOR_PREFS.autoSave} disabled />}
          label={`自动保存（间隔 ${MOCK_EDITOR_PREFS.autoSaveIntervalSec} 秒）`}
        />
        <div className={styles.prefRow}>
          <span className={styles.prefLabel}>新卡片默认类型</span>
          <span className={styles.prefValue}>
            {MOCK_EDITOR_PREFS.defaultCardKindLabel}
          </span>
        </div>
      </div>
    </div>
  );
};

export const DebuggerPrefsPanel: FC = function () {
  return (
    <div>
      <h2 className={styles.sectionTitle}>调试器</h2>
      <p className={styles.sectionSub}>仅影响默认值，不改变引擎语义。</p>
      <div className={styles.prefGrid}>
        <div className={styles.prefRow}>
          <span className={styles.prefLabel}>默认用户档案</span>
          <span className={styles.prefValue}>
            {MOCK_DEBUGGER_PREFS.defaultUserName || "未设置"}
          </span>
        </div>
        <FormControlLabel
          control={
            <Switch checked={MOCK_DEBUGGER_PREFS.defaultResetStory} disabled />
          }
          label="默认重置故事状态"
        />
        <FormControlLabel
          control={
            <Switch checked={MOCK_DEBUGGER_PREFS.showAdvancedLogs} disabled />
          }
          label="默认展开高级日志"
        />
        <div className={styles.prefRow}>
          <span className={styles.prefLabel}>时间推进步长</span>
          <span className={styles.prefValue}>
            {MOCK_DEBUGGER_PREFS.clockStepSec} 秒
          </span>
        </div>
        <div className={styles.prefRow}>
          <span className={styles.prefLabel}>调试记录保留</span>
          <span className={styles.prefValue}>
            {MOCK_DEBUGGER_PREFS.recordRetainCount} 条
          </span>
        </div>
      </div>
    </div>
  );
};
