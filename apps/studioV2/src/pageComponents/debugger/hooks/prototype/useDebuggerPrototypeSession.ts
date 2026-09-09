/**
	* 调试器电话硬件 UX 状态机。
	* 业务通话真源来自 debugger call bis；本 hook 只保留号码盘、计时器与输入草稿。
	*/
"use client";

import { useEffect, useRef, useState } from "react";
import {
	type PhoneUiState,
	type RoleRow,
} from "@studio-v2/src/pageComponents/debugger/debuggerUiModel";
import { useDebuggerCallSessionBis } from "@studio-v2/src/bis/pageBis/debugger/callSession.bis";
import type { DebuggerMailboxSessionBis } from "@studio-v2/src/bis/pageBis/debugger/mailboxSession.bis";
import {
	clearTimerRefs,
	lockedPhoneUi,
	projectCallState,
	remoteHangupEventId,
} from "./core/prototypeSessionHelpers";
import { createPhoneCommands } from "./core/prototypeSessionPhoneCommands";
import { useRemoteHangupEffect } from "./useRemoteHangupEffect";
import type {
	DebuggerPrototypeSession,
	HangupToastState,
	LastMemoryTraceState,
} from "./core/prototypeSessionTypes";

export type {
	HangupToastState,
	LastMemoryTraceState,
	DebuggerPrototypeSession,
} from "./core/prototypeSessionTypes";

export function useDebuggerPrototypeSession(
	roles: readonly RoleRow[],
	mailboxBis: DebuggerMailboxSessionBis,
): DebuggerPrototypeSession {
	const callBis = useDebuggerCallSessionBis();
	const [phoneUi, setPhoneUi] = useState<PhoneUiState>(lockedPhoneUi);
	const [draft, setDraft] = useState("");
	const [localError, setLocalError] = useState<string | undefined>();
	const [hangupToast, setHangupToast] = useState<HangupToastState>(null);
	const [lastMemoryTrace, setLastMemoryTrace] =
		useState<LastMemoryTraceState>(null);
	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const dialingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const remoteHangupHandledRef = useRef<string | null>(null);

	function clearPhoneTimers(): void {
		clearTimerRefs(debounceTimerRef, dialingTimerRef);
	}

	function showHangupToast(message: string): void {
		setHangupToast({ id: Date.now(), message });
	}

	function dismissHangupToast(): void {
		setHangupToast(null);
	}

	const callState = projectCallState(callBis.activeCall, roles);
	const activeRemoteHangupEventId = remoteHangupEventId(callState);
	const commands = createPhoneCommands({
		phoneUi,
		callState,
		roles,
		draft,
		callBis,
		mailboxBis,
		clearPhoneTimers,
		showHangupToast,
		setLastMemoryTrace,
		setPhoneUi,
		setDraft,
		setLocalError,
		debounceTimerRef,
		dialingTimerRef,
	});

	useEffect(function () {
		return function () {
			clearPhoneTimers();
		};
	}, []);

	useRemoteHangupEffect({
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
	});

	const hasUnreadVoicemail = mailboxBis.mailbox?.hasUnread === true;

	return {
		callState,
		phoneUi,
		draft,
		busy: callBis.busy || mailboxBis.busy,
		error: localError ?? callBis.error ?? mailboxBis.error ?? undefined,
		hasUnreadVoicemail,
		postCallJobs: callBis.postCallJobs,
		postCallJobsLoading: callBis.postCallJobsLoading,
		postCallJobsError: callBis.postCallJobsError,
		retryPostCallJob: callBis.retryPostCallJob,
		postCallRetryingJobId: callBis.postCallRetryingJobId,
		hangupToast,
		lastMemoryTrace,
		setDraft,
		dismissHangupToast,
		resetDebugger: commands.resetDebugger,
		liftReceiver: commands.liftReceiver,
		pressDialKey: commands.pressDialKey,
		redial: commands.redial,
		sendDraft: commands.sendDraft,
		startSimulateCall: commands.startSimulateCall,
		startSimulateChapterCall: commands.startSimulateChapterCall,
		startChapterEntryRing: commands.startChapterEntryRing,
		outcomeCompletedBeats: callBis.outcomeCompletedBeats,
		toggleOutcomeCompletedBeat: callBis.toggleOutcomeCompletedBeat,
	};
}
