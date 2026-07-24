/**
	* Studio 跨页会话：当前玩家（UserGate 真源）。
	* 与 users 列表页 session 分离；进编辑器 / 提示词预览硬依赖本切片。
	* selectedId 持久化到 sessionStorage，刷新页保留。
	*/
import { create } from "zustand";

const STORAGE_KEY = "studioV2.currentUser";

export type StudioCurrentUser = {
	/** Profile userId；空串表示未选 */
	userId: string;
	/** 展示昵称；可空串 */
	nickname: string;
};

function readStored(): StudioCurrentUser {
	if (typeof window === "undefined") {
		return { userId: "", nickname: "" };
	}
	try {
		const raw = sessionStorage.getItem(STORAGE_KEY);
		if (!raw) return { userId: "", nickname: "" };
		const parsed = JSON.parse(raw) as Partial<StudioCurrentUser>;
		const userId =
			typeof parsed.userId === "string" ? parsed.userId.trim() : "";
		const nickname =
			typeof parsed.nickname === "string" ? parsed.nickname.trim() : "";
		return { userId, nickname };
	} catch {
		return { userId: "", nickname: "" };
	}
}

function writeStored(user: StudioCurrentUser): void {
	if (typeof window === "undefined") return;
	if (user.userId === "") {
		sessionStorage.removeItem(STORAGE_KEY);
		return;
	}
	sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export type StudioSessionStoreState = {
	currentUser: StudioCurrentUser;
	/** 选定当前玩家；空 userId 表示清除 */
	setCurrentUser: (user: StudioCurrentUser) => void;
	clearCurrentUser: () => void;
};

export const useStudioSessionStore = create<StudioSessionStoreState>((set) => ({
	currentUser: { userId: "", nickname: "" },

	setCurrentUser(user) {
		const next: StudioCurrentUser = {
			userId: user.userId.trim(),
			nickname: user.nickname.trim(),
		};
		writeStored(next);
		set({ currentUser: next });
	},

	clearCurrentUser() {
		writeStored({ userId: "", nickname: "" });
		set({ currentUser: { userId: "", nickname: "" } });
	},
}));

/**
	* 客户端首屏：从 sessionStorage 水合当前用户。
	* 须在 UserGate / 编辑器壳挂载时调用一次。
	*/
export function hydrateStudioSessionFromStorage(): void {
	const stored = readStored();
	const cur = useStudioSessionStore.getState().currentUser;
	if (cur.userId === stored.userId && cur.nickname === stored.nickname) {
		return;
	}
	useStudioSessionStore.setState({ currentUser: stored });
}
