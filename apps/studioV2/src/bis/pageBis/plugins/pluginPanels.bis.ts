/**
	* L2 插件面板 feature bis：拉 panels API，供 Settings / 角色 / 用户页挂载。
	*/
"use client";

import { useEffect, useState } from "react";
import { fetchPluginPanels } from "@studio-v2/src/utils/ajaxProxy/plugins/pluginsApi";
import type { PluginPanelView } from "@studio-v2/typeFiles/plugins/pluginPanels";

/**
	* 订某 UI 槽的插件面板列表。
	*/
export function usePluginPanelsBis(slot: PluginPanelView["slot"]): {
	panels: PluginPanelView[];
	loading: boolean;
	error: string | undefined;
} {
	const [panels, setPanels] = useState<PluginPanelView[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | undefined>();
	useEffect(
		function () {
			let cancelled = false;
			setLoading(true);
			void (async function () {
				try {
					const res = await fetchPluginPanels(slot);
					if (cancelled) return;
					setPanels(res.panels);
					setError(undefined);
				} catch (err) {
					if (cancelled) return;
					setError(err instanceof Error ? err.message : String(err));
				} finally {
					if (!cancelled) setLoading(false);
				}
			})();
			return function () {
				cancelled = true;
			};
		},
		[slot],
	);
	return { panels, loading, error };
}
