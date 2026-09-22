/**
	* 调试器电话硬件命令：拨号、留言、挂机收尾。
	*/
import {
	type PhoneUiState,
	type ReceiverMode,
} from "@studio-v2/src/pageComponents/debugger/debuggerUiModel";
import {
	canAcceptDialKey,
	dialRoleByNumber,
	firstDialableNumber,
	hasRemoteHangup,
	readyPhoneUi,
} from "../prototypeSessionHelpers";
import type { PhoneCommandsInput } from "./phoneCommandsInput";
import {
	resetPhoneAfterEnd,
	startFreeCallFromChip,
} from "./phoneHangupCommands";
import {
	showVoicemail,
	startChapterEntryRingNow,
	startSimulateCallNow,
	startSimulateChapterNow,
} from "./phoneSimulateCommands";

export function createPhoneCommands(input: PhoneCommandsInput) {
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
			handlePressDialKey(input, key, startDialing);
		},
		redial(): void {
			handleRedial(input, startDialing);
		},
		dialFreeCall(agentId: string): void {
			startFreeCallFromChip(input, agentId);
		},
		sendDraft(): void {
			handleSendDraft(input);
		},
		startSimulateCall(chapterId: string, cardId: string): void {
			input.clearPhoneTimers();
			input.setLocalError(undefined);
			input.setPhoneUi({
				phase: "dialing",
				receiverMode: "speaker",
				dialed: "",
			});
			void startSimulateCallNow(input, chapterId, cardId);
		},
		startSimulateChapterCall(chapterId: string): void {
			input.clearPhoneTimers();
			input.setLocalError(undefined);
			input.setPhoneUi({
				phase: "dialing",
				receiverMode: "speaker",
				dialed: "",
			});
			void startSimulateChapterNow(input, chapterId);
		},
		async startChapterEntryRing(chapterId: string): Promise<boolean> {
			input.clearPhoneTimers();
			input.setLocalError(undefined);
			input.setPhoneUi(readyPhoneUi("speaker"));
			return startChapterEntryRingNow(input, chapterId);
		},
	};
}

function handlePressDialKey(
	input: PhoneCommandsInput,
	key: string,
	startDialing: (dialed: string) => void,
): void {
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
	input.setPhoneUi((previous: PhoneUiState) => ({
		...previous,
		phase: "debouncing",
		dialed: `${previous.dialed}${key}`,
	}));
	input.debounceTimerRef.current = setTimeout(function () {
		startDialing(nextDialed);
	}, 2000);
}

function handleRedial(
	input: PhoneCommandsInput,
	startDialing: (dialed: string) => void,
): void {
	if (input.phoneUi.phase !== "ready") return;
	const nextDialed = input.phoneUi.dialed || firstDialableNumber(input.roles);
	if (!nextDialed) {
		input.setLocalError("当前没有可拨的 free card 角色");
		return;
	}
	input.setPhoneUi((previous) => ({ ...previous, dialed: nextDialed }));
	startDialing(nextDialed);
}

function handleSendDraft(input: PhoneCommandsInput): void {
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
}
