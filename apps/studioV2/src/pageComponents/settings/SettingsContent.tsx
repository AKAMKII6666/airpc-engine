/**
	* 按设置分类渲染右侧内容；装配层，不含偏好真源写盘。
	* 快照由 SettingsShell 经 feature bis 注入。
	*/
"use client";

import type { FC } from "react";
import type { SettingsCategoryId } from "@studio-v2/typeFiles/settings/studioSettings";
import type { SettingsSnapshot } from "@studio-v2/typeFiles/settings/store/settingsStoreState";
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
	/** 当前分类 */
	category: SettingsCategoryId;
	/** 设置整包快照 */
	snapshot: SettingsSnapshot;
	/** 是否展开校验报告 */
	showReport: boolean;
	/** 切换校验报告开合 */
	onToggleReport: () => void;
};

/** 分类 → 面板映射；新增分类时在此补齐，避免巨型 switch 堆业务。 */
export const SettingsContent: FC<SettingsContentProps> = function ({
	// category 是当前设置分类
	category,
	// snapshot 是 settings store 投影
	snapshot,
	// showReport 控制校验报告展开
	showReport,
	// onToggleReport 切换报告开合
	onToggleReport,
}) {
	if (category === "appearance") {
		// 引用了AppearancePanel组件，用于外观偏好展示
		return <AppearancePanel appearance={snapshot.appearance} />;
	}
	if (category === "editor") {
		// 引用了EditorPrefsPanel组件，用于编辑器偏好展示
		return <EditorPrefsPanel editor={snapshot.editor} />;
	}
	if (category === "debugger") {
		// 引用了DebuggerPrefsPanel组件，用于调试器偏好展示
		return <DebuggerPrefsPanel debuggerPrefs={snapshot.debugger} />;
	}
	if (category === "import_export") {
		// 引用了ImportExportPrefsPanel组件，用于导入导出偏好展示
		return <ImportExportPrefsPanel prefs={snapshot.importExport} />;
	}
	if (category === "advanced") {
		// 引用了AdvancedPrefsPanel组件，用于高级警示区展示
		return <AdvancedPrefsPanel />;
	}
	return (
		// 引用了SchemaEnginePanel组件，用于 Schema 与校验报告
		<SchemaEnginePanel
			status={snapshot.schema}
			issues={snapshot.validationIssues}
			showReport={showReport}
			onToggleReport={onToggleReport}
		/>
	);
};
