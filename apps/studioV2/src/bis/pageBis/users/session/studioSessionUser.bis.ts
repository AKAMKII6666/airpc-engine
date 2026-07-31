/**
	* 跨页当前玩家会话 bis：水合 / 读写 studioSession；UI 禁直引 store。
	* ready=false 时禁止挂 UserGate，避免空用户首帧开 Dialog 再关留下隐形遮罩。
	*/
"use client";

import { useEffect, useState } from "react";
import {
	hydrateStudioSessionFromStorage,
	useStudioSessionStore,
	type StudioCurrentUser,
} from "@studio-v2/src/stores/studioSession/studioSessionStore";

/**
	* 本页生命周期内是否已对 sessionStorage 水合过。
	* 跨组件共享，避免二次进页再闪一帧 ready=false。
	*/
let clientSessionHydrated = false;

/**
	* UI 可读的跨页当前玩家投影；真源在 studioSession store + sessionStorage。
	*/
export type StudioSessionUserBis = {
	/**
		* 是否已完成客户端水合；false 时不得根据 hasUser 开关 UserGate。
		* 单位：布尔；首屏 effect 后为 true。
		*/
	ready: boolean;
	/** 当前玩家；userId 空串表示未选 */
	currentUser: StudioCurrentUser;
	/** 是否已选定玩家（userId 非空）；仅 ready 后可信 */
	hasUser: boolean;
	/** 写入跨页会话并持久化 sessionStorage */
	setCurrentUser: (user: StudioCurrentUser) => void;
	/** 清除当前玩家与 sessionStorage */
	clearCurrentUser: () => void;
};

/**
	* 订 studioSession；挂载时从 sessionStorage 水合一次。
	* ready 翻转前调用方不得挂载 UserGate Dialog。
	*/
export function useStudioSessionUserBis(): StudioSessionUserBis {
	const currentUser = useStudioSessionStore(function (s) {
		return s.currentUser;
	});
	const setCurrentUser = useStudioSessionStore(function (s) {
		return s.setCurrentUser;
	});
	const clearCurrentUser = useStudioSessionStore(function (s) {
		return s.clearCurrentUser;
	});
	const [ready, setReady] = useState(clientSessionHydrated);

	useEffect(
		function () {
			hydrateStudioSessionFromStorage();
			clientSessionHydrated = true;
			setReady(true);
		},
		[],
	);

	return {
		ready,
		currentUser,
		hasUser: currentUser.userId.trim() !== "",
		setCurrentUser,
		clearCurrentUser,
	};
}

/** 非 hook：水合入口（壳层 layout 亦可调） */
export function hydrateStudioSession(): void {
	hydrateStudioSessionFromStorage();
	clientSessionHydrated = true;
}

/** 展示标签：昵称优先，否则 userId；未选空串 */
export function formatStudioUserLabel(user: StudioCurrentUser): string {
	if (user.userId.trim() === "") return "";
	return user.nickname.trim() || user.userId;
}

/** 供非 React 命令读当前 userId */
export function peekStudioSessionUserId(): string {
	return useStudioSessionStore.getState().currentUser.userId.trim();
}

/** 供命令写当前玩家 */
export function writeStudioSessionUser(user: StudioCurrentUser): void {
	useStudioSessionStore.getState().setCurrentUser(user);
}
