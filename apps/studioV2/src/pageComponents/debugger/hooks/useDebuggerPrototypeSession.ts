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
import { fetchDebuggerMemoryTrace } from "@studio-v2/src/utils/ajaxProxy/debugger/api/callSessionApi";
import type { DebuggerMailboxSessionBis } from "@studio-v2/src/bis/pageBis/debugger/mailboxSession.bis";
import type {
	DebuggerCallEndView,
	DebuggerMemoryCommitTraceDetailView,
	DebuggerPostCallJobView,
} from "@studio-v2/typeFiles/debugger/callSession";
import type { DebuggerVoicemailSlotView } from "@studio-v2/typeFiles/debugger/mailboxView";

type TimeoutRef = MutableRefObject<ReturnType<typeof setTimeout> | null>;
type PhoneSetter = Dispatch<SetStateAction<PhoneUiState>>;

export type HangupToastState = {
	/** 用于让同文案 toast 也能重新弹出 */
	id: number;
	/** toast 展示文案 */
	message: string;
} | null;

export type LastMemoryTraceState = {
	/** DTO id；用于面板标题与 trace 定位 */
	dtoId: string;
	/** 已读取并裁剪的 trace 详情 */
	detail: DebuggerMemoryCommitTraceDetailView;
} | null;

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
	/** 挂机后副作用 job 列表 */
	postCallJobs: DebuggerPostCallJobView[];
	/** job 列表轮询中 */
	postCallJobsLoading: boolean;
	/** job 列表失败人话 */
	postCallJobsError: string | undefined;
	/** 重试 failed_retryable job */
	retryPostCallJob: (jobId: string) => void;
	/** 正在重试的 jobId */
	postCallRetryingJobId: string | null;
	/** 挂断反馈 toast */
	hangupToast: HangupToastState;
	/** 最近一次挂机 Memory Trace 详情；待机态供右侧面板回看 */
	lastMemoryTrace: LastMemoryTraceState;
	/** 更新玩家输入草稿 */
	setDraft: (value: string) => void;
	/** 关闭挂断 toast */
	dismissHangupToast: () => void;
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

function formatEndResultLines(end: DebuggerCallEndView): string[] {
	const lines = [`Host endCall 完成：status=${end.status}`];
	if (end.planStatus) lines.push(`Effect plan：${end.planStatus}`);
	if (end.selectedExitId) lines.push(`命中出口：${end.selectedExitId}`);
	if (end.postCallJobId) lines.push(`PostCallJob：${end.postCallJobId}`);
	if (end.freeCommitted !== null) {
		lines.push(
			`Free MemoryCommit：${
				end.freeCommitted
					? "已提交"
					: end.memoryTrace?.skippedReason === "background_pending"
						? "后台进行中"
						: "未提交"
			}`,
		);
	}
	if (end.memoryTrace) {
		lines.push(
			`Memory Trace：${end.memoryTrace.policy} · ${
				end.memoryTrace.committed
					? "committed"
					: end.memoryTrace.skippedReason === "background_pending"
						? "pending"
						: "skipped"
			} · entries=${end.memoryTrace.entryIds.length} · dto=${end.memoryTrace.dtoId}`,
		);
		if (
			end.memoryTrace.skippedReason &&
			end.memoryTrace.skippedReason !== "background_pending"
		) {
			lines.push(`Memory skipped：${end.memoryTrace.skippedReason}`);
		}
		if (end.memoryTrace.error) {
			lines.push(`Memory error：${end.memoryTrace.error}`);
		}
	}
	return lines;
}

function formatMemoryTraceLines(
	trace: DebuggerMemoryCommitTraceDetailView,
): string[] {
	const lines = [
		`Memory Trace DTO：${trace.dtoId} · ok=${trace.ok} · layers=${trace.writtenLayers.join(",") || "none"}`,
		`Memory counts：raw=${JSON.stringify(trace.rawCounts)} sanitized=${JSON.stringify(trace.sanitizedCounts)} filtered=${JSON.stringify(trace.filteredCounts)}`,
		`Memory exclusionSeeds：${trace.exclusionSeedCount}`,
	];
	if (trace.summaryText) lines.push(`Memory summary：${trace.summaryText}`);
	if (trace.structured.userFacts.length > 0) {
		lines.push(`Memory userFacts：${trace.structured.userFacts.join(" / ")}`);
	}
	if (trace.structured.sharedEvents.length > 0) {
		lines.push(`Memory sharedEvents：${trace.structured.sharedEvents.join(" / ")}`);
	}
	if (trace.structured.promises.length > 0) {
		lines.push(`Memory promises：${trace.structured.promises.join(" / ")}`);
	}
	if (trace.structured.emotion) lines.push(`Memory emotion：${trace.structured.emotion}`);
	if (trace.structured.attitude) {
		lines.push(
			`Memory attitude：${trace.structured.attitude.stance} · ${trace.structured.attitude.summary}`,
		);
	}
	for (const block of trace.blocks.slice(0, 3)) {
		const preview = block.text.replace(/\s+/g, " ").slice(0, 260);
		lines.push(
			`Memory block：${block.title} · chars=${block.charCount}${block.truncated ? " · truncated" : ""}`,
		);
		if (preview) lines.push(`Memory ${block.title} preview：${preview}`);
	}
	return lines;
}

async function appendMemoryTraceDetail(
	end: DebuggerCallEndView,
	appendLine: (line: string, detail?: unknown) => void,
): Promise<DebuggerMemoryCommitTraceDetailView | null> {
	if (!end.memoryTrace) return null;
	appendLine("正在读取 Memory Trace DTO...");
	try {
		const trace = await fetchDebuggerMemoryTrace(end.memoryTrace.dtoId);
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
	/** 展示挂断 toast */
	showHangupToast: (message: string) => void;
	/** 记录最近一次 Memory Trace 详情，供待机态回看 */
	setLastMemoryTrace: (value: LastMemoryTraceState) => void;
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
	const sessionId =
		input.callState.mode === "inCall" ? input.callState.session.sessionId : null;
	input.clearPhoneTimers();
	input.setLocalError(undefined);
	input.setDraft("");
	input.setPhoneUi(lockedPhoneUi());
	if (!sessionId) {
		input.callBis.resetCall();
		return;
	}
	input.showHangupToast("您已挂断");
	console.info("[StudioV2][post-call]", "用户主动挂断，已返回拨号界面；副作用由 tip 跟踪");
	const end = await input.callBis.endCall({ sessionId, hangupEarly: false });
	if (end) {
		for (const line of formatEndResultLines(end)) {
			console.info("[StudioV2][post-call]", line, end);
		}
		input.callBis.refreshPostCallJobs();
		// 仅在同步已写出 memory 时立刻拉 DTO；后台 pending 等 tip 完成后再看
		if (end.memoryTrace?.committed) {
			const trace = await appendMemoryTraceDetail(end, function (line, detail) {
				console.info("[StudioV2][post-call]", line, detail);
			});
			if (trace && end.memoryTrace) {
				input.setLastMemoryTrace({ dtoId: end.memoryTrace.dtoId, detail: trace });
			}
		}
	} else {
		console.info("[StudioV2][post-call]", "挂机请求失败，请查看控制台或接口错误");
	}
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
		console.info(
			"[StudioV2][post-call]",
			"对方已挂断，已返回拨号界面；副作用由 tip 跟踪",
		);
		void (async function () {
			const end = await callBis.endCall({ sessionId, hangupEarly: false });
			if (end) {
				for (const line of formatEndResultLines(end)) {
					console.info("[StudioV2][post-call]", line, end);
				}
				callBis.refreshPostCallJobs();
				if (end.memoryTrace?.committed) {
					const trace = await appendMemoryTraceDetail(end, function (line, detail) {
						console.info("[StudioV2][post-call]", line, detail);
					});
					if (trace && end.memoryTrace) {
						setLastMemoryTrace({
							dtoId: end.memoryTrace.dtoId,
							detail: trace,
						});
					}
				}
			} else {
				console.info(
					"[StudioV2][post-call]",
					"挂机请求失败，请查看控制台或接口错误",
				);
			}
		})();
	}, [activeRemoteHangupEventId, callState, callBis]);

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
	};
}
