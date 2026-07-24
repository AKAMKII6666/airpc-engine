/**
	* 设置域 store 契约（FE）。
	* 偏好 / Schema / 校验报告为静态演示投影；不写盘、不改引擎语义。
	*/
import type {
	AppearancePrefs,
	DebuggerPrefs,
	EditorPrefs,
	ImportExportPrefs,
	SchemaEngineStatus,
	SettingsNavItem,
	ValidationIssue,
} from "@studio-v2/typeFiles/settings/studioSettings";

/**
	* 设置页整包快照（静态 mock 阶段一次灌入）。
	* 日后换真偏好 API 只改 load bis；store 只消费本结构。
	*/
export type SettingsSnapshot = {
	/** 左侧分类导航 */
	nav: readonly SettingsNavItem[];
	/** 外观偏好 */
	appearance: AppearancePrefs;
	/** 编辑器偏好 */
	editor: EditorPrefs;
	/** 调试器偏好 */
	debugger: DebuggerPrefs;
	/** 导入导出偏好 */
	importExport: ImportExportPrefs;
	/** Schema / 引擎兼容态 */
	schema: SchemaEngineStatus;
	/** 校验报告条目 */
	validationIssues: readonly ValidationIssue[];
};

/** shell 灌设置成功 */
export type SettingsLoadOkPayload = {
	/** 判别成功 */
	ok: true;
	/** 整包偏好快照 */
	snapshot: SettingsSnapshot;
};

/** shell 灌设置失败 */
export type SettingsLoadFailPayload = {
	/** 判别失败 */
	ok: false;
	/** 人话错误 */
	message: string;
};

/**
	* 设置加载结果联合；成功与失败互斥。
	*/
export type SettingsLoadResult =
	| SettingsLoadOkPayload
	| SettingsLoadFailPayload;
