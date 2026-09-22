/**
	* 留言 / 模拟通话 / 章入口振铃。
	*/
import {
	firstUnreadVoicemail,
	findRoleByAgentId,
	type RoleRow,
} from "@studio-v2/src/pageComponents/debugger/debuggerUiModel";
import type { DebuggerVoicemailSlotView } from "@studio-v2/typeFiles/debugger/mailbox/mailboxView";
import { readyPhoneUi } from "../prototypeSessionHelpers";
import type { PhoneCommandsInput } from "./phoneCommandsInput";

function roleNameForVoicemail(
	slot: DebuggerVoicemailSlotView,
	roles: readonly RoleRow[],
): string {
	return findRoleByAgentId(slot.agentId, roles).name;
}

export async function showVoicemail(
	input: PhoneCommandsInput,
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

export async function startSimulateCallNow(
	input: PhoneCommandsInput,
	chapterId: string,
	cardId: string,
): Promise<void> {
	const session = await input.callBis.startSimulateCall(chapterId, cardId);
	if (!session) input.setPhoneUi(readyPhoneUi("speaker"));
}

export async function startSimulateChapterNow(
	input: PhoneCommandsInput,
	chapterId: string,
): Promise<void> {
	const session = await input.callBis.startSimulateChapterCall(chapterId);
	if (!session) input.setPhoneUi(readyPhoneUi("speaker"));
}

export async function startChapterEntryRingNow(
	input: PhoneCommandsInput,
	chapterId: string,
): Promise<boolean> {
	const ring = await input.callBis.startChapterEntryRing(chapterId);
	if (!ring) {
		input.setPhoneUi(readyPhoneUi("speaker"));
		return false;
	}
	if (ring.mode === "simulate_start") {
		return false;
	}
	if (ring.mode === "already_active" || ring.mode === "blocked") return false;
	input.setPhoneUi(readyPhoneUi("speaker"));
	return true;
}
