/**
	* debugger 叙事会话 / 信箱 / stamp / reset 结果型 write。
	*/
import type { StoreApi } from "zustand";
import type {
	DebuggerMailboxLoadResult,
	DebuggerSessionLoadResult,
} from "@studio-v2/typeFiles/debugger/store/debuggerStoreState";
import type { DebuggerMailboxSnapshot } from "@studio-v2/typeFiles/debugger/mailboxView";
import type { DebuggerCallSessionView } from "@studio-v2/typeFiles/debugger/callSession";
import {
	createDebuggerSessionSlice,
	type DebuggerStoreState,
} from "@studio-v2/src/stores/debugger/model/debuggerStoreModel";

type DebuggerSet = StoreApi<DebuggerStoreState>["setState"];

type SessionLoadActions = Pick<
	DebuggerStoreState,
	| "applySessionLoadStarted"
	| "applySessionLoadResult"
	| "bumpSessionRefreshStamp"
>;

type CallCommandActions = Pick<
	DebuggerStoreState,
	| "applyCallCommandStarted"
	| "applyCallCommandResult"
	| "applyCallCommandFailed"
	| "resetActiveCall"
>;

type MailboxActions = Pick<
	DebuggerStoreState,
	| "setMailboxUserId"
	| "applyMailboxLoadStarted"
	| "applyMailboxLoadResult"
	| "applyMailboxCommandStarted"
	| "applyMailboxCommandResult"
	| "applyMailboxCommandFailed"
	| "bumpMailboxRefreshStamp"
>;

function createSessionLoadActions(set: DebuggerSet): SessionLoadActions {
	return {
		applySessionLoadStarted() {
			set({
				sessionLoading: true,
				sessionLoadError: undefined,
			});
		},

		applySessionLoadResult(result: DebuggerSessionLoadResult) {
			if (!result.ok) {
				set({
					sessionLoading: false,
					sessionLoadError: result.message,
					session: null,
				});
				return;
			}
			set({
				sessionLoading: false,
				sessionLoadError: undefined,
				session: result.session,
			});
		},

		bumpSessionRefreshStamp() {
			set(function (prev) {
				return { sessionRefreshStamp: prev.sessionRefreshStamp + 1 };
			});
		},
	};
}

function createCallCommandActions(set: DebuggerSet): CallCommandActions {
	return {
		applyCallCommandStarted() {
			set({
				callBusy: true,
				callError: undefined,
			});
		},

		applyCallCommandResult(session: DebuggerCallSessionView) {
			set({
				activeCall: session,
				callBusy: false,
				callError: undefined,
			});
		},

		applyCallCommandFailed(message) {
			set({
				callBusy: false,
				callError: message,
			});
		},

		resetActiveCall() {
			set({
				activeCall: null,
				callBusy: false,
				callError: undefined,
			});
		},
	};
}

function createMailboxActions(set: DebuggerSet): MailboxActions {
	return {
		setMailboxUserId(userId) {
			set({ mailboxUserId: userId });
		},

		applyMailboxLoadStarted() {
			set({
				mailboxLoading: true,
				mailboxError: undefined,
			});
		},

		applyMailboxLoadResult(result: DebuggerMailboxLoadResult) {
			if (!result.ok) {
				set({
					mailboxLoading: false,
					mailboxError: result.message,
					mailbox: null,
				});
				return;
			}
			set({
				mailboxLoading: false,
				mailboxError: undefined,
				mailbox: result.mailbox,
			});
		},

		applyMailboxCommandStarted() {
			set({
				mailboxBusy: true,
				mailboxError: undefined,
			});
		},

		applyMailboxCommandResult(input: {
			mailbox: DebuggerMailboxSnapshot;
			lastListenSummary?: string | undefined;
		}) {
			set({
				mailboxBusy: false,
				mailboxError: undefined,
				mailbox: input.mailbox,
				lastListenSummary: input.lastListenSummary,
			});
		},

		applyMailboxCommandFailed(message) {
			set({
				mailboxBusy: false,
				mailboxError: message,
			});
		},

		bumpMailboxRefreshStamp() {
			set(function (prev) {
				return { mailboxRefreshStamp: prev.mailboxRefreshStamp + 1 };
			});
		},
	};
}

/** 会话灌账、真实通话、信箱读写口、stamp、reset */
export function createDebuggerSessionActions(
	set: DebuggerSet,
): Pick<
	DebuggerStoreState,
	| "applySessionLoadStarted"
	| "applySessionLoadResult"
	| "bumpSessionRefreshStamp"
	| "applyCallCommandStarted"
	| "applyCallCommandResult"
	| "applyCallCommandFailed"
	| "resetActiveCall"
	| "setMailboxUserId"
	| "applyMailboxLoadStarted"
	| "applyMailboxLoadResult"
	| "applyMailboxCommandStarted"
	| "applyMailboxCommandResult"
	| "applyMailboxCommandFailed"
	| "bumpMailboxRefreshStamp"
	| "resetDebuggerSession"
> {
	return {
		...createSessionLoadActions(set),
		...createCallCommandActions(set),
		...createMailboxActions(set),

		resetDebuggerSession() {
			set(function (prev) {
				return {
					...createDebuggerSessionSlice(),
					sessionRefreshStamp: prev.sessionRefreshStamp,
					mailboxRefreshStamp: prev.mailboxRefreshStamp,
				};
			});
		},
	};
}
