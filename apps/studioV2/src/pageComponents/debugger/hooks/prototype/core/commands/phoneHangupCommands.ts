/**
	* 挂机收尾与 free chip 拨号。
	*/
import { readyPhoneUi, lockedPhoneUi } from "../prototypeSessionHelpers";
import {
	appendMemoryTraceDetail,
	formatEndResultLines,
} from "../prototypeSessionHelpers";
import type { PhoneCommandsInput } from "./phoneCommandsInput";

export function startFreeCallFromChip(
	input: PhoneCommandsInput,
	agentId: string,
): void {
	if (input.callState.mode === "inCall" || input.callBis.busy) return;
	const role = input.roles.find((row) => row.agentId === agentId);
	if (!role) {
		input.setLocalError(`未找到角色：${agentId}`);
		return;
	}
	if (!role.canFreeCall) {
		input.setLocalError(
			`${role.name} 当前不可拨：${role.blockedReason ?? "未知原因"}`,
		);
		return;
	}
	input.clearPhoneTimers();
	input.setLocalError(undefined);
	const receiverMode = input.phoneUi.receiverMode ?? "handset";
	input.setPhoneUi({
		phase: "dialing",
		receiverMode,
		dialed: role.number,
	});
	void input.callBis.startFreeCall(role.agentId).then(function (session) {
		if (!session) input.setPhoneUi(readyPhoneUi(receiverMode));
	});
}

export async function resetPhoneAfterEnd(
	input: PhoneCommandsInput,
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
	console.warn(
		"[StudioV2][post-call]",
		"用户主动挂断，已返回拨号界面；副作用由 tip 跟踪",
	);
	const end = await input.callBis.endCall({ sessionId, hangupEarly: false });
	if (!end) {
		console.warn(
			"[StudioV2][post-call]",
			"挂机请求失败，请查看控制台或接口错误",
		);
		return;
	}
	for (const line of formatEndResultLines(end)) {
		console.warn("[StudioV2][post-call]", line, end);
	}
	input.callBis.refreshPostCallJobs();
	if (!end.memoryTrace?.committed) return;
	const trace = await appendMemoryTraceDetail(
		end,
		input.callBis.fetchMemoryTrace,
		function (line, detail) {
			console.warn("[StudioV2][post-call]", line, detail);
		},
	);
	if (trace && end.memoryTrace) {
		input.setLastMemoryTrace({
			dtoId: end.memoryTrace.dtoId,
			detail: trace,
		});
	}
}
