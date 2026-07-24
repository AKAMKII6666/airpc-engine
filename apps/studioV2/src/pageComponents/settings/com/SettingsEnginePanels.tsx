/**
	* 导入导出 / 高级 / Schema 与校验报告面板。
	* 数据由 props 注入；禁止直引 ajaxProxy mock。
	*/
"use client";

import type { FC } from "react";
import { FormControlLabel, Switch, Typography } from "@mui/material";
import type {
	ImportExportPrefs,
	SchemaEngineStatus,
	ValidationIssue,
} from "@studio-v2/typeFiles/settings/studioSettings";
import { schemaCompatLabel } from "@studio-v2/typeFiles/settings/settingsLabels";
import { formatRelativeEdit } from "@studio-v2/typeFiles/story/labels/statusLabels";
// 引用了ValidationReportPanel组件，用于展示校验问题列表
import { ValidationReportPanel } from "@studio-v2/src/pageComponents/settings/com/ValidationReportPanel";
import styles from "../SettingsShell.module.scss";

export type ImportExportPrefsPanelProps = {
	/** 导入导出偏好投影 */
	prefs: ImportExportPrefs;
};

export const ImportExportPrefsPanel: FC<ImportExportPrefsPanelProps> = function ({
	// prefs 是导入导出偏好投影
	prefs,
}) {
	return (
		<div>
			<h2 className={styles.sectionTitle}>导入导出</h2>
			<p className={styles.sectionSub}>打包偏好；危险覆盖操作本步不提供。</p>
			<div className={styles.prefGrid}>
				<div className={styles.prefRow}>
					<span className={styles.prefLabel}>默认导出类型</span>
					<span className={styles.prefValue}>
						{prefs.defaultExportKindLabel}
					</span>
				</div>
				{/* 引用了FormControlLabel组件，用于导出布局元数据开关行 */}
				<FormControlLabel
					control={
						// 引用了Switch组件，用于导出布局元数据只读开关
						<Switch checked={prefs.includeLayoutMeta} disabled />
					}
					label="导出编辑器布局元数据"
				/>
				{/* 引用了FormControlLabel组件，用于包含资源开关行 */}
				<FormControlLabel
					control={
						// 引用了Switch组件，用于包含资源只读开关
						<Switch checked={prefs.includeAssets} disabled />
					}
					label="包含资源文件"
				/>
				{/* 引用了FormControlLabel组件，用于导入复制资源开关行 */}
				<FormControlLabel
					control={
						// 引用了Switch组件，用于导入复制资源只读开关
						<Switch checked={prefs.copyAssetsOnImport} disabled />
					}
					label="导入时复制资源到资源库"
				/>
				<div className={styles.prefRow}>
					<span className={styles.prefLabel}>默认导出目录</span>
					<span className={styles.prefValue}>
						{prefs.defaultExportDir || "系统默认"}
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
			{/* 引用了FormControlLabel组件，用于显示内部 ID 开关行 */}
			<FormControlLabel
				control={
					// 引用了Switch组件，用于显示内部 ID 只读开关
					<Switch checked={false} disabled />
				}
				label="显示内部 ID"
			/>
			{/* 引用了FormControlLabel组件，用于 JSON 高级视图开关行 */}
			<FormControlLabel
				control={
					// 引用了Switch组件，用于 JSON 高级视图只读开关
					<Switch checked={false} disabled />
				}
				label="默认打开 JSON 高级视图"
			/>
			<div className={styles.warnBox}>
				清理缓存 / 重建索引会打断未保存编辑；本步仅展示警示，不执行危险操作。
			</div>
		</div>
	);
};

export type SchemaEnginePanelProps = {
	/** Schema / 引擎兼容态 */
	status: SchemaEngineStatus;
	/** 校验报告条目 */
	issues: readonly ValidationIssue[];
	/** 是否展开校验报告 */
	showReport: boolean;
	/** 切换报告开合 */
	onToggleReport: () => void;
};

export const SchemaEnginePanel: FC<SchemaEnginePanelProps> = function ({
	// status 是 Schema / 引擎兼容投影
	status,
	// issues 是校验报告条目
	issues,
	// showReport 控制报告展开
	showReport,
	// onToggleReport 切换报告开合
	onToggleReport,
}) {
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
				{/* 引用了Typography组件，用于 CallCard 类型标签说明 */}
				<Typography variant="caption" className={styles.prefLabel}>
					可用 CallCard 类型
				</Typography>
				<div className={styles.tagList}>
					{status.availableCardKinds.map(function (k) {
						return (
							<span key={k} className={styles.tag}>
								{k}
							</span>
						);
					})}
				</div>
				{/* 引用了Typography组件，用于 Effect 类型标签说明 */}
				<Typography variant="caption" className={styles.prefLabel}>
					可用 Effect 类型
				</Typography>
				<div className={styles.tagList}>
					{status.availableEffects.map(function (k) {
						return (
							<span key={k} className={styles.tag}>
								{k}
							</span>
						);
					})}
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
					{/* 引用了ValidationReportPanel组件，用于展示校验问题 */}
					<ValidationReportPanel issues={issues} />
				</div>
			) : null}
		</div>
	);
};
