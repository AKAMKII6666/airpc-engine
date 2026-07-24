/**
	* 跨页当前玩家会话 bis：水合 / 读写 studioSession；UI 禁直引 store。
	*/
"use client";

import { useEffect } from "react";
import {
	hydrateStudioSessionFromStorage,
	useStudioSessionStore,
	type StudioCurrentUser,
} from "@studio-v2/src/stores/studioSession/studioSessionStore";

/**
	* UI 可读的跨页当前玩家投影；真源在 studioSession store + sessionStorage。
	*/
export type StudioSessionUserBis = {
	/** 当前玩家；userId 空串表示未选 */
	currentUser: StudioCurrentUser;
	/** 是否已选定玩家（userId 非空） */
	hasUser: boolean;
	/** 写入跨页会话并持久化 sessionStorage */
	setCurrentUser: (user: StudioCurrentUser) => void;
	/** 清除当前玩家与 sessionStorage */
	clearCurrentUser: () => void;
};

/**
	* 订 studioSession；挂载时从 sessionStorage 水合一次。
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

	useEffect(
		function () {
			hydrateStudioSessionFromStorage();
		},
		[],
	);

	return {
		currentUser,
		hasUser: currentUser.userId.trim() !== "",
		setCurrentUser,
		clearCurrentUser,
	};
}

/** 非 hook：水合入口（壳层 layout 亦可调） */
export function hydrateStudioSession(): void {
	hydrateStudioSessionFromStorage();
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
