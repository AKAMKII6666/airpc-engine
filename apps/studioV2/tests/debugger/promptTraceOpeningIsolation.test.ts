/**
	* Prompt Trace：用户开口前按 opening llmContextPolicy 过滤 memory/inertia。
	*/
import { describe, expect, it } from "vitest";
import type { CallSession } from "@airpc/rpg-engine";
import { projectPromptTrace } from "@studio-v2/src/utils/server/debugger/session/projectors/promptTraceProject.server";

function sessionFixture(): CallSession {
	return {
		schemaVersion: 1,
		sessionId: "session_trace_1",
		userId: "demo-user",
		chapterId: "__free__",
		status: "in_call",
		startedAt: "2026-09-10T00:00:00.000Z",
		resolve: {
			source: "free",
			instanceId: "free_bai",
			cardId: "bai_bansian_free",
			agentId: "bai-bansian",
			intent: { kind: "free_call", agentId: "bai-bansian" },
		},
		frozenCard: {
			cardId: "bai_bansian_free",
			cardKind: "free",
			title: "白半仙·自由通话",
			ownerAgentId: "bai-bansian",
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
				isoWithOffset: "2026-09-10T09:00:00+08:00",
				timeZone: "Asia/Shanghai",
				localHour: 9,
			},
			timeMentionPolicy: "allow_casual",
		},
		renderedPrompt: {
			systemHard: [
				"[opening.situation]\n- kind=afternoon_inbound",
				"[conversation.inertia]\n- 这不是完全重启的一通",
			],
			openingSpeakable: "喂？请问哪位？",
			speakable: "可说",
			private: "私有",
			softContext: [
				"[memory]\n用户旧记忆",
				"[conversation.inertia.recent_turns]\nassistant: 喂？",
				"[location]\n北京市",
			],
			matchedLayerIds: [],
		},
		openingFirstTurn: {
			status: "emitted",
			mode: "direct_opening",
			reason: "free inbound",
			callerVisibility: "unknown",
			allowMemoryBeforeUserSpeaks: false,
			allowInertiaBeforeUserSpeaks: false,
			allowNameBeforeIdentified: false,
			forbidden: [],
			source: "rendered_prompt",
			llmContextPolicy: {
				includeSystemHard: true,
				includeSpeakable: true,
				includePrivate: true,
				includeSoftContext: false,
				includeMemory: false,
				includeInertia: false,
				reason: "opening isolation",
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
		chatTurns: [
			{ role: "assistant", text: "喂？请问哪位？", at: "now" },
		],
	} as CallSession;
}

describe("projectPromptTrace opening isolation", () => {
	it("hides memory/inertia soft and hard before user speaks", () => {
		const view = projectPromptTrace(sessionFixture());
		const soft = view.softContextBlocks.map((b) => b.text).join("\n");
		const hard = view.systemHardBlocks.map((b) => b.text).join("\n");
		expect(soft).not.toContain("[memory]");
		expect(soft).not.toContain("conversation.inertia");
		expect(soft).not.toContain("北京市");
		expect(hard).toContain("opening.situation");
		expect(hard).not.toContain("conversation.inertia");
	});

	it("restores full softContext after user speaks", () => {
		const session = sessionFixture();
		session.chatTurns = [
			{ role: "assistant", text: "喂？请问哪位？", at: "now" },
			{ role: "user", text: "是我。", at: "now" },
		];
		const view = projectPromptTrace(session);
		const soft = view.softContextBlocks.map((b) => b.text).join("\n");
		expect(soft).toContain("[memory]");
		expect(soft).toContain("conversation.inertia");
		expect(soft).toContain("[location]");
	});
});
