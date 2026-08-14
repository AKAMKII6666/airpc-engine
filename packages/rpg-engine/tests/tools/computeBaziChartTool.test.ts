/**
 * 白半仙专属八字排盘：角色能力控制 + session_local 本体。
 */
import { describe, expect, it } from "vitest";
import {
  computeBaziChart,
  isEngineError,
  listToolsForCard,
  type CallCardDefinition,
  type CallSession,
  type CharacterDef,
} from "../../src/index.js";
import { invokeSessionTool } from "../../src/tools/invokeSessionLocal.js";

function freeCard(): CallCardDefinition {
  return {
    cardId: "bai_bansian_free",
    cardKind: "free",
    title: "白半仙自由通话",
    ownerAgentId: "bai-bansian",
    entryMode: "either",
    interactionMode: "realtime_dialogue",
    context: {},
    exits: [],
    toolPolicy: { mode: "inherit_free" },
  };
}

function bai(): CharacterDef {
  return {
    schemaVersion: 1,
    agentId: "bai-bansian",
    dialable: true,
    capabilities: {
      tools: [{ toolId: "compute_bazi_chart", enabled: true }],
    },
  };
}

function sessionFixture(character: CharacterDef | null = bai()): CallSession {
  return {
    schemaVersion: 1,
    sessionId: "session_1",
    userId: "demo-user",
    chapterId: "__free__",
    status: "in_call",
    startedAt: "2026-08-10T00:00:00.000Z",
    resolve: {
      source: "free",
      instanceId: "free_bai_bansian",
      cardId: "bai_bansian_free",
      agentId: "bai-bansian",
      chapterId: "__free__",
      intent: { kind: "free_call", agentId: "bai-bansian" },
    },
    frozenCard: freeCard(),
    frozenCharacter: character,
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

describe("compute_bazi_chart pure compute", () => {
  it("computes a deterministic solar chart with optional time pillar", () => {
    const result = computeBaziChart({
      calendar_type: "solar",
      birth_date: "1990-01-02",
      birth_time: "08:30",
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.chart.calendarType).toBe("solar");
    expect(result.chart.hourKnown).toBe(true);
    expect(result.chart.pillars.year).toMatch(/[甲乙丙丁戊己庚辛壬癸]./);
    expect(result.chart.pillars.time).toMatch(/[甲乙丙丁戊己庚辛壬癸]./);
  });
});

describe("compute_bazi_chart character capability", () => {
  it("keeps compute_bazi_chart hidden unless character declares it", () => {
    expect(
      listToolsForCard(freeCard()).map(function (tool) {
        return tool.toolId;
      }),
    ).not.toContain("compute_bazi_chart");
    expect(
      listToolsForCard(freeCard(), { characterDef: bai() }).map(function (tool) {
        return tool.toolId;
      }),
    ).toContain("compute_bazi_chart");
  });

  it("invokes through session_local without MemoryPort for Bai", async () => {
    const session = sessionFixture();
    const result = await invokeSessionTool({
      session,
      toolId: "compute_bazi_chart",
      args: {
        calendar_type: "solar",
        birth_date: "1990-01-02",
      },
      memory: null,
    });

    expect(isEngineError(result)).toBe(false);
    if (isEngineError(result)) return;
    expect(result.localResult).toMatchObject({
      status: "ok",
      chart: { hourKnown: false },
    });
    expect(session.toolTrace).toEqual([
      expect.objectContaining({
        toolId: "compute_bazi_chart",
        behavior: "session_local",
        status: "ok",
        hourKnown: false,
      }),
    ]);
  });

  it("denies invocation for characters without the capability", async () => {
    const session = sessionFixture(null);
    const result = await invokeSessionTool({
      session,
      toolId: "compute_bazi_chart",
      args: {
        calendar_type: "solar",
        birth_date: "1990-01-02",
      },
      memory: null,
    });

    expect(isEngineError(result)).toBe(true);
    if (!isEngineError(result)) return;
    expect(result.details).toMatchObject({ rule: "TOOL_POLICY" });
  });
});
