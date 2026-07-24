/**
	* 首通提示词预览 feature bis：经 ajaxProxy 请求；读当前玩家经 studioSession。
	*/
"use client";

import { useCallback, useState } from "react";
import { useStudioSessionUserBis } from "@studio-v2/src/bis/pageBis/users/session/studioSessionUser.bis";
import { postPromptPreview } from "@studio-v2/src/utils/ajaxProxy/story/api/promptPreviewApi";
import type {
	PromptPreviewCallDirection,
	PromptPreviewResult,
} from "@studio-v2/typeFiles/story/promptPreview/promptPreviewDto";

/**
	* 首通预览弹层会话投影：方向/小时/结果；网络只经本 bis。
	*/
export type FirstConnectPromptPreviewBis = {
	/** 当前 studioSession.userId；空串表示未选 */
	userId: string;
	/** 顶栏展示名；未选为空串 */
	userLabel: string;
	/** 是否已选定玩家 */
	hasUser: boolean;
	/** 接通方向；默认 inbound */
	callDirection: PromptPreviewCallDirection;
	/** 写接通方向（弹层瞬时态） */
	setCallDirection: (d: PromptPreviewCallDirection) => void;
	/** 本地小时；单位 0–23 */
	localHour: number;
	/** 写本地小时（弹层瞬时态） */
	setLocalHour: (h: number) => void;
	/** 渲染请求进行中 */
	busy: boolean;
	/** 渲染失败人话；成功时 undefined */
	error: string | undefined;
	/** 最近一次成功结果；未渲染为 null */
	result: PromptPreviewResult | null;
	/** 无玩家时返回 false，由 UI 打开 UserGate */
	renderPreview: (input: {
		card: unknown;
		packageId?: string;
	}) => Promise<boolean>;
	/** 打开弹层时清空上次结果与错误 */
	resetResult: () => void;
};

/**
	* 预览弹层会话：方向 / 小时 / 渲染结果；网络只经本 bis。
	*/
export function useFirstConnectPromptPreviewBis(): FirstConnectPromptPreviewBis {
	const session = useStudioSessionUserBis();
	const [callDirection, setCallDirection] =
		useState<PromptPreviewCallDirection>("inbound");
	const [localHour, setLocalHour] = useState(12);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | undefined>(undefined);
	const [result, setResult] = useState<PromptPreviewResult | null>(null);

	const resetResult = useCallback(function () {
		setResult(null);
		setError(undefined);
	}, []);

	const renderPreview = useCallback(
		async function (input: {
			card: unknown;
			packageId?: string;
		}): Promise<boolean> {
			const userId = session.currentUser.userId.trim();
			if (userId === "") {
				return false;
			}
			setBusy(true);
			setError(undefined);
			try {
				const data = await postPromptPreview({
					userId,
					callDirection,
					localHour,
					packageId: input.packageId,
					card: input.card,
				});
				setResult(data);
				return true;
			} catch (err: unknown) {
				setResult(null);
				setError(err instanceof Error ? err.message : "渲染失败");
				return true;
			} finally {
				setBusy(false);
			}
		},
		[session.currentUser.userId, callDirection, localHour],
	);

	const userLabel =
		session.currentUser.userId.trim() === ""
			? ""
			: session.currentUser.nickname.trim() ||
				session.currentUser.userId;

	return {
		userId: session.currentUser.userId,
		userLabel,
		hasUser: session.hasUser,
		callDirection,
		setCallDirection,
		localHour,
		setLocalHour,
		busy,
		error,
		result,
		renderPreview,
		resetResult,
	};
}
