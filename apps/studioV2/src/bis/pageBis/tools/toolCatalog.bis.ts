/** 卡片编辑器动态工具目录 BIS。 */
"use client";

import { useEffect, useState } from "react";
import { fetchToolCatalog } from "@studio-v2/src/utils/ajaxProxy/tools/toolCatalogApi";
import type { ToolCatalogDto } from "@studio-v2/typeFiles/tools/toolCatalog";

/**
	* 按角色、卡种和交互模式读取服务端唯一工具目录；输入变化时取消旧响应，避免草稿串目录。
	*/
export function useToolCatalogBis(input: {
	agentId: string;
	cardKind: string;
	interactionMode: string;
}): {
	catalog: ToolCatalogDto | null;
	loading: boolean;
	error: string | null;
} {
	const [catalog, setCatalog] = useState<ToolCatalogDto | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	useEffect(function () {
		if (!input.agentId || !input.cardKind || !input.interactionMode) {
			setCatalog(null);
			return;
		}
		let cancelled = false;
		setLoading(true);
		void fetchToolCatalog(input)
			.then(function (next) {
				if (cancelled) return;
				setCatalog(next);
				setError(null);
			})
			.catch(function (cause) {
				if (cancelled) return;
				setCatalog(null);
				setError(cause instanceof Error ? cause.message : String(cause));
			})
			.finally(function () {
				if (!cancelled) setLoading(false);
			});
		return function () {
			cancelled = true;
		};
	}, [input.agentId, input.cardKind, input.interactionMode]);
	return { catalog, loading, error };
}
