/**
	* 外观 / 编辑器 / 调试器偏好面板。
	* 静态演示；不写盘、无泳道相关项；数据由 props 注入。
	*/
"use client";

import type { FC } from "react";
import { FormControlLabel, Switch } from "@mui/material";
import type {
	AppearancePrefs,
	DebuggerPrefs,
	EditorPrefs,
} from "@studio-v2/typeFiles/settings/studioSettings";
import styles from "../SettingsShell.module.scss";

export type AppearancePanelProps = {
	/** 外观偏好投影 */
	appearance: AppearancePrefs;
};

export const AppearancePanel: FC<AppearancePanelProps> = function ({
	// appearance 是外观偏好投影
	appearance,
}) {
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
					<span className={styles.prefValue}>{appearance.gridStrength}%</span>
				</div>
				{/* 引用了FormControlLabel组件，用于连线动画开关行 */}
				<FormControlLabel
					control={
						// 引用了Switch组件，用于连线动画只读开关
						<Switch checked={appearance.edgeAnimation} disabled />
					}
					label="连线动画"
				/>
				<div className={styles.prefRow}>
					<span className={styles.prefLabel}>高亮强度</span>
					<span className={styles.prefValue}>
						{appearance.highlightStrength}%
					</span>
				</div>
			</div>
		</div>
	);
};

export type EditorPrefsPanelProps = {
	/** 编辑器偏好投影 */
	editor: EditorPrefs;
};

export const EditorPrefsPanel: FC<EditorPrefsPanelProps> = function ({
	// editor 是编辑器偏好投影
	editor,
}) {
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
						{editor.defaultZoomPercent}%
					</span>
				</div>
				{/* 引用了FormControlLabel组件，用于小地图开关行 */}
				<FormControlLabel
					control={
						// 引用了Switch组件，用于小地图只读开关
						<Switch checked={editor.showMinimap} disabled />
					}
					label="显示小地图"
				/>
				{/* 引用了FormControlLabel组件，用于校验浮窗开关行 */}
				<FormControlLabel
					control={
						// 引用了Switch组件，用于校验浮窗只读开关
						<Switch checked={editor.showValidationFloat} disabled />
					}
					label="默认显示校验浮窗"
				/>
				{/* 引用了FormControlLabel组件，用于自动保存开关行 */}
				<FormControlLabel
					control={
						// 引用了Switch组件，用于自动保存只读开关
						<Switch checked={editor.autoSave} disabled />
					}
					label={`自动保存（间隔 ${editor.autoSaveIntervalSec} 秒）`}
				/>
				<div className={styles.prefRow}>
					<span className={styles.prefLabel}>新卡片默认类型</span>
					<span className={styles.prefValue}>
						{editor.defaultCardKindLabel}
					</span>
				</div>
			</div>
		</div>
	);
};

export type DebuggerPrefsPanelProps = {
	/** 调试器偏好投影 */
	debuggerPrefs: DebuggerPrefs;
};

export const DebuggerPrefsPanel: FC<DebuggerPrefsPanelProps> = function ({
	// debuggerPrefs 是调试器默认偏好投影
	debuggerPrefs,
}) {
	return (
		<div>
			<h2 className={styles.sectionTitle}>调试器</h2>
			<p className={styles.sectionSub}>仅影响默认值，不改变引擎语义。</p>
			<div className={styles.prefGrid}>
				<div className={styles.prefRow}>
					<span className={styles.prefLabel}>默认用户档案</span>
					<span className={styles.prefValue}>
						{debuggerPrefs.defaultUserName || "未设置"}
					</span>
				</div>
				{/* 引用了FormControlLabel组件，用于默认重置故事开关行 */}
				<FormControlLabel
					control={
						// 引用了Switch组件，用于默认重置故事只读开关
						<Switch checked={debuggerPrefs.defaultResetStory} disabled />
					}
					label="默认重置故事状态"
				/>
				{/* 引用了FormControlLabel组件，用于高级日志开关行 */}
				<FormControlLabel
					control={
						// 引用了Switch组件，用于高级日志只读开关
						<Switch checked={debuggerPrefs.showAdvancedLogs} disabled />
					}
					label="默认展开高级日志"
				/>
				<div className={styles.prefRow}>
					<span className={styles.prefLabel}>时间推进步长</span>
					<span className={styles.prefValue}>
						{debuggerPrefs.clockStepSec} 秒
					</span>
				</div>
				<div className={styles.prefRow}>
					<span className={styles.prefLabel}>调试记录保留</span>
					<span className={styles.prefValue}>
						{debuggerPrefs.recordRetainCount} 条
					</span>
				</div>
			</div>
		</div>
	);
};
