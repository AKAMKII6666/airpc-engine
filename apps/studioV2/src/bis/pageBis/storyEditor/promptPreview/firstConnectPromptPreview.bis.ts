/**
	* 首通提示词预览 feature bis：经 ajaxProxy 请求；读当前玩家经 studioSession。
	*/
"use client";

import { useCallback } from "react";
import { useStudioSessionUserBis } from "@studio-v2/src/bis/pageBis/users/session/studioSessionUser.bis";
import type {
	PromptPreviewCallDirection,
	PromptPreviewResult,
} from "@studio-v2/typeFiles/story/promptPreview/promptPreviewDto";
import { usePromptPreviewLocalState } from "./firstConnectPromptPreview.helpers";

/**
	* 首通预览弹层会话投影：方向/小时/结果；网络只经本 bis。
	*/
export type FirstConnectPromptPreviewBis = {
	/**
		* studioSession 是否已客户端水合；false 时不得挂 UserGate。
		* 与 useStudioSessionUserBis.ready 同源。
		*/
	sessionReady: boolean;
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
	const getUserId = useCallback(
		function () {
			return session.currentUser.userId;
		},
		[session.currentUser.userId],
	);
	const local = usePromptPreviewLocalState(getUserId);

	const userLabel =
		session.currentUser.userId.trim() === ""
			? ""
			: session.currentUser.nickname.trim() ||
				session.currentUser.userId;

	return {
		sessionReady: session.ready,
		userId: session.currentUser.userId,
		userLabel,
		hasUser: session.hasUser,
		callDirection: local.callDirection,
		setCallDirection: local.setCallDirection,
		localHour: local.localHour,
		setLocalHour: local.setLocalHour,
		busy: local.busy,
		error: local.error,
		result: local.result,
		renderPreview: local.renderPreview,
		resetResult: local.resetResult,
	};
}
