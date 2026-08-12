/**
	* 调试器电话硬件 UX 状态机。
	* 业务通话真源来自 debugger call bis；本 hook 只保留号码盘、计时器与输入草稿。
	*/
"use client";

import {
	useEffect,
	useRef,
	useState,
	type Dispatch,
	type MutableRefObject,
	type SetStateAction,
} from "react";
import {
	type CallState,
	firstUnreadVoicemail,
	findRoleByAgentId,
	findRoleByDialedNumber,
	type PhoneUiState,
	latestRemoteHangupEvent,
	type ReceiverMode,
	type RoleRow,
} from "@studio-v2/src/pageComponents/debugger/debuggerUiModel";
import {
	useDebuggerCallSessionBis,
	type DebuggerCallSessionBis,
} from "@studio-v2/src/bis/pageBis/debugger/callSession.bis";
import type { DebuggerMailboxSessionBis } from "@studio-v2/src/bis/pageBis/debugger/mailboxSession.bis";
import type { DebuggerVoicemailSlotView } from "@studio-v2/typeFiles/debugger/mailboxView";

type TimeoutRef = MutableRefObject<ReturnType<typeof setTimeout> | null>;
type PhoneSetter = Dispatch<SetStateAction<PhoneUiState>>;

export type DebuggerPrototypeSession = {
	/** 纯前端通话态；控制聊天/待机两种 UI */
	callState: CallState;
	/** 纯前端电话硬件态；控制号码盘、拨号遮罩和留言提示 */
	phoneUi: PhoneUiState;
	/** 玩家输入草稿；后续发送给 server chat API */
	draft: string;
	/** start/message 请求中；用于禁用发送与拨号 */
	busy: boolean;
	/** 真实通话请求失败人话；无则 undefined */
	error: string | undefined;
	/** 是否存在真实未读留言；用于电话灯和 * 键 */
	hasUnreadVoicemail: boolean;
	/** 更新玩家输入草稿 */
	setDraft: (value: string) => void;
	/** 重置电话和通话 UI */
	resetDebugger: () => void;
	/** 摘机或免提，解锁号码盘 */
	liftReceiver: (receiverMode: ReceiverMode) => void;
	/** 处理号码键和留言 * 键 */
	pressDialKey: (key: string) => void;
	/** 重播最近号码；原型中回落到第一名角色号码 */
	redial: () => void;
	/** 发送玩家输入到真实调试通话 API */
	sendDraft: () => void;
	/** 编辑器入口：直接从指定章节/卡启动调试通话 */
	startSimulateCall: (chapterId: string, cardId: string) => void;
	/** 编辑器入口：从章节 entryCardId 启动调试通话 */
	startSimulateChapterCall: (chapterId: string) => void;
};

function clearTimerRefs(...refs: TimeoutRef[]): void {
	refs.forEach(function (timerRef) {
		if (timerRef.current) clearTimeout(timerRef.current);
	});
}

function lockedPhoneUi(): PhoneUiState {
	return { phase: "locked", receiverMode: null, dialed: "" };
}

function readyPhoneUi(receiverMode: ReceiverMode): PhoneUiState {
	return { phase: "ready", receiverMode, dialed: "" };
}

function projectCallState(
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

function setReadyAfterFailedDial(setPhoneUi: PhoneSetter): void {
	setPhoneUi((previous) => ({ ...previous, phase: "ready" }));
}

async function dialRoleByNumber(input: {
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

function firstDialableNumber(roles: readonly RoleRow[]): string {
	return (
		roles.find(function (role) {
			return role.canFreeCall;
		})?.number ?? ""
	);
}

function canAcceptDialKey(phoneUi: PhoneUiState): boolean {
	return phoneUi.phase === "ready" || phoneUi.phase === "debouncing";
}

function remoteHangupEventId(callState: CallState): string | null {
	if (callState.mode !== "inCall") return null;
	return latestRemoteHangupEvent(callState.session)?.eventId ?? null;
}

function hasRemoteHangup(callState: CallState): boolean {
	return remoteHangupEventId(callState) !== null;
}

function createPhoneCommands(input: {
	/** 当前电话 UI 状态 */
	phoneUi: PhoneUiState;
	/** 当前通话态 */
	callState: CallState;
	/** 可拨角色行 */
	roles: readonly RoleRow[];
	/** 当前输入草稿 */
	draft: string;
	/** 通话命令面 */
	callBis: DebuggerCallSessionBis;
	/** 信箱命令面；用于 * 键听留言 */
	mailboxBis: DebuggerMailboxSessionBis;
	/** 清理电话计时器 */
	clearPhoneTimers: () => void;
	/** 电话 UI setter */
	setPhoneUi: PhoneSetter;
	/** 输入草稿 setter */
	setDraft: (value: string) => void;
	/** 本地错误 setter */
	setLocalError: (message: string | undefined) => void;
	/** 拨号 debounce 计时器 */
	debounceTimerRef: TimeoutRef;
	/** 建联计时器 */
	dialingTimerRef: TimeoutRef;
}) {
	function startDialing(dialed: string): void {
		input.setPhoneUi((previous) => ({ ...previous, phase: "dialing" }));
		input.dialingTimerRef.current = setTimeout(function () {
			void dialRoleByNumber({ ...input, dialed });
		}, 1200);
	}
	return {
		resetDebugger(): void {
			input.clearPhoneTimers();
			void resetPhoneAfterEnd(input);
		},
		liftReceiver(receiverMode: ReceiverMode): void {
			if (input.callState.mode === "inCall") return;
			input.setLocalError(undefined);
			input.setPhoneUi(readyPhoneUi(receiverMode));
		},
		pressDialKey(key: string): void {
			if (!canAcceptDialKey(input.phoneUi)) return;
			if (key === "*") {
				void showVoicemail(input);
				return;
			}
			input.setLocalError(undefined);
			if (input.debounceTimerRef.current) {
				clearTimeout(input.debounceTimerRef.current);
			}
			const nextDialed = `${input.phoneUi.dialed}${key}`;
			input.setPhoneUi((previous) => ({
				...previous,
				phase: "debouncing",
				dialed: `${previous.dialed}${key}`,
			}));
			input.debounceTimerRef.current = setTimeout(function () {
				startDialing(nextDialed);
			}, 2000);
		},
		redial(): void {
			if (input.phoneUi.phase !== "ready") return;
			const nextDialed = input.phoneUi.dialed || firstDialableNumber(input.roles);
			if (!nextDialed) {
				input.setLocalError("当前没有可拨的 free card 角色");
				return;
			}
			input.setPhoneUi((previous) => ({ ...previous, dialed: nextDialed }));
			startDialing(nextDialed);
		},
		sendDraft(): void {
			if (
				input.callState.mode !== "inCall" ||
				input.callBis.busy ||
				hasRemoteHangup(input.callState)
			) {
				return;
			}
			const text = input.draft.trim();
			if (!text) return;
			input.setDraft("");
			void input.callBis.sendMessage(text);
		},
		startSimulateCall(chapterId: string, cardId: string): void {
			input.clearPhoneTimers();
			input.setLocalError(undefined);
			input.setPhoneUi({ phase: "dialing", receiverMode: "speaker", dialed: "" });
			void startSimulateCallNow(input, chapterId, cardId);
		},
		startSimulateChapterCall(chapterId: string): void {
			input.clearPhoneTimers();
			input.setLocalError(undefined);
			input.setPhoneUi({ phase: "dialing", receiverMode: "speaker", dialed: "" });
			void startSimulateChapterNow(input, chapterId);
		},
	};
}

async function resetPhoneAfterEnd(
	input: Parameters<typeof createPhoneCommands>[0],
): Promise<void> {
	const ok = await input.callBis.endCall();
	if (!ok) return;
	input.setLocalError(undefined);
	input.setDraft("");
	input.setPhoneUi(lockedPhoneUi());
}

function roleNameForVoicemail(
	slot: DebuggerVoicemailSlotView,
	roles: readonly RoleRow[],
): string {
	return findRoleByAgentId(slot.agentId, roles).name;
}

async function showVoicemail(
	input: Parameters<typeof createPhoneCommands>[0],
): Promise<void> {
	const slot = firstUnreadVoicemail(input.mailboxBis.mailbox?.slots ?? []);
	if (!slot) {
		input.setLocalError("当前没有新的留言");
		return;
	}
	const roleName = roleNameForVoicemail(slot, input.roles);
	const message = slot.textPreview || "这条留言没有文本预览";
	const confirmed = window.confirm(
		`角色：${roleName}\n\n留言信息：${message}`,
	);
	if (!confirmed) return;
	await input.mailboxBis.onListen(slot);
}

async function startSimulateCallNow(
	input: Parameters<typeof createPhoneCommands>[0],
	chapterId: string,
	cardId: string,
): Promise<void> {
	const session = await input.callBis.startSimulateCall(chapterId, cardId);
	if (!session) input.setPhoneUi(readyPhoneUi("speaker"));
}

async function startSimulateChapterNow(
	input: Parameters<typeof createPhoneCommands>[0],
	chapterId: string,
): Promise<void> {
	const session = await input.callBis.startSimulateChapterCall(chapterId);
	if (!session) input.setPhoneUi(readyPhoneUi("speaker"));
}

export function useDebuggerPrototypeSession(
	roles: readonly RoleRow[],
	mailboxBis: DebuggerMailboxSessionBis,
): DebuggerPrototypeSession {
	const callBis = useDebuggerCallSessionBis();
	const [phoneUi, setPhoneUi] = useState<PhoneUiState>(lockedPhoneUi);
	const [draft, setDraft] = useState("");
	const [localError, setLocalError] = useState<string | undefined>();
	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const dialingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	function clearPhoneTimers(): void {
		clearTimerRefs(debounceTimerRef, dialingTimerRef);
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
		setPhoneUi,
		setDraft,
		setLocalError,
		debounceTimerRef,
		dialingTimerRef,
	});

	useEffect(function () {
		return clearPhoneTimers;
	}, []);

	useEffect(function () {
		if (!activeRemoteHangupEventId) return;
		clearPhoneTimers();
		setDraft("");
		setLocalError(undefined);
		setPhoneUi(function (previous) {
			if (
				previous.phase === "locked" &&
				previous.receiverMode === null &&
				previous.dialed === ""
			) {
				return previous;
			}
			return lockedPhoneUi();
		});
	}, [activeRemoteHangupEventId]);

	const hasUnreadVoicemail = mailboxBis.mailbox?.hasUnread === true;

	return {
		callState,
		phoneUi,
		draft,
		busy: callBis.busy || mailboxBis.busy,
		error: localError ?? callBis.error ?? mailboxBis.error ?? undefined,
		hasUnreadVoicemail,
		setDraft,
		resetDebugger: commands.resetDebugger,
		liftReceiver: commands.liftReceiver,
		pressDialKey: commands.pressDialKey,
		redial: commands.redial,
		sendDraft: commands.sendDraft,
		startSimulateCall: commands.startSimulateCall,
		startSimulateChapterCall: commands.startSimulateChapterCall,
	};
}
