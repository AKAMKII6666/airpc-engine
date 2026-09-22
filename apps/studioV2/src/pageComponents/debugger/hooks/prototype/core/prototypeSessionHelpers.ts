/**
	* 调试器电话原型会话纯函数助手。
	*/
import {
	type CallState,
	findRoleByAgentId,
	findRoleByDialedNumber,
	type PhoneUiState,
	latestRemoteHangupEvent,
	type ReceiverMode,
	type RoleRow,
} from "@studio-v2/src/pageComponents/debugger/debuggerUiModel";
import type { DebuggerCallSessionBis } from "@studio-v2/src/bis/pageBis/debugger/callSession/callSession.bis";
import type {
	DebuggerCallEndView,
	DebuggerMemoryCommitTraceDetailView,
} from "@studio-v2/typeFiles/debugger/callSession/callSession";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";

type TimeoutRef = MutableRefObject<ReturnType<typeof setTimeout> | null>;
type PhoneSetter = Dispatch<SetStateAction<PhoneUiState>>;

export function clearTimerRefs(...refs: TimeoutRef[]): void {
	refs.forEach(function (timerRef) {
		if (timerRef.current) clearTimeout(timerRef.current);
	});
}

export function lockedPhoneUi(): PhoneUiState {
	return { phase: "locked", receiverMode: null, dialed: "" };
}

export function readyPhoneUi(receiverMode: ReceiverMode): PhoneUiState {
	return { phase: "ready", receiverMode, dialed: "" };
}

export function projectCallState(
	activeCall: DebuggerCallSessionBis["activeCall"],
	roles: readonly RoleRow[],
): CallState {
	if (!activeCall) return { mode: "idle" };
	return {
		mode: "inCall",
		session: activeCall,
		role: findRoleByAgentId(activeCall.agentId, roles),
	};
}

export function setReadyAfterFailedDial(setPhoneUi: PhoneSetter): void {
	setPhoneUi((previous) => ({ ...previous, phase: "ready" }));
}

export async function dialRoleByNumber(input: {
	/** 已输入号码；用于匹配角色 */
	dialed: string;
	/** 当前待机角色列表 */
	roles: readonly RoleRow[];
	/** 调试通话命令面 */
	callBis: DebuggerCallSessionBis;
	/** 本地错误 setter */
	setLocalError: (message: string | undefined) => void;
	/** 电话 UI setter */
	setPhoneUi: PhoneSetter;
	/** 输入草稿 setter */
	setDraft: (value: string) => void;
}): Promise<void> {
	const role = findRoleByDialedNumber(input.dialed, input.roles);
	if (!role) {
		input.setLocalError(`没有找到号码：${input.dialed}`);
		setReadyAfterFailedDial(input.setPhoneUi);
		return;
	}
	if (!role.canFreeCall) {
		input.setLocalError(`${role.name} 当前不可拨：${role.blockedReason}`);
		setReadyAfterFailedDial(input.setPhoneUi);
		return;
	}
	const session = await input.callBis.startFreeCall(role.agentId);
	if (!session) setReadyAfterFailedDial(input.setPhoneUi);
	input.setDraft("");
}

export function firstDialableNumber(roles: readonly RoleRow[]): string {
	return (
		roles.find(function (role) {
			return role.canFreeCall;
		})?.number ?? ""
	);
}

export function canAcceptDialKey(phoneUi: PhoneUiState): boolean {
	return phoneUi.phase === "ready" || phoneUi.phase === "debouncing";
}

export function remoteHangupEventId(callState: CallState): string | null {
	if (callState.mode !== "inCall") return null;
	return latestRemoteHangupEvent(callState.session)?.eventId ?? null;
}

export function hasRemoteHangup(callState: CallState): boolean {
	return remoteHangupEventId(callState) !== null;
}

import {
	formatEndResultLines,
	formatMemoryTraceLines,
} from "./prototypeSessionFormatters";

export {
	formatEndResultLines,
	formatMemoryTraceLines,
};

export async function appendMemoryTraceDetail(
	end: DebuggerCallEndView,
	fetchMemoryTrace: (
		dtoId: string,
	) => Promise<DebuggerMemoryCommitTraceDetailView>,
	appendLine: (line: string, detail?: unknown) => void,
): Promise<DebuggerMemoryCommitTraceDetailView | null> {
	if (!end.memoryTrace) return null;
	appendLine("正在读取 Memory Trace DTO...");
	try {
		const trace = await fetchMemoryTrace(end.memoryTrace.dtoId);
		for (const line of formatMemoryTraceLines(trace)) {
			appendLine(line, trace);
		}
		return trace;
	} catch (err) {
		appendLine(
			`Memory Trace DTO 读取失败：${err instanceof Error ? err.message : String(err)}`,
		);
		return null;
	}
}

