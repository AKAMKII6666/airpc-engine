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
import { useDebuggerCallSessionBis } from "@studio-v2/src/bis/pageBis/debugger/callSession/callSession.bis";
import type { DebuggerMailboxSessionBis } from "@studio-v2/src/bis/pageBis/debugger/mailbox/mailboxSession.bis";
import {
	clearTimerRefs,
	lockedPhoneUi,
	projectCallState,
	remoteHangupEventId,
} from "./core/prototypeSessionHelpers";
import { createPhoneCommands } from "./core/commands/prototypeSessionPhoneCommands";
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

function usePrototypeTimerBindings() {
	const [hangupToast, setHangupToast] = useState<HangupToastState>(null);
	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const dialingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	function clearPhoneTimers(): void {
		clearTimerRefs(debounceTimerRef, dialingTimerRef);
	}

	function showHangupToast(message: string): void {
		setHangupToast({ id: Date.now(), message });
	}

	function dismissHangupToast(): void {
		setHangupToast(null);
	}

	useEffect(function () {
		return function () {
			clearPhoneTimers();
		};
	}, []);

	return {
		hangupToast,
		debounceTimerRef,
		dialingTimerRef,
		clearPhoneTimers,
		showHangupToast,
		dismissHangupToast,
	};
}

function usePrototypePhoneRuntime(
	roles: readonly RoleRow[],
	mailboxBis: DebuggerMailboxSessionBis,
	callBis: ReturnType<typeof useDebuggerCallSessionBis>,
) {
	const [phoneUi, setPhoneUi] = useState<PhoneUiState>(lockedPhoneUi);
	const [draft, setDraft] = useState("");
	const [localError, setLocalError] = useState<string | undefined>();
	const [lastMemoryTrace, setLastMemoryTrace] =
		useState<LastMemoryTraceState>(null);
	const remoteHangupHandledRef = useRef<string | null>(null);
	const timers = usePrototypeTimerBindings();
	const callState = projectCallState(callBis.activeCall, roles);
	const commands = createPhoneCommands({
		phoneUi,
		callState,
		roles,
		draft,
		callBis,
		mailboxBis,
		clearPhoneTimers: timers.clearPhoneTimers,
		showHangupToast: timers.showHangupToast,
		setLastMemoryTrace,
		setPhoneUi,
		setDraft,
		setLocalError,
		debounceTimerRef: timers.debounceTimerRef,
		dialingTimerRef: timers.dialingTimerRef,
	});

	useRemoteHangupEffect({
		activeRemoteHangupEventId: remoteHangupEventId(callState),
		callState,
		callBis,
		remoteHangupHandledRef,
		clearPhoneTimers: timers.clearPhoneTimers,
		setDraft,
		setLocalError,
		setPhoneUi,
		showHangupToast: timers.showHangupToast,
		setLastMemoryTrace,
	});

	return {
		phoneUi,
		draft,
		setDraft,
		localError,
		hangupToast: timers.hangupToast,
		lastMemoryTrace,
		dismissHangupToast: timers.dismissHangupToast,
		commands,
		callState,
	};
}

export function useDebuggerPrototypeSession(
	roles: readonly RoleRow[],
	mailboxBis: DebuggerMailboxSessionBis,
): DebuggerPrototypeSession {
	const callBis = useDebuggerCallSessionBis();
	const runtime = usePrototypePhoneRuntime(roles, mailboxBis, callBis);
	const hasUnreadVoicemail = mailboxBis.mailbox?.hasUnread === true;
	return {
		callState: runtime.callState,
		phoneUi: runtime.phoneUi,
		draft: runtime.draft,
		busy: callBis.busy || mailboxBis.busy,
		error:
			runtime.localError ?? callBis.error ?? mailboxBis.error ?? undefined,
		hasUnreadVoicemail,
		postCallJobs: callBis.postCallJobs,
		postCallJobsLoading: callBis.postCallJobsLoading,
		postCallJobsError: callBis.postCallJobsError,
		retryPostCallJob: callBis.retryPostCallJob,
		postCallRetryingJobId: callBis.postCallRetryingJobId,
		hangupToast: runtime.hangupToast,
		lastMemoryTrace: runtime.lastMemoryTrace,
		setDraft: runtime.setDraft,
		dismissHangupToast: runtime.dismissHangupToast,
		resetDebugger: runtime.commands.resetDebugger,
		liftReceiver: runtime.commands.liftReceiver,
		pressDialKey: runtime.commands.pressDialKey,
		redial: runtime.commands.redial,
		dialFreeCall: runtime.commands.dialFreeCall,
		sendDraft: runtime.commands.sendDraft,
		startSimulateCall: runtime.commands.startSimulateCall,
		startSimulateChapterCall: runtime.commands.startSimulateChapterCall,
		startChapterEntryRing: runtime.commands.startChapterEntryRing,
		outcomeCompletedBeats: callBis.outcomeCompletedBeats,
		toggleOutcomeCompletedBeat: callBis.toggleOutcomeCompletedBeat,
	};
}
