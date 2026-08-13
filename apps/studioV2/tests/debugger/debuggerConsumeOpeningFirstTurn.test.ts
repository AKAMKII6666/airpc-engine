import { describe, expect, it } from "vitest";
import type { CallSession, EngineHost } from "@airpc/rpg-engine";
import { consumeDebuggerOpeningFirstTurn } from "@studio-v2/src/utils/server/debugger/session/debuggerConsumeOpeningFirstTurn.server";

function sessionFixture(): CallSession {
	return {
		schemaVersion: 1,
		sessionId: "session_1",
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
				isoWithOffset: "2026-08-10T18:00:00+08:00",
				timeZone: "Asia/Shanghai",
				localHour: 18,
			},
			timeMentionPolicy: "allow_casual",
		},
		renderedPrompt: {
			systemHard: ["硬规则"],
			openingSpeakable: "喂？请问哪位？",
			speakable: "可说内容",
			private: "私有目标",
			softContext: [
				"[memory]\n用户自称棍子哥哥",
				"[conversation.inertia.recent_turns]\nassistant: 喂，棍子哥哥～",
			],
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

function hostWithConsume(result: unknown): EngineHost {
	return {
		consumeOpeningFirstTurn() {
			return result;
		},
	} as unknown as EngineHost;
}

describe("debuggerConsumeOpeningFirstTurn.server", () => {
	it("projects engine direct opening result without parsing prompt trace", () => {
		const session = sessionFixture();
		const emitted = {
			ok: true,
			action: "emit_assistant_turn",
			text: "喂？请问哪位？",
			session: {
				...session,
				chatTurns: [{ role: "assistant", text: "喂？请问哪位？", at: "now" }],
			},
			source: "opening_first_turn_gate",
		};

		const result = consumeDebuggerOpeningFirstTurn(hostWithConsume(emitted), session);

		expect(result.mode).toBe("direct");
		if (result.mode !== "direct") throw new Error("expected direct");
		expect(result.llm).toMatchObject({
			text: "喂？请问哪位？",
			toolCalls: [],
			finishReason: "direct_opening",
			model: "opening-first-turn-gate",
		});
		expect(result.llm.text).not.toContain("棍子哥哥");
		expect(result.session.chatTurns).toHaveLength(1);
	});

	it("passes LLM opening action through to the caller", () => {
		const session = sessionFixture();
		const result = consumeDebuggerOpeningFirstTurn(
			hostWithConsume({
				ok: true,
				action: "request_llm_opening",
				session,
				source: "opening_first_turn_gate",
			}),
			session,
		);

		expect(result).toEqual({ mode: "llm", session });
	});
});
