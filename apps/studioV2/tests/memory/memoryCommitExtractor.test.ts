/**
	* LLM 挂机记忆抽取器回归：JSON 解析、Port 装饰与失败降级。
	*/
import { describe, expect, it } from "vitest";
import type {
	MemoryCommitInput,
	MemoryCommitResult,
	MemoryPort,
	MemoryProjection,
	MemorySearchHit,
} from "@airpc/rpg-engine";
import {
	extractMemoryCommitFromTranscript,
	parseMemoryCommitExtraction,
} from "@studio-v2/src/utils/server/memory/memoryCommitExtractor.server";
import { createMemoryCommitExtractingPort } from "@studio-v2/src/utils/server/memory/memoryCommitMemoryPort.server";

function transcript() {
	return {
		schemaVersion: 1 as const,
		source: "host.chat_turns" as const,
		turns: [
			{
				role: "user" as const,
				text: "今天妈妈给我做了生日蛋糕，我特别开心。",
				at: "2026-08-12T01:00:00.000Z",
			},
			{
				role: "assistant" as const,
				text: "我记住了，这是很温柔的一天。",
				at: "2026-08-12T01:00:02.000Z",
			},
		],
	};
}

function baseInput(): MemoryCommitInput {
	return {
		userId: "demo-user",
		agentId: "lanxing",
		sessionId: "session_1",
		transcript: transcript(),
		endedAt: "2026-08-12T01:05:00.000Z",
		summaryText: "fallback transcript summary",
	};
}

function recordingMemoryPort(records: MemoryCommitInput[]): MemoryPort {
	return {
		async projectForCall(): Promise<MemoryProjection> {
			return { softText: "", includedEntryIds: [] };
		},
		async search(): Promise<MemorySearchHit[]> {
			return [];
		},
		async getById(): Promise<MemorySearchHit | null> {
			return null;
		},
		async applyPatch(): Promise<void> {},
		async commitAfterCall(input): Promise<MemoryCommitResult> {
			records.push(input);
			return {
				ok: true,
				writtenLayers: ["episodic"],
				writtenEpisodicIds: ["mem_1"],
			};
		},
	};
}

describe("memory commit LLM extractor", () => {
	it("parses strict JSON and sanitizes vignette list", () => {
		const parsed = parseMemoryCommitExtraction(JSON.stringify({
			summaryText: "聊到用户今天因为妈妈做生日蛋糕而开心。",
			vignettes: ["妈妈做了生日蛋糕", "妈妈做了生日蛋糕", "  ", 123],
		}));

		expect(parsed).toEqual({
			summaryText: "聊到用户今天因为妈妈做生日蛋糕而开心。",
			vignettes: ["妈妈做了生日蛋糕"],
		});
	});

	it("builds LLM messages and parses extraction result", async () => {
		const seen: string[] = [];
		const result = await extractMemoryCommitFromTranscript({
			agentId: "lanxing",
			sessionId: "session_1",
			transcript: transcript(),
			commitContext: {
				callKind: "story",
				policy: "story_call",
				source: "story_pending",
				chapterId: "golden_handoff",
				cardId: "doubao_intro_outbound",
				selectedExitId: "ok",
				planStatus: "completed",
			},
			llmRunner: async function (input) {
				seen.push(input.messages.map(function (message) {
					return message.content;
				}).join("\n"));
				return {
					text: JSON.stringify({
						summaryText: "用户说妈妈做了生日蛋糕，她很开心。",
						vignettes: ["妈妈给用户做了生日蛋糕"],
					}),
					toolCalls: [],
					finishReason: "stop",
					responseId: "extract_1",
					model: "test",
				};
			},
		});

		expect(seen.join("\n")).toContain("只输出 JSON");
		expect(seen.join("\n")).toContain("本通是剧情通话");
		expect(seen.join("\n")).toContain("story_call");
		expect(seen.join("\n")).toContain("生日蛋糕");
		expect(result).toEqual({
			summaryText: "用户说妈妈做了生日蛋糕，她很开心。",
			vignettes: ["妈妈给用户做了生日蛋糕"],
		});
	});

	it("decorates MemoryPort commit with extracted summary and vignettes", async () => {
		const records: MemoryCommitInput[] = [];
		const port = createMemoryCommitExtractingPort(recordingMemoryPort(records), {
			extractor: async function () {
				return {
					summaryText: "LLM 摘要：生日蛋糕让用户很开心。",
					vignettes: ["妈妈给用户做了生日蛋糕"],
				};
			},
		});

		await port.commitAfterCall(baseInput());

		expect(records[0]).toMatchObject({
			summaryText: "LLM 摘要：生日蛋糕让用户很开心。",
			vignettes: ["妈妈给用户做了生日蛋糕"],
		});
	});

	it("falls back to original commit input when extraction fails", async () => {
		const records: MemoryCommitInput[] = [];
		const port = createMemoryCommitExtractingPort(recordingMemoryPort(records), {
			extractor: async function () {
				throw new Error("llm down");
			},
			logErrors: false,
		});

		await port.commitAfterCall(baseInput());

		expect(records[0]).toMatchObject({
			summaryText: "fallback transcript summary",
		});
		expect(records[0]?.vignettes).toBeUndefined();
	});
});
