/**
	* 电话命令共享 input 类型。
	*/
import type {
	CallState,
	PhoneUiState,
	RoleRow,
} from "@studio-v2/src/pageComponents/debugger/debuggerUiModel";
import type { DebuggerCallSessionBis } from "@studio-v2/src/bis/pageBis/debugger/callSession/callSession.bis";
import type { DebuggerMailboxSessionBis } from "@studio-v2/src/bis/pageBis/debugger/mailbox/mailboxSession.bis";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { LastMemoryTraceState } from "../prototypeSessionTypes";

type TimeoutRef = MutableRefObject<ReturnType<typeof setTimeout> | null>;
type PhoneSetter = Dispatch<SetStateAction<PhoneUiState>>;

export type PhoneCommandsInput = {
	phoneUi: PhoneUiState;
	callState: CallState;
	roles: readonly RoleRow[];
	draft: string;
	callBis: DebuggerCallSessionBis;
	mailboxBis: DebuggerMailboxSessionBis;
	clearPhoneTimers: () => void;
	showHangupToast: (message: string) => void;
	setLastMemoryTrace: (value: LastMemoryTraceState) => void;
	setPhoneUi: PhoneSetter;
	setDraft: (value: string) => void;
	setLocalError: (message: string | undefined) => void;
	debounceTimerRef: TimeoutRef;
	dialingTimerRef: TimeoutRef;
};
