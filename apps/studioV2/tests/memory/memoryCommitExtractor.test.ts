/**
 * LLM 挂机记忆抽取器回归：transcript-only 输入、证据校验、统一 items。
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
  extractAttitudeFromTranscript,
  extractMemoryCommitFromTranscript,
  parseMemoryCommitExtraction,
  sanitizeMemoryCommitExtractionForFacts,
  type MemoryCallTranscriptLike,
} from "@studio-v2/src/utils/server/memory/memoryCommitExtractor.server";
import {
	createMemoryCommitExtractingPort,
	createMemoryCommitOrchestrator,
} from "@studio-v2/src/utils/server/memory/memoryCommitMemoryPort.server";

function transcript(): MemoryCallTranscriptLike {
  return {
    schemaVersion: 1,
    source: "host.chat_turns",
    turns: [
      { role: "assistant", text: "喂？请问哪位？", at: "2026-08-12T01:00:00.000Z" },
      { role: "user", text: "我啊，廖力。今天妈妈给我做了生日蛋糕，我特别开心。", at: "2026-08-12T01:00:02.000Z" },
      { role: "assistant", text: "我记住了，这是很温柔的一天。", at: "2026-08-12T01:00:04.000Z" },
      { role: "user", text: "那我们明天见面吧。", at: "2026-08-12T01:00:06.000Z" },
      { role: "assistant", text: "好，明天见。", at: "2026-08-12T01:00:08.000Z" },
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
        writtenEntryIds: ["mem_1"],
        writtenEpisodicIds: ["mem_1"],
      };
    },
  };
}

describe("memory commit LLM extractor", () => {
  it("parses summaryText and evidence items", () => {
    const parsed = parseMemoryCommitExtraction(JSON.stringify({
      summaryText: "用户聊到妈妈做了生日蛋糕。",
      items: [
        { kind: "user_fact", text: "用户喜欢妈妈做的生日蛋糕", evidenceTurnIndexes: [1] },
        { kind: "identity_note", text: "澜星 22 岁", evidenceTurnIndexes: [0] },
      ],
    }));

    expect(parsed.summaryText).toBe("用户聊到妈妈做了生日蛋糕。");
    expect(parsed.items).toEqual([
      { kind: "user_fact", text: "用户喜欢妈妈做的生日蛋糕", evidenceTurnIndexes: [1] },
    ]);
  });

  it("only feeds transcript turns to the LLM, not prompt blocks or seeds", async () => {
    const seen: string[] = [];
    const result = await extractMemoryCommitFromTranscript({
      agentId: "lanxing",
      sessionId: "session_1",
      transcript: transcript(),
      commitContext: {
        callKind: "free",
        policy: "free_post_pipeline",
        source: "free",
        chapterId: "__free__",
        cardId: "lanxing_free",
        exclusionSeeds: ["[identity] 澜星"],
      },
      llmRunner: async function (input) {
        seen.push(input.messages.map((m) => m.content).join("\n"));
        expect(input.enableThinking).toBe(false);
        return {
          text: JSON.stringify({
            summaryText: "用户聊到生日蛋糕。",
            items: [
              { kind: "user_fact", text: "用户喜欢妈妈做的生日蛋糕", evidenceTurnIndexes: [1] },
            ],
          }),
          toolCalls: [],
          finishReason: "stop",
          responseId: "extract_1",
          model: "test",
        };
      },
    });

    const promptText = seen.join("\n");
    expect(promptText).toContain("transcript:");
    expect(promptText).toContain("妈妈给我做了生日蛋糕");
    expect(promptText).toContain('"role":"user"');
    expect(promptText).toContain('"index":1');
    expect(promptText).not.toContain("exclusionSeeds");
    expect(promptText).not.toContain("commitContext");
    expect(promptText).not.toContain("[identity]");
    expect(result.items).toEqual([
      { kind: "user_fact", text: "用户喜欢妈妈做的生日蛋糕", evidenceTurnIndexes: [1] },
    ]);
  });

  it("keeps user evidence, drops assistant-origin facts, and blocks shared_event without user confirmation", async () => {
    const result = await extractMemoryCommitFromTranscript({
      agentId: "lanxing",
      sessionId: "session_1",
      transcript: transcript(),
      llmRunner: async function () {
        return {
          text: JSON.stringify({
            summaryText: "用户聊到生日蛋糕，并约定明天见面。",
            items: [
              { kind: "user_fact", text: "用户喜欢妈妈做的生日蛋糕", evidenceTurnIndexes: [1] },
              { kind: "user_fact", text: "澜星说自己喜欢月光", evidenceTurnIndexes: [2] },
              { kind: "shared_event", text: "共同确认明天见面", evidenceTurnIndexes: [3, 4] },
              { kind: "shared_event", text: "一起用小脚丫面试地板比喻宝宝学步", evidenceTurnIndexes: [2] },
              { kind: "emotion", text: "轻松愉快：聊到生日蛋糕", evidenceTurnIndexes: [1] },
            ],
          }),
          toolCalls: [],
          finishReason: "stop",
          responseId: "extract_2",
          model: "test",
        };
      },
    });

    expect(result.items.map((i) => i.kind)).toEqual([
      "user_fact",
      "shared_event",
      "emotion",
    ]);
    expect(result.items[0]).toMatchObject({ text: "用户喜欢妈妈做的生日蛋糕" });
    expect(result.items[1]).toMatchObject({ text: "共同确认明天见面" });
  });

  it("does not emit identity_note and does not duplicate a user fact as vignette", async () => {
    const result = await extractMemoryCommitFromTranscript({
      agentId: "lanxing",
      sessionId: "session_1",
      transcript: transcript(),
      llmRunner: async function () {
        return {
          text: JSON.stringify({
            summaryText: "用户聊到生日蛋糕。",
            items: [
              { kind: "user_fact", text: "用户喜欢妈妈做的生日蛋糕", evidenceTurnIndexes: [1] },
              { kind: "identity_note", text: "澜星 22 岁", evidenceTurnIndexes: [0] },
            ],
          }),
          toolCalls: [],
          finishReason: "stop",
          responseId: "extract_3",
          model: "test",
        };
      },
    });

    expect(result.items.map((i) => i.kind)).toEqual(["user_fact"]);
  });

  it("sanitizer dedups and drops exclusion-seed overlaps", () => {
    const extraction = {
      summaryText: "用户喜欢桂花乌龙。",
      items: [
        { kind: "user_fact" as const, text: "用户喜欢桂花乌龙", evidenceTurnIndexes: [1] },
        { kind: "user_fact" as const, text: "用户喜欢桂花乌龙", evidenceTurnIndexes: [1] },
        { kind: "vignette" as const, text: "妈妈做了生日蛋糕", evidenceTurnIndexes: [1] },
      ],
    };
    const sanitized = sanitizeMemoryCommitExtractionForFacts(
      extraction,
      transcript(),
      { exclusionSeeds: ["用户喜欢桂花乌龙"] },
    );

    expect(sanitized.items).toEqual([
      { kind: "vignette", text: "妈妈做了生日蛋糕", evidenceTurnIndexes: [1] },
    ]);
  });

  it("decorates MemoryPort commit with verified items and strips evidence", async () => {
    const records: MemoryCommitInput[] = [];
    const port = createMemoryCommitExtractingPort(recordingMemoryPort(records), {
      traceWriter: async function () {},
      extractor: async function () {
        return {
          summaryText: "LLM 摘要：用户聊到生日蛋糕。",
          items: [
            { kind: "user_fact", text: "用户喜欢妈妈做的生日蛋糕", evidenceTurnIndexes: [1] },
            { kind: "shared_event", text: "共同确认明天见面", evidenceTurnIndexes: [3, 4] },
          ],
          attitude: {
            stance: "亲近",
            summary: "觉得用户很温柔",
            evidence: "用户分享生日蛋糕，我回应很温柔",
            feel: ["亲近", "被信任"],
            keywords: ["生日蛋糕", "温柔"],
            evidenceTurnIndexes: [1, 2],
          },
        };
      },
    });

    await port.commitAfterCall(baseInput());

    expect(records[0]?.summaryText).toBe("LLM 摘要：用户聊到生日蛋糕。");
    expect(records[0]?.items).toEqual([
      { kind: "user_fact", text: "用户喜欢妈妈做的生日蛋糕" },
      { kind: "shared_event", text: "共同确认明天见面" },
      {
        kind: "attitude",
        text: "态度：亲近；觉得用户很温柔（依据：用户分享生日蛋糕，我回应很温柔）｜感觉：亲近 / 被信任｜关键词：生日蛋糕 / 温柔",
        payload: {
          stance: "亲近",
          summary: "觉得用户很温柔",
          evidence: "用户分享生日蛋糕，我回应很温柔",
          feel: ["亲近", "被信任"],
          keywords: ["生日蛋糕", "温柔"],
        },
      },
    ]);
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

    expect(records[0]?.summaryText).toBe("fallback transcript summary");
    expect(records[0]?.items).toBeUndefined();
  });

	it("writes structured MemoryCommit trace DTO with items", async () => {
    const records: MemoryCommitInput[] = [];
    const traces: unknown[] = [];
    const port = createMemoryCommitExtractingPort(recordingMemoryPort(records), {
      traceWriter: async function (input) {
        traces.push(input);
      },
      extractor: async function () {
        return {
          summaryText: "LLM 摘要：用户聊到生日蛋糕。",
          items: [{ kind: "user_fact", text: "用户喜欢妈妈做的生日蛋糕", evidenceTurnIndexes: [1] }],
          debug: {
            rawCounts: { user_fact: 1 },
            sanitizedCounts: { user_fact: 1 },
            filteredCounts: { user_fact: 0 },
            rawLlmText: "{}",
          },
        };
      },
    });

    await port.commitAfterCall(baseInput());

    expect(traces).toHaveLength(1);
    expect(traces[0]).toMatchObject({
      bucket: "memory-commits",
      id: "session_1",
      event: "memory_commit.trace",
      sessionId: "session_1",
      userId: "demo-user",
      payload: {
        enrichedInput: {
          summaryText: "LLM 摘要：用户聊到生日蛋糕。",
          items: [{ kind: "user_fact", text: "用户喜欢妈妈做的生日蛋糕" }],
        },
			},
		});
	});

	it("extracts a grounded attitude with persona and history only as reference", async () => {
		const seen: string[] = [];
		const result = await extractAttitudeFromTranscript({
			transcript: transcript(),
			character: {
				displayName: "澜星",
				persona: {
					personalityCode: "ENFP",
					speakingStyle: "温柔但直接",
					attitudeHistoryLimit: 2,
				},
			},
			historyAttitudes: [
				{
					id: "att_old",
					text: "态度：亲近；之前聊得开心",
					at: "2026-08-10T00:00:00.000Z",
					payload: {
						stance: "亲近",
						summary: "之前聊得开心",
						evidence: "聊了兴趣",
						feel: ["亲近"],
						keywords: ["兴趣"],
					},
				},
			],
			llmRunner: async function (input) {
				seen.push(input.messages.map((m) => m.content).join("\n"));
				return {
					text: JSON.stringify({
						attitude: {
							stance: "亲近",
							summary: "觉得用户很温柔",
							evidence: "用户分享生日蛋糕，我回应很温柔",
							feel: ["亲近", "被信任"],
							keywords: ["生日蛋糕", "温柔"],
							evidenceTurnIndexes: [1, 2],
						},
					}),
					toolCalls: [],
					finishReason: "stop",
					responseId: "attitude_1",
					model: "test",
				};
			},
		});

		const promptText = seen.join("\n");
		expect(promptText).toContain("澜星");
		expect(promptText).toContain("ENFP");
		expect(promptText).toContain("之前聊得开心");
		expect(promptText).toContain("妈妈给我做了生日蛋糕");
		expect(result.attitude).toMatchObject({
			stance: "亲近",
			summary: "觉得用户很温柔",
			evidence: "用户分享生日蛋糕，我回应很温柔",
			feel: ["亲近", "被信任"],
			keywords: ["生日蛋糕", "温柔"],
			evidenceTurnIndexes: [1, 2],
		});
	});

	it("keeps assistant-reaction attitude even without dual-role grounding", async () => {
		const result = await extractAttitudeFromTranscript({
			transcript: transcript(),
			llmRunner: async function () {
				return {
					text: JSON.stringify({
						attitude: {
							stance: "亲近",
							summary: "觉得用户很温柔",
							evidence: "澜星自己说的月光比喻",
							feel: ["亲近"],
							keywords: ["月光"],
							evidenceTurnIndexes: [2],
						},
					}),
					toolCalls: [],
					finishReason: "stop",
					responseId: "attitude_2",
					model: "test",
				};
			},
		});

		expect(result.attitude).toMatchObject({
			stance: "亲近",
			summary: "觉得用户很温柔",
			evidence: "澜星自己说的月光比喻",
		});
	});

	it("accepts assistant-reaction attitude when evidence text also hits user turn", async () => {
		const result = await extractAttitudeFromTranscript({
			transcript: transcript(),
			llmRunner: async function () {
				return {
					text: JSON.stringify({
						attitude: {
							stance: "关切支持",
							summary: "因为用户分享生日蛋糕而觉得温柔",
							evidence: "用户聊到生日蛋糕，我回应很温柔",
							feel: ["关切支持"],
							keywords: ["生日蛋糕", "温柔"],
							evidenceTurnIndexes: [2],
						},
					}),
					toolCalls: [],
					finishReason: "stop",
					responseId: "attitude_3",
					model: "test",
				};
			},
		});

		expect(result.attitude).toMatchObject({
			stance: "关切支持",
			summary: "因为用户分享生日蛋糕而觉得温柔",
		});
	});

	it("keeps attitude even when keywords are abstract and not in transcript", async () => {
		const result = await extractAttitudeFromTranscript({
			transcript: transcript(),
			llmRunner: async function () {
				return {
					text: JSON.stringify({
						attitude: {
							stance: "欣赏与信赖",
							summary: "因为用户分享而觉得亲近",
							evidence: "用户聊到生日蛋糕，我回应很温柔",
							feel: ["欣赏与信赖"],
							keywords: ["项目共鸣", "情感支持"],
							evidenceTurnIndexes: [1, 2],
						},
					}),
					toolCalls: [],
					finishReason: "stop",
					responseId: "attitude_4",
					model: "test",
				};
			},
		});

		expect(result.attitude).toMatchObject({
			stance: "欣赏与信赖",
			keywords: ["项目共鸣", "情感支持"],
		});
	});

	it("repairs invalid evidenceTurnIndexes instead of discarding attitude", async () => {
		const result = await extractAttitudeFromTranscript({
			transcript: transcript(),
			llmRunner: async function () {
				return {
					text: JSON.stringify({
						attitude: {
							stance: "被触动",
							summary: "因用户分享生日蛋糕而觉得亲近",
							evidence: "用户分享生日蛋糕，我回应很温柔",
							feel: ["被触动"],
							keywords: ["生日蛋糕", "温柔"],
							evidenceTurnIndexes: [99, 100],
						},
					}),
					toolCalls: [],
					finishReason: "stop",
					responseId: "attitude_repair_1",
					model: "test",
				};
			},
		});

		expect(result.attitude).not.toBeNull();
		expect(result.attitude?.stance).toBe("被触动");
		expect(result.attitude?.evidenceTurnIndexes.length).toBeGreaterThan(0);
		expect(result.attitude?.evidenceTurnIndexes.every((i) => i <= 4)).toBe(true);
	});

	it("keeps attitude even when soft exclusion seeds share common words", async () => {
		const result = await extractAttitudeFromTranscript({
			transcript: transcript(),
			commitContext: {
				exclusionSeeds: [
					"[conversation.inertia.recent_turns] previousSource=free - user: 这个项目让我有种被它牵着走的感觉",
				],
			},
			llmRunner: async function () {
				return {
					text: JSON.stringify({
						attitude: {
							stance: "被触动",
							summary: "这种被当作人来相信的感觉让她动容",
							evidence: "用户聊到生日蛋糕，她说这种感觉真真切切",
							feel: ["被信任"],
							keywords: ["生日蛋糕", "真真切切"],
							evidenceTurnIndexes: [1, 2],
						},
					}),
					toolCalls: [],
					finishReason: "stop",
					responseId: "attitude_seed_1",
					model: "test",
				};
			},
		});

		expect(result.attitude).toMatchObject({
			stance: "被触动",
			summary: "这种被当作人来相信的感觉让她动容",
		});
	});

	it("accepts abstract feel tags with verbatim keywords", async () => {
		const result = await extractAttitudeFromTranscript({
			transcript: transcript(),
			llmRunner: async function () {
				return {
					text: JSON.stringify({
						attitude: {
							stance: "欣赏与信赖",
							summary: "因为用户分享而觉得亲近",
							evidence: "用户聊到生日蛋糕，我回应很温柔",
							feel: ["项目共鸣", "情感支持"],
							keywords: ["生日蛋糕", "温柔"],
							evidenceTurnIndexes: [1, 2],
						},
					}),
					toolCalls: [],
					finishReason: "stop",
					responseId: "attitude_5",
					model: "test",
				};
			},
		});

		expect(result.attitude).toMatchObject({
			stance: "欣赏与信赖",
			feel: ["项目共鸣", "情感支持"],
			keywords: ["生日蛋糕", "温柔"],
		});
	});

	it("default orchestrator reads configured history limit and appends attitude item", async () => {
		const records: MemoryCommitInput[] = [];
		const historyCalls: Array<{
			userId: string;
			agentId: string;
			limit: number;
		}> = [];
		const orchestrator = createMemoryCommitOrchestrator(
			{
				async commitAfterCall(input) {
					records.push(input);
					return {
						ok: true,
						writtenLayers: ["episodic", "relational"],
						writtenEntryIds: ["mem_summary", "mem_attitude"],
					};
				},
			},
			{
				logErrors: false,
				traceWriter: async function () {},
				listRecentAttitudes: async function (input) {
					historyCalls.push(input);
					return [];
				},
				llmRunner: async function (input) {
					const prompt = input.messages.map((m) => m.content).join("\n");
					if (prompt.includes("态度记忆抽取器")) {
						return {
							text: JSON.stringify({
								attitude: {
									stance: "亲近",
									summary: "觉得用户很温柔",
									evidence: "用户分享生日蛋糕，我回应很温柔",
									feel: ["亲近"],
									keywords: ["生日蛋糕", "温柔"],
									evidenceTurnIndexes: [1, 2],
								},
							}),
							toolCalls: [],
							finishReason: "stop",
							responseId: "attitude_default_1",
							model: "test",
						};
					}
					return {
						text: JSON.stringify({
							summaryText: "用户聊到生日蛋糕。",
							items: [
								{
									kind: "user_fact",
									text: "用户喜欢妈妈做的生日蛋糕",
									evidenceTurnIndexes: [1],
								},
							],
						}),
						toolCalls: [],
						finishReason: "stop",
						responseId: "facts_default_1",
						model: "test",
					};
				},
			},
		);

		await orchestrator.commitAfterCall({
			...baseInput(),
			commitContext: {
				callKind: "free",
				policy: "free_post_pipeline",
				source: "free",
				chapterId: "__free__",
				cardId: "lanxing_free",
				character: {
					displayName: "澜星",
					persona: {
						personalityCode: "ENFP",
						attitudeHistoryLimit: 3,
					},
				},
			},
		});

		expect(historyCalls).toEqual([
			{ userId: "demo-user", agentId: "lanxing", limit: 3 },
		]);
		expect(records[0]?.items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					kind: "attitude",
					payload: expect.objectContaining({
						stance: "亲近",
						summary: "觉得用户很温柔",
					}),
				}),
			]),
		);
	});
});
