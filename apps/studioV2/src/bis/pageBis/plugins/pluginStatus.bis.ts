/**
	* L2 插件状态 feature bis：拉 /api/plugins/status。
	*/
"use client";

import { useEffect, useState } from "react";
import { fetchPluginStatus } from "@studio-v2/src/utils/ajaxProxy/plugins/pluginsApi";
import type { PluginStatusResponse } from "@studio-v2/typeFiles/plugins/pluginPanels";

/**
	* 订插件加载状态；供调试器 Plugins 面板。
	*/
export function usePluginStatusBis(): {
	status: PluginStatusResponse | null;
	loading: boolean;
	error: string | undefined;
} {
	const [status, setStatus] = useState<PluginStatusResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | undefined>();
	useEffect(function () {
		let cancelled = false;
		void (async function () {
			try {
				const next = await fetchPluginStatus();
				if (cancelled) return;
				setStatus(next);
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
	}, []);
	return { status, loading, error };
}
