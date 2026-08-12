/**
	* 调试器真实外呼 feature bis：轮询 Host incoming event，并执行接听/拒接。
	*/
"use client";

import { useCallback, useEffect, useState } from "react";
import {
	fetchDebuggerIncomingCalls,
	postDebuggerIncomingAccept,
	postDebuggerIncomingReject,
} from "@studio-v2/src/utils/ajaxProxy/debugger/api/callSessionApi";
import { useDebuggerStore } from "@studio-v2/src/stores/debugger/debuggerStore";
import type { DebuggerIncomingCallView } from "@studio-v2/typeFiles/debugger/callSession";

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

function errorMessage(error: unknown): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	return "外呼请求失败";
}

/** 订阅 Host incoming event，供电话壳 modal 消费 */
export function useDebuggerIncomingCallsBis(): DebuggerIncomingCallsBis {
	const userId = useDebuggerStore(function (s) {
		return s.mailboxUserId;
	});
	const activeCall = useDebuggerStore(function (s) {
		return s.activeCall;
	});
	const applyCallStarted = useDebuggerStore(function (s) {
		return s.applyCallCommandStarted;
	});
	const applyCallResult = useDebuggerStore(function (s) {
		return s.applyCallCommandResult;
	});
	const applyCallFailed = useDebuggerStore(function (s) {
		return s.applyCallCommandFailed;
	});
	const [incomingCalls, setIncomingCalls] = useState<DebuggerIncomingCallView[]>([]);
	const [loading, setLoading] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | undefined>();

	const refresh = useCallback(
		async function () {
			if (activeCall) {
				setIncomingCalls([]);
				return;
			}
			setLoading(true);
			setError(undefined);
			try {
				setIncomingCalls(await fetchDebuggerIncomingCalls(userId));
			} catch (err) {
				setError(errorMessage(err));
			} finally {
				setLoading(false);
			}
		},
		[userId, activeCall],
	);

	const acceptIncomingCall = useCallback(
		async function (eventId: string) {
			setBusy(true);
			setError(undefined);
			applyCallStarted();
			try {
				const session = await postDebuggerIncomingAccept({ userId, eventId });
				applyCallResult(session);
				setIncomingCalls(function (previous) {
					return previous.filter((item) => item.eventId !== eventId);
				});
			} catch (err) {
				const message = errorMessage(err);
				setError(message);
				applyCallFailed(message);
			} finally {
				setBusy(false);
			}
		},
		[userId, applyCallStarted, applyCallResult, applyCallFailed],
	);

	const rejectIncomingCall = useCallback(
		async function (eventId: string) {
			setBusy(true);
			setError(undefined);
			try {
				setIncomingCalls(await postDebuggerIncomingReject({ userId, eventId }));
			} catch (err) {
				setError(errorMessage(err));
			} finally {
				setBusy(false);
			}
		},
		[userId],
	);

	useEffect(function () {
		void refresh();
		const timer = window.setInterval(function () {
			void refresh();
		}, 2500);
		return function () {
			window.clearInterval(timer);
		};
	}, [refresh]);

	return {
		incomingCalls,
		activeIncomingCall: incomingCalls[0] ?? null,
		loading,
		busy,
		error,
		refresh,
		acceptIncomingCall,
		rejectIncomingCall,
	};
}
