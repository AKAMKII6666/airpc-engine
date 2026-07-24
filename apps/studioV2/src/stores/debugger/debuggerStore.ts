/**
	* 调试器域账本（Zustand）。
	* 切片：叙事会话快照 / 信箱 / loading·error / refreshStamp；只结果型 write。
	* 禁网络、禁 import bis / ajaxProxy / next/navigation（STRUCT-022）。
	* 灌账在 shellBis；信箱命令在 pageBis；本文件不挂 UI。
	*/
import { create } from "zustand";
import {
	createDebuggerSessionSlice,
	type DebuggerStoreState,
} from "@studio-v2/src/stores/debugger/model/debuggerStoreModel";
import { createDebuggerSessionActions } from "@studio-v2/src/stores/debugger/writes/debuggerStoreSessionWrites";
import { createDebuggerValidateActions } from "@studio-v2/src/stores/debugger/writes/debuggerStoreValidateWrites";

export type { DebuggerStoreState } from "@studio-v2/src/stores/debugger/model/debuggerStoreModel";
export { DEBUGGER_STORE_DEFAULT_MAILBOX_USER_ID } from "@studio-v2/src/stores/debugger/model/debuggerStoreModel";

export const useDebuggerStore = create<DebuggerStoreState>((set) => ({
	...createDebuggerSessionSlice(),
	sessionRefreshStamp: 0,
	mailboxRefreshStamp: 0,
	...createDebuggerSessionActions(set),
	...createDebuggerValidateActions(set),
}));
