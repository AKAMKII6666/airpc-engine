/**
 * 导入导出 / 高级 / Schema 与校验报告面板。
 */
"use client";

import type { FC } from "react";
import { FormControlLabel, Switch, Typography } from "@mui/material";
import {
  MOCK_IMPORT_EXPORT_PREFS,
  MOCK_SCHEMA_STATUS,
  MOCK_VALIDATION_ISSUES,
} from "@studio-v2/src/utils/ajaxProxy/settings/mockSettingsData";
import { schemaCompatLabel } from "@studio-v2/typeFiles/settings/settingsLabels";
import { formatRelativeEdit } from "@studio-v2/typeFiles/story/labels/statusLabels";
import { ValidationReportPanel } from "@studio-v2/src/pageComponents/settings/com/ValidationReportPanel";
import styles from "../SettingsShell.module.scss";

export const ImportExportPrefsPanel: FC = function () {
  return (
    <div>
      <h2 className={styles.sectionTitle}>导入导出</h2>
      <p className={styles.sectionSub}>打包偏好；危险覆盖操作本步不提供。</p>
      <div className={styles.prefGrid}>
        <div className={styles.prefRow}>
          <span className={styles.prefLabel}>默认导出类型</span>
          <span className={styles.prefValue}>
            {MOCK_IMPORT_EXPORT_PREFS.defaultExportKindLabel}
          </span>
        </div>
        <FormControlLabel
          control={
            <Switch
              checked={MOCK_IMPORT_EXPORT_PREFS.includeLayoutMeta}
              disabled
            />
          }
          label="导出编辑器布局元数据"
        />
        <FormControlLabel
          control={
            <Switch checked={MOCK_IMPORT_EXPORT_PREFS.includeAssets} disabled />
          }
          label="包含资源文件"
        />
        <FormControlLabel
          control={
            <Switch
              checked={MOCK_IMPORT_EXPORT_PREFS.copyAssetsOnImport}
              disabled
            />
          }
          label="导入时复制资源到资源库"
        />
        <div className={styles.prefRow}>
          <span className={styles.prefLabel}>默认导出目录</span>
          <span className={styles.prefValue}>
            {MOCK_IMPORT_EXPORT_PREFS.defaultExportDir || "系统默认"}
          </span>
        </div>
      </div>
    </div>
  );
};

export const AdvancedPrefsPanel: FC = function () {
  return (
    <div>
      <h2 className={styles.sectionTitle}>高级</h2>
      <p className={styles.sectionSub}>
        默认隐藏内部 ID 与 JSON。普通创作路径不应依赖此区。
      </p>
      <FormControlLabel
        control={<Switch checked={false} disabled />}
        label="显示内部 ID"
      />
      <FormControlLabel
        control={<Switch checked={false} disabled />}
        label="默认打开 JSON 高级视图"
      />
      <div className={styles.warnBox}>
        清理缓存 / 重建索引会打断未保存编辑；本步仅展示警示，不执行危险操作。
      </div>
    </div>
  );
};

export type SchemaEnginePanelProps = {
  showReport: boolean;
  onToggleReport: () => void;
};

export const SchemaEnginePanel: FC<SchemaEnginePanelProps> = function (props) {
  const { showReport, onToggleReport } = props;
  const status = MOCK_SCHEMA_STATUS;
  return (
    <div>
      <h2 className={styles.sectionTitle}>Schema 与引擎</h2>
      <p className={styles.sectionSub}>
        工程兼容状态与校验报告入口。不在此编辑故事包 JSON。
      </p>
      <div className={styles.compatCard}>
        <span className={styles.compatBadge}>
          {schemaCompatLabel(status.compat)}
        </span>
        <div className={styles.prefRow}>
          <span className={styles.prefLabel}>Studio schema</span>
          <span className={styles.prefValue}>{status.studioSchemaVersion}</span>
        </div>
        <div className={styles.prefRow}>
          <span className={styles.prefLabel}>引擎 schema</span>
          <span className={styles.prefValue}>{status.engineSchemaVersion}</span>
        </div>
        <div className={styles.prefRow}>
          <span className={styles.prefLabel}>最近同步</span>
          <span className={styles.prefValue}>
            {status.lastSyncedAt
              ? formatRelativeEdit(status.lastSyncedAt)
              : "尚未同步"}
          </span>
        </div>
        <Typography variant="caption" className={styles.prefLabel}>
          可用 CallCard 类型
        </Typography>
        <div className={styles.tagList}>
          {status.availableCardKinds.map((k) => (
            <span key={k} className={styles.tag}>
              {k}
            </span>
          ))}
        </div>
        <Typography variant="caption" className={styles.prefLabel}>
          可用 Effect 类型
        </Typography>
        <div className={styles.tagList}>
          {status.availableEffects.map((k) => (
            <span key={k} className={styles.tag}>
              {k}
            </span>
          ))}
        </div>
      </div>
      <button
        type="button"
        className={styles.navBtnActive}
        onClick={onToggleReport}
      >
        {showReport ? "收起校验报告" : "打开校验报告"}
      </button>
      {showReport ? (
        <div className={styles.reportWrap}>
          <ValidationReportPanel issues={MOCK_VALIDATION_ISSUES} />
        </div>
      ) : null}
    </div>
  );
};
