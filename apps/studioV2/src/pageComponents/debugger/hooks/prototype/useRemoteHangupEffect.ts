/**
	* 对方挂断时同步清电话 UI，并后台 endCall。
	*/
"use client";

import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { CallState, PhoneUiState } from "@studio-v2/src/pageComponents/debugger/debuggerUiModel";
import type { DebuggerCallSessionBis } from "@studio-v2/src/bis/pageBis/debugger/callSession/callSession.bis";
import { lockedPhoneUi } from "./core/prototypeSessionHelpers";
import type { LastMemoryTraceState } from "./core/prototypeSessionTypes";
import { latestRemoteHangupEvent } from "@studio-v2/src/pageComponents/debugger/debuggerUiModel";
import { runRemoteHangupEndCall } from "./runRemoteHangupEndCall";

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

	useEffect(
		function () {
			if (!activeRemoteHangupEventId || callState.mode !== "inCall") return;
			if (remoteHangupHandledRef.current === activeRemoteHangupEventId) return;
			remoteHangupHandledRef.current = activeRemoteHangupEventId;
			const sessionId = callState.session.sessionId;
			const hangupEvent = latestRemoteHangupEvent(callState.session);
			clearPhoneTimers();
			setDraft("");
			setLocalError(undefined);
			setPhoneUi(lockedPhoneUi());
			showHangupToast("对方已挂断");
			console.warn(
				"[StudioV2][post-call]",
				"对方已挂断，已返回拨号界面；副作用由 tip 跟踪",
			);
			void runRemoteHangupEndCall({
				sessionId,
				hangupEvent,
				callBis,
				setLastMemoryTrace,
			});
		},
		[activeRemoteHangupEventId, callState, callBis],
	);
}
