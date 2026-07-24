/**
	* 设置页级 shell：打开页灌偏好 / Schema / 校验 mock；一类页只挂一次。
	* 不处理分类切换与报告开合（UI 瞬时态）。
	*/
"use client";

import { useEffect, useLayoutEffect } from "react";
import { loadSettingsMock } from "@studio-v2/src/bis/pageBis/settings/loadSettingsMock_bis";
import { useSettingsStore } from "@studio-v2/src/stores/settings/settingsStore";

function errorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	return fallback;
}

/**
	* 挂载于 /settings：按 stamp 灌整包快照；离页 reset。
	*/
export function useSettingsShellBis(): void {
	const refreshStamp = useSettingsStore(function (s) {
		return s.refreshStamp;
	});
	const applyLoadStarted = useSettingsStore(function (s) {
		return s.applyLoadStarted;
	});
	const applyLoadResult = useSettingsStore(function (s) {
		return s.applyLoadResult;
	});
	const resetSettingsSession = useSettingsStore(function (s) {
		return s.resetSettingsSession;
	});

	useEffect(
		function () {
			return function () {
				resetSettingsSession();
			};
		},
		[resetSettingsSession],
	);

	useLayoutEffect(
		function () {
			applyLoadStarted();
			try {
				const snapshot = loadSettingsMock();
				applyLoadResult({ ok: true, snapshot });
			} catch (error) {
				applyLoadResult({
					ok: false,
					message: errorMessage(error, "加载设置失败"),
				});
			}
		},
		[refreshStamp, applyLoadStarted, applyLoadResult],
	);
}
