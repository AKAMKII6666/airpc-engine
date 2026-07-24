/**
	* 设置会话 feature bis：从 settings store 投影给 UI。
	* 灌账在 shell；本 hook 不读 mock / ajaxProxy。
	*/
"use client";

import { useSettingsStore } from "@studio-v2/src/stores/settings/settingsStore";
import type { SettingsSnapshot } from "@studio-v2/typeFiles/settings/store/settingsStoreState";

/**
	* 设置会话投影：供 SettingsShell 绑导航与各面板。
	* snapshot 为 null 时表示尚未灌入或失败后清空。
	*/
export type SettingsSessionBis = {
	/** 整包快照；未灌入时为 null */
	snapshot: SettingsSnapshot | null;
	/** shell 灌入中 */
	loading: boolean;
	/** 灌入失败人话 */
	loadError: string | undefined;
};

/**
	* 订 settings store；供设置页消费。
	*/
export function useSettingsSessionBis(): SettingsSessionBis {
	const snapshot = useSettingsStore(function (s) {
		return s.snapshot;
	});
	const loading = useSettingsStore(function (s) {
		return s.loading;
	});
	const loadError = useSettingsStore(function (s) {
		return s.loadError;
	});

	return {
		snapshot,
		loading,
		loadError,
	};
}
