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
  extractMemoryCommitFromTranscript,
  parseMemoryCommitExtraction,
  sanitizeMemoryCommitExtractionForFacts,
  type MemoryCallTranscriptLike,
} from "@studio-v2/src/utils/server/memory/memoryCommitExtractor.server";
import { createMemoryCommitExtractingPort } from "@studio-v2/src/utils/server/memory/memoryCommitMemoryPort.server";

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
        };
      },
    });

    await port.commitAfterCall(baseInput());

    expect(records[0]?.summaryText).toBe("LLM 摘要：用户聊到生日蛋糕。");
    expect(records[0]?.items).toEqual([
      { kind: "user_fact", text: "用户喜欢妈妈做的生日蛋糕" },
      { kind: "shared_event", text: "共同确认明天见面" },
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
});
