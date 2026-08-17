/**
 * MemoryCommit context：prompt/tool 污染源进入 exclusion seeds。
 */
import { describe, expect, it } from "vitest";
import type { CallSession } from "../../src/host/types.js";
import { memoryExclusionSeeds, memoryToolTraceRefs } from "../../src/runtime/memoryCommitContext.js";

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
      ownerAgentId: "lanxing",
      entryMode: "either",
      interactionMode: "realtime_dialogue",
      context: {},
      exits: [],
    },
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
        "[persona.systemPrompt]\n澜星喜欢把自己说成窗边的月光。",
        "[objective]\n闲聊并安抚用户。",
        "[unrelated]\n这段不应该作为排除 seed。",
      ],
      openingSpeakable: "喂，请问哪位？",
      openingPrivate: "用户主动呼入，先不要叫出名字。",
      speakable: "",
      private: "",
      softContext: [
        "[memory.semantic]\n用户过去说过喜欢桂花乌龙。",
        "[conversation.inertia.recent_turns]\n上一通聊到生日蛋糕。",
      ],
      matchedLayerIds: ["persona", "memory"],
      debug: { providerIds: ["persona", "memory"] },
    },
    channel: "text_turn",
    interactionPhase: "dialogue",
    phoneFlags: {},
    completedBeats: [],
    toolTrace: [{
      at: "2026-08-10T00:01:00.000Z",
      toolId: "compute_bazi_chart",
      behavior: "session_local",
      resultSeeds: ["八字排盘；dayMaster=甲子"],
    }],
    exitCandidates: [],
    effectLedger: {},
    chatTurns: [],
  };
}

describe("memory commit context", function () {
  it("collects prompt and tool result pollution seeds", function () {
    const session = sessionFixture();

    expect(memoryToolTraceRefs(session)).toMatchObject({
      traceCount: 1,
      toolIds: ["compute_bazi_chart"],
      resultSeeds: ["八字排盘；dayMaster=甲子"],
    });
    expect(memoryExclusionSeeds(session)).toEqual(
      expect.arrayContaining([
        "喂，请问哪位？",
        "用户主动呼入，先不要叫出名字。",
        "[persona.systemPrompt] 澜星喜欢把自己说成窗边的月光。",
        "[objective] 闲聊并安抚用户。",
        "[memory.semantic] 用户过去说过喜欢桂花乌龙。",
        "[conversation.inertia.recent_turns] 上一通聊到生日蛋糕。",
        "tool:compute_bazi_chart",
        "八字排盘；dayMaster=甲子",
      ]),
    );
    expect(memoryExclusionSeeds(session)).not.toContain(
      "[unrelated] 这段不应该作为排除 seed。",
    );
  });
});
