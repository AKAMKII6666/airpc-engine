/**
 * 通话中工具调用：register_exit 候选去重。
 */
import { describe, expect, it } from "vitest";
import { isEngineError } from "../../src/index.js";
import type { CallSession } from "../../src/host/types.js";
import { invokeSessionTool } from "../../src/tools/invokeSessionLocal.js";

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
      chapterId: "__free__",
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

describe("invokeSessionTool", () => {
  it("rejects duplicate register_exit candidates in the same call session", async () => {
    const session = sessionFixture();
    const args = {
      delay_minutes: 2,
      topic_hint: "提醒用户睡午觉",
    };

    const first = await invokeSessionTool({
      session,
      toolId: "schedule_reminder_call",
      args,
      memory: null,
    });
    expect(isEngineError(first)).toBe(false);
    expect(session.exitCandidates).toHaveLength(1);

    const second = await invokeSessionTool({
      session,
      toolId: "schedule_reminder_call",
      args: { ...args },
      memory: null,
    });

    expect(isEngineError(second)).toBe(true);
    if (!isEngineError(second)) return;
    expect(second.message).toMatch(/duplicate register_exit/);
    expect(second.details).toMatchObject({
      rule: "TOOL_DUPLICATE_REGISTER_EXIT",
    });
    expect(session.exitCandidates).toHaveLength(1);
  });
});
