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
	extractFactCandidatesFromProjection,
	parseMemoryCommitExtraction,
	renderMemoryExtractionFromFacts,
	sanitizeMemoryCommitExtractionForFacts,
	verifyNormalizedFacts,
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

function pollutedTranscript() {
	return {
		schemaVersion: 1 as const,
		source: "host.chat_turns" as const,
		turns: [
			{
				role: "user" as const,
				text: "我叫廖力，1989年11月13日10点半出生。我在做澜星电话项目。",
				at: "2026-08-14T06:40:00.000Z",
			},
			{
				role: "assistant" as const,
				text: "廖力这个名字像块没打磨的玉石，电话线刚才微微震了一下。",
				at: "2026-08-14T06:40:02.000Z",
			},
			{
				role: "assistant" as const,
				text: "刚过午时，阳气往上走，你不急不抢，等光落定才迈步。",
				at: "2026-08-14T06:40:04.000Z",
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
						facts: [
							{
								candidateId: "fact_1",
								type: "life_event",
								text: "用户说妈妈做了生日蛋糕，她很开心。",
								evidenceTurnIndexes: [0],
							},
						],
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
		expect(seen.join("\n")).toContain("candidates:");
		expect(seen.join("\n")).toContain("生日蛋糕");
		expect(seen.join("\n")).not.toContain("我记住了，这是很温柔的一天。");
		expect(result).toEqual({
			summaryText: "用户提到：今天妈妈给我做了生日蛋糕，我特别开心。",
			vignettes: ["用户提到：今天妈妈给我做了生日蛋糕，我特别开心。"],
		});
	});

	it("uses only user turns when building extraction prompts", async () => {
		const seen: string[] = [];
		await extractMemoryCommitFromTranscript({
			agentId: "bai-bansian",
			sessionId: "session_polluted",
			transcript: pollutedTranscript(),
			llmRunner: async function (input) {
				seen.push(input.messages.map(function (message) {
					return message.content;
				}).join("\n"));
				return {
					text: JSON.stringify({
						facts: [
							{
								candidateId: "fact_1",
								type: "user_name",
								text: "用户叫廖力",
								evidenceTurnIndexes: [0],
							},
							{
								candidateId: "fact_2",
								type: "birth_datetime",
								text: "用户出生于1989年11月13日10点半",
								evidenceTurnIndexes: [0],
							},
							{
								candidateId: "fact_3",
								type: "project",
								text: "用户在做澜星电话项目",
								evidenceTurnIndexes: [0],
							},
						],
					}),
					toolCalls: [],
					finishReason: "stop",
					responseId: "extract_2",
					model: "test",
				};
			},
		});

		const promptText = seen.join("\n");
		expect(promptText).toContain("candidates:");
		expect(promptText).toContain("我叫廖力");
		expect(promptText).not.toContain("像块没打磨的玉石");
		expect(promptText).not.toContain("电话线刚才微微震了一下");
		expect(promptText).not.toContain("阳气往上走");
	});

	it("verifier ignores LLM additions and renders only program candidates", async () => {
		const result = await extractMemoryCommitFromTranscript({
			agentId: "bai-bansian",
			sessionId: "session_bazi_pollution",
			transcript: {
				schemaVersion: 1,
				source: "host.chat_turns",
				turns: [
					{ role: "user", text: "是我，廖力", at: "2026-08-14T08:15:32.007Z" },
					{ role: "user", text: "我想算命", at: "2026-08-14T08:16:00.675Z" },
					{ role: "user", text: "我叫廖力，是洋历1989年11月13号上午10点30出生的。", at: "2026-08-14T08:17:30.890Z" },
					{ role: "user", text: "我想你帮我算财运", at: "2026-08-14T08:18:36.404Z" },
					{ role: "user", text: "那必然是澜星电话项目啊", at: "2026-08-14T08:19:36.798Z" },
					{ role: "assistant", text: "命盘如岩茶，丁火日主，电话线松了口气。", at: "2026-08-14T08:19:43.311Z" },
				],
			},
			llmRunner: async function () {
				return {
					text: JSON.stringify({
						facts: [
							{
								candidateId: "fact_1",
								type: "user_name",
								text: "廖力这个名字像块没打磨的玉石",
								evidenceTurnIndexes: [0],
							},
							{
								candidateId: "fact_2",
								type: "concern_topic",
								text: "用户命盘如岩茶，丁火日主",
								evidenceTurnIndexes: [1],
							},
							{
								candidateId: "fact_4",
								type: "concern_topic",
								text: "用户关心财运话题",
								evidenceTurnIndexes: [3],
							},
							{
								candidateId: "fact_5",
								type: "project",
								text: "用户为澜星电话项目熬到凌晨两点",
								evidenceTurnIndexes: [4],
							},
						],
					}),
					toolCalls: [],
					finishReason: "stop",
					responseId: "extract_3",
					model: "test",
				};
			},
		});

		expect(result.summaryText).toContain("用户关心财运话题");
		expect(result.summaryText).toContain("用户提到自己在做澜星电话项目");
		expect(result.summaryText).not.toContain("岩茶");
		expect(result.summaryText).not.toContain("丁火");
		expect(result.summaryText).not.toContain("凌晨两点");
		expect(result.vignettes.join("\n")).not.toContain("电话线");
	});

	it("extracts candidates with evidence before LLM normalization", () => {
		const projection = {
			schemaVersion: 1 as const,
			source: "host.chat_turns.user_only" as const,
			droppedTurnCount: 1,
			turns: [
				{
					role: "user" as const,
					text: "我叫廖力，是洋历1989年11月13号上午10点30出生的。",
					at: "2026-08-14T08:17:30.890Z",
					index: 5,
				},
				{
					role: "user" as const,
					text: "那必然是澜星电话项目啊",
					at: "2026-08-14T08:19:36.798Z",
					index: 9,
				},
			],
		};
		const candidates = extractFactCandidatesFromProjection(projection);

		expect(candidates).toEqual(expect.arrayContaining([
			expect.objectContaining({ type: "user_name", value: "廖力", evidenceTurnIndexes: [5] }),
			expect.objectContaining({ type: "birth_datetime", evidenceTurnIndexes: [5] }),
			expect.objectContaining({ type: "project", value: "澜星电话项目", evidenceTurnIndexes: [9] }),
		]));
	});

	it("renders verified facts from candidates, not from LLM phrasing", () => {
		const candidates = extractFactCandidatesFromProjection({
			schemaVersion: 1,
			source: "host.chat_turns.user_only",
			droppedTurnCount: 0,
			turns: [
				{ role: "user", text: "我想你帮我算财运", at: "now", index: 7 },
			],
		});
		const verified = verifyNormalizedFacts(candidates, [
			{
				candidateId: candidates[0]!.id,
				type: "concern_topic",
				text: "用户财运不靠撞运，命盘如岩茶",
				evidenceTurnIndexes: [7],
			},
		]);

		expect(renderMemoryExtractionFromFacts(
			verified.length > 0 ? verified : verifyNormalizedFacts(candidates, candidates.map(function (candidate) {
				return {
					candidateId: candidate.id,
					type: candidate.type,
					text: candidate.text,
					evidenceTurnIndexes: candidate.evidenceTurnIndexes,
				};
			})),
		).summaryText).toBe("用户关心财运话题");
	});

	it("sanitizes NPC phrasing from extracted fact memory", () => {
		const sanitized = sanitizeMemoryCommitExtractionForFacts({
			summaryText: "廖力这个名字被形容为像块没打磨的玉石，电话线微微震了一下。",
			vignettes: [
				"用户在做澜星电话项目",
				"廖力这个名字被形容为像块没打磨的玉石",
				"电话线微微震了一下",
				"刚过午时，阳气往上走",
			],
		}, pollutedTranscript());

		expect(sanitized.summaryText).toContain("我叫廖力");
		expect(sanitized.summaryText).toContain("澜星电话项目");
		expect(sanitized.summaryText).not.toContain("被形容为");
		expect(sanitized.vignettes).toEqual(["用户在做澜星电话项目"]);
	});

	it("decorates MemoryPort commit with extracted summary and vignettes", async () => {
		const records: MemoryCommitInput[] = [];
		let extractorTranscript = "";
		const port = createMemoryCommitExtractingPort(recordingMemoryPort(records), {
			extractor: async function (input) {
				extractorTranscript = input.transcript.turns.map(function (turn) {
					return `${turn.role}: ${turn.text}`;
				}).join("\n");
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
		expect(extractorTranscript).toContain("user: 今天妈妈给我做了生日蛋糕");
		expect(extractorTranscript).not.toContain("assistant:");
	});

	it("decorator falls back to user facts when extractor returns polluted text", async () => {
		const records: MemoryCommitInput[] = [];
		const port = createMemoryCommitExtractingPort(recordingMemoryPort(records), {
			extractor: async function () {
				return {
					summaryText: "廖力这个名字被形容为像块没打磨的玉石。",
					vignettes: ["用户在做澜星电话项目", "电话线微微震了一下"],
				};
			},
		});

		await port.commitAfterCall({
			...baseInput(),
			agentId: "bai-bansian",
			transcript: pollutedTranscript(),
			summaryText: undefined,
		});

		expect(records[0]?.summaryText).toContain("我叫廖力");
		expect(records[0]?.summaryText).not.toContain("被形容为");
		expect(records[0]?.vignettes).toEqual(["用户在做澜星电话项目"]);
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
