/**
 * 记忆工具闭环：先 search_memory，再按返回 id 取正文。
 */
import { describe, expect, it } from "vitest";
import { isEngineError } from "../../src/index.js";
import type { CallSession } from "../../src/host/types.js";
import type { MemoryPort } from "../../src/memory/types.js";
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

function memoryFixture(): MemoryPort {
  return {
    async projectForCall() {
      return { softText: "", includedEntryIds: [] };
    },
    async search() {
      return [{
        id: "mem_1",
        layer: "episodic",
        kind: "call_summary",
        text: "用户上次说露营很冷",
        at: "2026-08-01T00:00:00.000Z",
        createdAt: "2026-08-01T00:00:00.000Z",
      }];
    },
    async getById(input) {
      return input.entryId === "mem_1"
        ? {
            id: "mem_1",
            layer: "episodic",
            kind: "call_summary",
            text: "完整记忆：用户上次说露营很冷，还带了热茶。",
            at: "2026-08-01T00:00:00.000Z",
            createdAt: "2026-08-01T00:00:00.000Z",
          }
        : null;
    },
    async applyPatch() {},
    async commitAfterCall() {
      return { ok: true, writtenLayers: [] };
    },
  };
}

describe("memory tool closure", () => {
  it("requires get_memory_by_id entry_id from this call search_memory", async () => {
    const session = sessionFixture();
    const memory = memoryFixture();
    const denied = await invokeSessionTool({
      session,
      toolId: "get_memory_by_id",
      args: { entry_id: "mem_1" },
      memory,
    });
    expect(isEngineError(denied)).toBe(true);
    if (!isEngineError(denied)) return;
    expect(denied.details).toMatchObject({ rule: "MEMORY_GET_REQUIRES_SEARCH" });
  });

  it("returns structured search and get results after search_memory", async () => {
    const session = sessionFixture();
    const memory = memoryFixture();
    const searched = await invokeSessionTool({
      session,
      toolId: "search_memory",
      args: { text_query: "露营" },
      memory,
    });
    expect(isEngineError(searched)).toBe(false);
    if (isEngineError(searched)) return;
    expect(searched.localResult).toMatchObject({
      status: "ok",
      count: 1,
      hits: [{ id: "mem_1" }],
    });

    const fetched = await invokeSessionTool({
      session,
      toolId: "get_memory_by_id",
      args: { entry_id: "mem_1" },
      memory,
    });
    expect(isEngineError(fetched)).toBe(false);
    if (isEngineError(fetched)) return;
    expect(fetched.localResult).toMatchObject({
      status: "ok",
      entryId: "mem_1",
      hit: { text: expect.stringContaining("热茶") },
    });
  });
});
