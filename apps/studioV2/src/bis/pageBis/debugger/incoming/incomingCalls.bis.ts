/**
	* 调试器真实外呼：组装 store 切片与控件（入口 hook 保持短小）。
	*/
"use client";

import type { DebuggerIncomingCallView } from "@studio-v2/typeFiles/debugger/callSession/callSession";
import {
	useIncomingCallsAcceptReject,
	useIncomingCallsLocalState,
	useIncomingCallsPoll,
	useIncomingCallsRefresh,
} from "./incomingCallsControls.helpers";
import { useIncomingCallsStoreSlice } from "./incomingCallsStore.helpers";

/** UI 消费真实外呼的唯一命令面；隐藏 ajax 轮询、Host event 消费和 activeCall 灌账细节 */
export type DebuggerIncomingCallsBis = {
	/** 当前 pending 外呼；来自 Host shell event 队列 */
	incomingCalls: DebuggerIncomingCallView[];
	/** modal 展示第一条 pending 外呼；无则 null */
	activeIncomingCall: DebuggerIncomingCallView | null;
	/** GET 轮询中 */
	loading: boolean;
	/** 接听/拒接命令中 */
	busy: boolean;
	/** 轮询或命令失败人话；无则 undefined */
	error: string | undefined;
	/** 手动刷新 incoming event */
	refresh: () => Promise<void>;
	/** 接听当前外呼，成功后进入 activeCall */
	acceptIncomingCall: (eventId: string) => Promise<void>;
	/** 拒接当前外呼，仅关闭 modal */
	rejectIncomingCall: (eventId: string) => Promise<void>;
};

/** 订阅 Host incoming event，供电话壳 modal 消费 */
export function useDebuggerIncomingCallsBis(): DebuggerIncomingCallsBis {
	const slice = useIncomingCallsStoreSlice();
	const local = useIncomingCallsLocalState();
	const refresh = useIncomingCallsRefresh(slice, local);
	const actions = useIncomingCallsAcceptReject(slice, local);
	useIncomingCallsPoll(refresh);
	return {
		incomingCalls: local.incomingCalls,
		activeIncomingCall: local.incomingCalls[0] ?? null,
		loading: local.loading,
		busy: local.busy,
		error: local.error,
		refresh,
		acceptIncomingCall: actions.acceptIncomingCall,
		rejectIncomingCall: actions.rejectIncomingCall,
	};
}
