/**
	* 调试器 LLM messages 投影：确保 Host prompt 与文本轮次进入模型上下文。
	*/
import { describe, expect, it } from "vitest";
import type { CallSession } from "@airpc/rpg-engine";
import {
	buildOpeningLlmMessages,
	buildTurnLlmMessages,
} from "@studio-v2/src/utils/server/debugger/session/debuggerLlmMessages.server";

type CallSessionWithOpeningFirstTurn = CallSession & {
	openingFirstTurn?: {
		status: "pending" | "emitted" | "skipped";
		mode: "direct_opening" | "llm_opening" | "none";
		reason: string;
		callerVisibility: "unknown" | "known_or_intended" | "card_controlled" | "unknown_state";
		allowMemoryBeforeUserSpeaks: boolean;
		allowInertiaBeforeUserSpeaks: boolean;
		allowNameBeforeIdentified: boolean;
		forbidden: string[];
		source: "rendered_prompt" | "none";
		llmContextPolicy: {
			includeSystemHard: boolean;
			includeSpeakable: boolean;
			includePrivate: boolean;
			includeSoftContext: boolean;
			includeMemory: boolean;
			includeInertia: boolean;
			reason: string;
		};
	};
};

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
				isoWithOffset: "2026-08-10T08:00:00+08:00",
				timeZone: "Asia/Shanghai",
				localHour: 8,
			},
			timeMentionPolicy: "allow_casual",
		},
		renderedPrompt: {
			systemHard: ["硬规则"],
			openingSpeakable: "喂？你找我吗？",
			openingPolicy: {
				mode: "phone_short",
				reason: "短电话首句",
				maxSentences: 2,
				forbidden: ["小作文式环境描写", "预设已经听到用户声音"],
			},
			speakable: "可说内容",
			private: "私有目标",
			softContext: ["记忆摘要"],
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
		chatTurns: [
			{ role: "assistant", text: "喂？你找我吗？", at: "now" },
			{ role: "user", text: "是我。", at: "now" },
		],
	};
}

describe("debuggerLlmMessages.server", () => {
	it("builds opening messages with Composer prompt and user opening instruction", () => {
		const messages = buildOpeningLlmMessages(sessionFixture());
		expect(messages.map(function (message) {
			return message.role;
		})).toEqual(["system", "system", "system", "system", "system", "user"]);
		expect(messages.at(-2)?.content).toContain("[phone-shell-controls]");
		expect(messages.at(-2)?.content).toContain("拜拜");
		expect(messages.at(-2)?.content).toContain("不要重复调用业务工具");
		expect(messages.at(-1)?.content).toContain("喂？你找我吗？");
		expect(messages.at(-1)?.content).toContain("不要把开场扩写成完整段落");
		expect(messages.at(-1)?.content).toContain("小作文式环境描写");
	});

	it("opening instruction keeps reminder topic out of the first sentence", () => {
		const session = sessionFixture();
		session.beginContext = {
			source: "schedule_reminder",
			actualEntry: "outbound_auto",
			scheduledIntentId: "reminder_1",
			topicHint: "提醒睡午觉",
		};
		session.renderedPrompt!.systemHard.push(
			[
				"[scheduled.callback]",
				"- 回电话题：提醒睡午觉",
				"- 首句只做接通/自报；从第二句或后续自然带出这个回电话题。",
			].join("\n"),
		);
		const messages = buildOpeningLlmMessages(session);
		expect(messages.some(function (message) {
			return message.role === "system" && message.content.includes("提醒睡午觉");
		})).toBe(true);
		expect(messages.at(-1)?.content).not.toContain("提醒睡午觉");
		expect(messages.at(-1)?.content).toContain("不要把开场扩写成完整段落");
	});

	it("sanitizes opening LLM context according to engine first-turn policy", () => {
		const session = sessionFixture() as CallSessionWithOpeningFirstTurn;
		session.openingFirstTurn = {
			status: "pending",
			mode: "llm_opening",
			reason: "sanitized opening test",
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
				reason: "opening first turn isolation",
			},
		};
		session.renderedPrompt!.softContext = [
			"[memory]\n用户自称棍子哥哥",
			"[conversation.inertia.recent_turns]\nassistant: 喂，棍子哥哥～",
			"[scheduled.callback]\n回电话题：提醒睡午觉",
		];

		const messages = buildOpeningLlmMessages(session);
		const text = messages.map((message) => message.content).join("\n\n");

		expect(text).toContain("硬规则");
		expect(text).toContain("可说内容");
		expect(text).toContain("私有目标");
		expect(text).not.toContain("棍子哥哥");
		expect(text).not.toContain("conversation.inertia");
		expect(text).not.toContain("提醒睡午觉");
	});

	it("builds turn messages from prompt plus recorded Host chatTurns", () => {
		const messages = buildTurnLlmMessages(sessionFixture());
		expect(messages.map(function (message) {
			return message.content;
		})).toEqual([
			"硬规则",
			"可说内容",
			"私有目标",
			"记忆摘要",
			expect.stringContaining("[phone-shell-controls]"),
			"喂？你找我吗？",
			"是我。",
		]);
	});
});
