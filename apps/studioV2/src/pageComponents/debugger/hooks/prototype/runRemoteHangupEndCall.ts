/**
	* 对方挂断后：endCall + Memory Trace 控制台补充。
	*/
import type { DebuggerCallSessionBis } from "@studio-v2/src/bis/pageBis/debugger/callSession/callSession.bis";
import type { DebuggerShellEventView } from "@studio-v2/typeFiles/debugger/callSession/callSession";
import {
	appendMemoryTraceDetail,
	formatEndResultLines,
} from "./core/prototypeSessionHelpers";
import type { LastMemoryTraceState } from "./core/prototypeSessionTypes";

export async function runRemoteHangupEndCall(args: {
	sessionId: string;
	hangupEvent: DebuggerShellEventView | null | undefined;
	callBis: DebuggerCallSessionBis;
	setLastMemoryTrace: (value: LastMemoryTraceState) => void;
}): Promise<void> {
	const { sessionId, hangupEvent, callBis, setLastMemoryTrace } = args;
	const end = await callBis.endCall({
		sessionId,
		hangupEarly: false,
		termination: {
			source: "npc",
			...(hangupEvent?.reasonKind
				? { reasonKind: hangupEvent.reasonKind }
				: {}),
			...(hangupEvent?.reason ? { reason: hangupEvent.reason } : {}),
		},
	});
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
	callBis.refreshPostCallJobs();
	if (!end.memoryTrace?.committed) return;
	const trace = await appendMemoryTraceDetail(
		end,
		callBis.fetchMemoryTrace,
		function (line, detail) {
			console.warn("[StudioV2][post-call]", line, detail);
		},
	);
	if (trace && end.memoryTrace) {
		setLastMemoryTrace({
			dtoId: end.memoryTrace.dtoId,
			detail: trace,
		});
	}
}
