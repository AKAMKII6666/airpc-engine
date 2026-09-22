/**
	* UserGate 会话 bis：拉用户列表 / 选中 / 快速新建并写入 studioSession。
	*/
"use client";

import type { User } from "@studio-v2/typeFiles/library/users/engine/engineUser";
import { useUserGateListControls } from "./userGateSession.helpers";

/**
	* UserGate 弹层会话投影：列表瞬时态 + 写入 studioSession 的命令。
	* 与 users 库页 store 分离；仅门禁弹层挂载时拉列表。
	*/
export type UserGateSessionBis = {
	/** 磁盘玩家列表；打开门禁时 GET，非 Profile 全文 */
	users: User[];
	/** 列表请求进行中 */
	loading: boolean;
	/** 列表失败人话；成功时 undefined */
	error: string | undefined;
	/** 触发列表重拉（bump reloadStamp） */
	reload: () => void;
	/** 写入跨页 studioSession 并视为选定 */
	selectUser: (userId: string, nickname: string) => void;
	/** 新建薄 Profile 并选中；返回新 userId */
	createAndSelect: (nickname: string) => Promise<string>;
};

/**
	* UserGate 专用：打开时拉列表；选中写跨页 studioSession。
	*/
export function useUserGateSessionBis(open: boolean): UserGateSessionBis {
	return useUserGateListControls(open);
}
