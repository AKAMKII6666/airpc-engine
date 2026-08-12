/**
	* 调试器挂断 facade：确保 UI 挂断会走 Host endCall。
	*/
import { describe, expect, it } from "vitest";
import type { CallSession, EngineHost, EndCallResult } from "@airpc/rpg-engine";
import { endDebuggerCallSession } from "@studio-v2/src/utils/server/debugger/session/debuggerCallSession.server";

function callSessionFixture(): CallSession {
	return {
		schemaVersion: 1,
		sessionId: "session_1",
		userId: "demo-user",
		chapterId: "__free__",
		status: "completed",
		startedAt: "2026-08-10T00:00:00.000Z",
		resolve: {
			source: "free",
			instanceId: "free_lanxing",
			cardId: "lanxing_free",
			agentId: "lanxing",
			intent: { kind: "free_call", agentId: "lanxing" },
		},
		frozenCard: {
			cardId: "lanxing_free",
			cardKind: "free",
			title: "澜星自由通话",
			ownerAgentId: "lanxing",
			entryMode: "either",
			interactionMode: "realtime_dialogue",
			context: {},
			exits: [],
			toolPolicy: { mode: "inherit_free" },
		},
		actualEntry: "inbound_user_dial",
		composeScene: {
			callDirection: "inbound",
			localTime: {
				isoWithOffset: "2026-08-10T08:00:00+08:00",
				timeZone: "Asia/Shanghai",
				localHour: 8,
			},
			timeMentionPolicy: "allow_casual",
		},
		renderedPrompt: {
			systemHard: [],
			openingSpeakable: "",
			speakable: "",
			private: "",
			softContext: [],
			matchedLayerIds: [],
		},
		channel: "text_turn",
		interactionPhase: "dialogue",
		phoneFlags: {},
		completedBeats: [],
		toolTrace: [],
		exitCandidates: [],
		shellEvents: [],
		effectLedger: {},
		chatTurns: [],
	};
}

describe("endDebuggerCallSession", () => {
	it("ends active Host session and projects end result", async () => {
		const calls: unknown[] = [];
		const host = {
			async endCall(sessionId: string, summary: unknown) {
				calls.push([sessionId, summary]);
				return {
					ok: true,
					session: callSessionFixture(),
					selectedExitId: "exit_ok",
					effectPlanResult: { status: "completed", aborted: false, results: [] },
					freePipeline: { committed: true, skippedExit: true, steps: [] },
				} satisfies EndCallResult;
			},
		} as unknown as EngineHost;

		const view = await endDebuggerCallSession(
			{ sessionId: "session_1", hangupEarly: false },
			host,
		);

		expect(calls).toHaveLength(1);
		expect(calls[0]).toEqual([
			"session_1",
			{
				flags: { answered_completed: true },
				completedBeats: [],
				missedRequiredBeats: [],
			},
		]);
		expect(view).toEqual({
			sessionId: "session_1",
			status: "completed",
			selectedExitId: "exit_ok",
			planStatus: "completed",
			freeCommitted: true,
		});
	});
});
