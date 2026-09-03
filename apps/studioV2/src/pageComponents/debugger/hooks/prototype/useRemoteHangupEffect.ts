/**
	* 对方挂断时同步清电话 UI，并后台 endCall。
	*/
"use client";

import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { CallState, PhoneUiState } from "@studio-v2/src/pageComponents/debugger/debuggerUiModel";
import type { DebuggerCallSessionBis } from "@studio-v2/src/bis/pageBis/debugger/callSession.bis";
import {
	appendMemoryTraceDetail,
	formatEndResultLines,
	lockedPhoneUi,
} from "./core/prototypeSessionHelpers";
import type { LastMemoryTraceState } from "./core/prototypeSessionTypes";

export function useRemoteHangupEffect(input: {
	activeRemoteHangupEventId: string | null;
	callState: CallState;
	callBis: DebuggerCallSessionBis;
	remoteHangupHandledRef: MutableRefObject<string | null>;
	clearPhoneTimers: () => void;
	setDraft: (value: string) => void;
	setLocalError: (message: string | undefined) => void;
	setPhoneUi: Dispatch<SetStateAction<PhoneUiState>>;
	showHangupToast: (message: string) => void;
	setLastMemoryTrace: (value: LastMemoryTraceState) => void;
}): void {
	const {
		activeRemoteHangupEventId,
		callState,
		callBis,
		remoteHangupHandledRef,
		clearPhoneTimers,
		setDraft,
		setLocalError,
		setPhoneUi,
		showHangupToast,
		setLastMemoryTrace,
	} = input;

	useEffect(function () {
		if (!activeRemoteHangupEventId || callState.mode !== "inCall") return;
		if (remoteHangupHandledRef.current === activeRemoteHangupEventId) return;
		remoteHangupHandledRef.current = activeRemoteHangupEventId;
		const sessionId = callState.session.sessionId;
		clearPhoneTimers();
		setDraft("");
		setLocalError(undefined);
		setPhoneUi(lockedPhoneUi());
		showHangupToast("对方已挂断");
		console.warn(
			"[StudioV2][post-call]",
			"对方已挂断，已返回拨号界面；副作用由 tip 跟踪",
		);
		void (async function () {
			const end = await callBis.endCall({ sessionId, hangupEarly: false });
			if (end) {
				for (const line of formatEndResultLines(end)) {
					console.warn("[StudioV2][post-call]", line, end);
				}
				callBis.refreshPostCallJobs();
				if (end.memoryTrace?.committed) {
					const trace = await appendMemoryTraceDetail(
						end,
						callBis.fetchMemoryTrace,
						function (line, detail) {
							console.warn("[StudioV2][post-call]", line, detail);
						},
					);
					if (trace && end.memoryTrace) {
						setLastMemoryTrace({
							dtoId: end.memoryTrace.dtoId,
							detail: trace,
						});
					}
				}
			} else {
				console.warn(
					"[StudioV2][post-call]",
					"挂机请求失败，请查看控制台或接口错误",
				);
			}
		})();
	}, [activeRemoteHangupEventId, callState, callBis]);
}
