/**
	* 从 ajaxProxy mock 组装设置页整包快照。
	* 静态阶段真源仍是 mock；禁止 UI 直引；日后换真偏好 API 只改本文件。
	*/
import {
	MOCK_APPEARANCE,
	MOCK_DEBUGGER_PREFS,
	MOCK_EDITOR_PREFS,
	MOCK_IMPORT_EXPORT_PREFS,
	MOCK_SCHEMA_STATUS,
	MOCK_VALIDATION_ISSUES,
	SETTINGS_NAV,
} from "@studio-v2/src/utils/ajaxProxy/settings/mockSettingsData";
import type { SettingsSnapshot } from "@studio-v2/typeFiles/settings/store/settingsStoreState";

/**
	* 同步读取静态设置 mock。
	* 不写盘；返回可灌 store 的整包投影。
	*/
export function loadSettingsMock(): SettingsSnapshot {
	return {
		nav: SETTINGS_NAV,
		appearance: MOCK_APPEARANCE,
		editor: MOCK_EDITOR_PREFS,
		debugger: MOCK_DEBUGGER_PREFS,
		importExport: MOCK_IMPORT_EXPORT_PREFS,
		schema: MOCK_SCHEMA_STATUS,
		validationIssues: MOCK_VALIDATION_ISSUES,
	};
}
