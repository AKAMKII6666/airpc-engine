/**
	* 调试器开场闭环：Studio 只消费 engine first-turn 控制，不自行补话术。
	*/
import { describe, expect, it } from "vitest";
import type { CallSession, EngineHost } from "@airpc/rpg-engine";
import { startDebuggerCallSession } from "@studio-v2/src/utils/server/debugger/session/debuggerCallSession.server";

function inboundFreeSession(): CallSession {
	return {
		schemaVersion: 1,
		sessionId: "session_free_direct",
		userId: "demo-user",
		chapterId: "__free__",
		status: "in_call",
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
			systemHard: [
				"[opening.situation]\n- kind=inbound_unknown_caller\n- control=direct_opening\n- priority=100\n- reason=玩家主动拨入，角色尚不知道是谁\n- tags=free,inbound,unknown_caller\n- firstTurnMode=direct",
			],
			openingSpeakable: "喂，请问哪位？",
			speakable: "",
			private: "",
			softContext: ["[memory]\n用户叫棍子哥哥"],
			matchedLayerIds: ["free_inbound_unknown"],
			debug: { providerIds: ["opening.situation"], notes: [] },
			openingFirstTurn: {
				mode: "direct",
				status: "pending",
				text: "喂，请问哪位？",
				callerVisibility: "unknown",
				allowMemoryBeforeUserSpeaks: false,
				allowInertiaBeforeUserSpeaks: false,
				allowNameBeforeIdentified: false,
				forbidden: ["直呼玩家姓名"],
				llmContextPolicy: {
					includeSystemHard: true,
					includeSpeakable: true,
					includePrivate: true,
					includeSoftContext: false,
					includeMemory: false,
					includeInertia: false,
				},
			},
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
	} as CallSession;
}

describe("startDebuggerCallSession opening first turn", () => {
	it("uses engine direct opening for inbound free call without recording another assistant turn", async () => {
		const steps: string[] = [];
		const session = inboundFreeSession();
		const withOpening = {
			...session,
			chatTurns: [{
				role: "assistant",
				text: "喂，请问哪位？",
				at: "2026-08-10T00:00:02.000Z",
			}],
			openingFirstTurn: {
				mode: "direct",
				status: "emitted",
				text: "喂，请问哪位？",
			},
		} as unknown as CallSession;
		const host = {
			async ensureProfile() {
				steps.push("ensure_profile");
				return {};
			},
			async resolveAsync() {
				steps.push("resolve");
				return session.resolve;
			},
			async beginCall() {
				steps.push("begin");
				return session;
			},
			consumeOpeningFirstTurn() {
				steps.push("consume_opening");
				return {
					ok: true,
					action: "emit_assistant_turn",
					text: "喂，请问哪位？",
					session: withOpening,
					source: "opening_first_turn_gate",
				};
			},
			recordChatTurn() {
				throw new Error("recordChatTurn should not run for direct opening");
			},
		} as unknown as EngineHost;

		const view = await startDebuggerCallSession(
			{ mode: "free_call", userId: "demo-user", agentId: "lanxing" },
			host,
		);

		expect(steps).toEqual([
			"ensure_profile",
			"resolve",
			"begin",
			"consume_opening",
		]);
		expect(view.llm).toMatchObject({
			model: "opening-first-turn-gate",
			finishReason: "direct_opening",
			text: "喂，请问哪位？",
		});
		expect(view.turns).toEqual([{ role: "assistant", text: "喂，请问哪位？" }]);
		expect(view.promptTrace.openingSituation).toMatchObject({
			firstTurnMode: "direct",
			firstTurnStatus: "pending",
			callerVisibility: "unknown",
		});
		expect(view.promptTrace.openingSituation?.llmContextPolicy).toMatchObject({
			includeSoftContext: false,
			includeMemory: false,
			includeInertia: false,
		});
	});
});
