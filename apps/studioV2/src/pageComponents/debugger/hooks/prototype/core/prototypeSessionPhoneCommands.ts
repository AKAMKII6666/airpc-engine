/**
	* 调试器电话硬件命令：拨号、留言、挂机收尾。
	*/
import {
	firstUnreadVoicemail,
	findRoleByAgentId,
	type CallState,
	type PhoneUiState,
	type ReceiverMode,
	type RoleRow,
} from "@studio-v2/src/pageComponents/debugger/debuggerUiModel";
import type { DebuggerCallSessionBis } from "@studio-v2/src/bis/pageBis/debugger/callSession.bis";
import type { DebuggerMailboxSessionBis } from "@studio-v2/src/bis/pageBis/debugger/mailboxSession.bis";
import type { DebuggerVoicemailSlotView } from "@studio-v2/typeFiles/debugger/mailboxView";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import {
	appendMemoryTraceDetail,
	canAcceptDialKey,
	dialRoleByNumber,
	firstDialableNumber,
	formatEndResultLines,
	hasRemoteHangup,
	lockedPhoneUi,
	readyPhoneUi,
} from "./prototypeSessionHelpers";
import type { LastMemoryTraceState } from "./prototypeSessionTypes";

type TimeoutRef = MutableRefObject<ReturnType<typeof setTimeout> | null>;
type PhoneSetter = Dispatch<SetStateAction<PhoneUiState>>;

export function createPhoneCommands(input: {
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
		async startChapterEntryRing(chapterId: string): Promise<boolean> {
			input.clearPhoneTimers();
			input.setLocalError(undefined);
			// 来电路径保持待机；勿进入「拨号中」
			input.setPhoneUi(readyPhoneUi("speaker"));
			return startChapterEntryRingNow(input, chapterId);
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
	// 本地无 session 时仍按 userId 收口 Host 孤儿通话（离页只清 store 的典型残留）
	if (!sessionId) {
		const cleared = await input.callBis.endCall({
			userId: input.callBis.userId,
			hangupEarly: true,
		});
		if (!cleared) {
			input.callBis.resetCall();
		}
		return;
	}
	input.showHangupToast("您已挂断");
	console.warn("[StudioV2][post-call]", "用户主动挂断，已返回拨号界面；副作用由 tip 跟踪");
	const end = await input.callBis.endCall({ sessionId, hangupEarly: false });
	if (end) {
		for (const line of formatEndResultLines(end)) {
			console.warn("[StudioV2][post-call]", line, end);
		}
		input.callBis.refreshPostCallJobs();
		// 仅在同步已写出 memory 时立刻拉 DTO；后台 pending 等 tip 完成后再看
		if (end.memoryTrace?.committed) {
			const trace = await appendMemoryTraceDetail(
				end,
				input.callBis.fetchMemoryTrace,
				function (line, detail) {
					console.warn("[StudioV2][post-call]", line, detail);
				},
			);
			if (trace && end.memoryTrace) {
				input.setLastMemoryTrace({ dtoId: end.memoryTrace.dtoId, detail: trace });
			}
		}
	} else {
		console.warn("[StudioV2][post-call]", "挂机请求失败，请查看控制台或接口错误");
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

async function startChapterEntryRingNow(
	input: Parameters<typeof createPhoneCommands>[0],
	chapterId: string,
): Promise<boolean> {
	const ring = await input.callBis.startChapterEntryRing(chapterId);
	if (!ring) {
		input.setPhoneUi(readyPhoneUi("speaker"));
		return false;
	}
	if (ring.mode === "simulate_start") {
		// bis 已 beginCall；通话态由 activeCall 投影，勿再拨号遮罩
		return false;
	}
	input.setPhoneUi(readyPhoneUi("speaker"));
	return true;
}

