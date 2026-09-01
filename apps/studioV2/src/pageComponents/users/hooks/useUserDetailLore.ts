/**
	* 玩家详情 lore 状态：挂载回读预览；保存／重生成后更新。
	* 网络编排经 bis；本 hook 仅管瞬时态。
	*/
"use client";

import { useCallback, useEffect, useState } from "react";
import type { BootstrapUserLoreResult } from "@studio-v2/src/bis/pageBis/users/detail/bootstrapUserLore_bis";
import { loadUserDetail } from "@studio-v2/src/bis/pageBis/users/detail/loadUserDetail_bis";
import type { SaveUserDetailResult } from "@studio-v2/src/bis/pageBis/users/detail/save/saveUser_bis";
import type { LorePreviewDto } from "@studio-v2/typeFiles/library/users/loreBootstrap";

function toErrorMessage(error: unknown): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	return "操作失败，请稍后重试";
}

function bootstrapNotice(result: BootstrapUserLoreResult): string | undefined {
	return (
		result.notice ??
		(result.lorePreview.source === "llm"
			? "世界背景已用 LLM 重新生成"
			: undefined)
	);
}

/**
	* 详情页 lore 瞬时态；不进 users store。
	*/
export function useUserDetailLore(userId: string) {
	const [lorePreview, setLorePreview] = useState<LorePreviewDto | null>(null);
	const [loreNotice, setLoreNotice] = useState<string | undefined>();
	const [loreBusy, setLoreBusy] = useState(false);

	useEffect(
		function () {
			let cancelled = false;
			void (async function () {
				try {
					const data = await loadUserDetail(userId);
					if (cancelled) return;
					setLorePreview(data.lorePreview);
					setLoreNotice(undefined);
				} catch {
					if (cancelled) return;
					setLorePreview(null);
				}
			})();
			return function () {
				cancelled = true;
			};
		},
		[userId],
	);

	const applySaveResult = useCallback(function (
		result: SaveUserDetailResult,
	): void {
		if (result.lorePreview !== undefined) {
			setLorePreview(result.lorePreview);
		}
		setLoreNotice(
			result.loreRegenSuggested
				? "地点已变，可重新生成世界背景"
				: undefined,
		);
	}, []);

	const beginBootstrap = useCallback(function (): void {
		setLoreBusy(true);
		setLoreNotice(undefined);
	}, []);

	const applyBootstrapResult = useCallback(function (
		result: BootstrapUserLoreResult,
	): void {
		setLorePreview(result.lorePreview);
		setLoreNotice(bootstrapNotice(result));
		setLoreBusy(false);
	}, []);

	const failBootstrap = useCallback(function (error: unknown): void {
		setLoreNotice(toErrorMessage(error));
		setLoreBusy(false);
	}, []);

	return {
		lorePreview,
		loreNotice,
		loreBusy,
		applySaveResult,
		beginBootstrap,
		applyBootstrapResult,
		failBootstrap,
	};
}
