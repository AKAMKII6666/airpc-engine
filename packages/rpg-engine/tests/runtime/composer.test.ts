/**
 * 模块名称：Composer 单元测（优先级 / 时间 / patch 硬约束）
 */
import { describe, expect, it } from "vitest";
import {
  buildComposeScene,
  composeRenderedPrompt,
  hourToTimeBucket,
  validatePromptScenePatches,
  type CallCardDefinition,
  type CharacterDef,
} from "../../src/index.js";

function baseCard(
  overrides: Partial<CallCardDefinition> = {},
): CallCardDefinition {
  return {
    cardId: "t1",
    cardKind: "story",
    ownerAgentId: "agent-a",
    entryMode: "outbound_auto",
    context: {
      objective: "完成介绍",
      forbidden: ["剧透"],
      speakableBrief: "有个朋友想认识你。",
      privateBrief: "勿剧透。",
      emotion: "热心",
    },
    exits: [],
    ...overrides,
  };
}

describe("hourToTimeBucket", () => {
  it("matches 01 ranges", () => {
    expect(hourToTimeBucket(0)).toBe("late_night");
    expect(hourToTimeBucket(4)).toBe("late_night");
    expect(hourToTimeBucket(5)).toBe("morning");
    expect(hourToTimeBucket(10)).toBe("morning");
    expect(hourToTimeBucket(11)).toBe("afternoon");
    expect(hourToTimeBucket(16)).toBe("afternoon");
    expect(hourToTimeBucket(17)).toBe("evening");
    expect(hourToTimeBucket(21)).toBe("evening");
    expect(hourToTimeBucket(22)).toBe("night");
    expect(hourToTimeBucket(23)).toBe("night");
  });
});

describe("validatePromptScenePatches", () => {
  it("rejects objective / forbidden in patch", () => {
    const err = validatePromptScenePatches([
      {
        layerId: "bad",
        match: {},
        patch: { objective: "hack" },
      },
    ]);
    expect(err?.ok).toBe(false);
    expect(err && "details" in err ? err.details : null).toMatchObject({
      rule: "PROMPT_SCENE_PATCH_HARD",
    });
  });

  it("accepts opening-only patches", () => {
    expect(
      validatePromptScenePatches([
        {
          layerId: "ok",
          match: { callDirection: "outbound" },
          patch: { openingSpeakable: "hi" },
        },
      ]),
    ).toBeNull();
  });
});

describe("composeRenderedPrompt", () => {
  it("applies card promptScenes by match + priority; injects local time", () => {
    const card = baseCard({
      context: {
        objective: "完成介绍",
        forbidden: ["剧透"],
        speakableBrief: "有个朋友想认识你。",
        privateBrief: "勿剧透。",
        promptScenes: [
          {
            layerId: "any_outbound",
            priority: 1,
            match: { callDirection: "outbound" },
            patch: {
              openingSpeakable: "低优先级开场",
              appendSpeakable: "附加一句。",
            },
          },
          {
            layerId: "afternoon_out",
            priority: 10,
            match: {
              callDirection: "outbound",
              timeBuckets: ["afternoon"],
            },
            patch: { openingSpeakable: "下午开场" },
          },
          {
            layerId: "morning_out",
            priority: 10,
            match: {
              callDirection: "outbound",
              timeBuckets: ["morning"],
            },
            patch: { openingSpeakable: "早上开场" },
          },
        ],
      },
    });
    const scene = buildComposeScene({
      entryMode: "outbound_auto",
      packageId: "golden_handoff",
      localNowIso: "2026-07-13T16:00:00+08:00",
      timeZone: "Asia/Shanghai",
    });
    expect(scene.localTime.bucket).toBe("afternoon");
    expect(scene.timeMentionPolicy).toBe("correct_only");

    const prompt = composeRenderedPrompt({ card, scene });
    expect(prompt && "ok" in prompt && prompt.ok === false).toBe(false);
    if (prompt && "ok" in prompt && prompt.ok === false) return;

    expect(prompt.openingSpeakable).toBe("下午开场");
    expect(prompt.matchedLayerIds).toEqual(["any_outbound", "afternoon_out"]);
    expect(prompt.speakable).toContain("附加一句。");
    expect(prompt.systemHard.some((s) => s.includes("[objective]"))).toBe(
      true,
    );
    expect(prompt.systemHard.some((s) => s.includes("[用户本地时间]"))).toBe(
      true,
    );
    expect(prompt.systemHard.some((s) => s.includes("16:00:00+08:00"))).toBe(
      true,
    );
  });

  it("falls back to CharacterDef.defaultPromptScenes when card has no opening", () => {
    const card = baseCard({
      entryMode: "inbound_user_dial",
      context: {
        objective: "初识",
        speakableBrief: "澜星提过你。",
        privateBrief: "害羞。",
      },
    });
    const character: CharacterDef = {
      schemaVersion: 1,
      agentId: "agent-a",
      dialable: true,
      persona: { systemPrompt: "你是测试角色。" },
      identity: { gender: "female" },
      defaultPromptScenes: [
        {
          layerId: "char_inbound",
          match: { callDirection: "inbound" },
          patch: { openingSpeakable: "角色默认开场" },
        },
      ],
    };
    const scene = buildComposeScene({
      entryMode: "inbound_user_dial",
      localNowIso: "2026-07-13T09:00:00+08:00",
    });
    const prompt = composeRenderedPrompt({ card, characterDef: character, scene });
    expect(prompt && "ok" in prompt && prompt.ok === false).toBe(false);
    if (prompt && "ok" in prompt && prompt.ok === false) return;
    expect(prompt.openingSpeakable).toBe("角色默认开场");
    expect(prompt.matchedLayerIds).toContain("char_inbound");
    expect(prompt.debug?.notes?.some((n) => n.includes("fallback"))).toBe(
      true,
    );
    expect(
      prompt.systemHard.some((s) => s.includes("persona.systemPrompt")),
    ).toBe(true);
    expect(prompt.softContext.some((s) => s.includes("[identity]"))).toBe(
      true,
    );
  });

  it("does not use character default when card already produced opening", () => {
    const card = baseCard({
      context: {
        objective: "x",
        promptScenes: [
          {
            layerId: "card_open",
            match: {},
            patch: { openingSpeakable: "卡开场" },
          },
        ],
      },
    });
    const character: CharacterDef = {
      schemaVersion: 1,
      agentId: "agent-a",
      dialable: true,
      defaultPromptScenes: [
        {
          layerId: "char_open",
          match: {},
          patch: { openingSpeakable: "角色开场" },
        },
      ],
    };
    const scene = buildComposeScene({
      entryMode: "outbound",
      localNowIso: "2026-07-13T20:00:00+08:00",
    });
    const prompt = composeRenderedPrompt({ card, characterDef: character, scene });
    if (prompt && "ok" in prompt && prompt.ok === false) return;
    expect(prompt.openingSpeakable).toBe("卡开场");
    expect(prompt.matchedLayerIds).not.toContain("char_open");
  });

  it("rejects compose when patch contains forbidden hard keys", () => {
    const card = baseCard({
      context: {
        objective: "x",
        promptScenes: [
          {
            layerId: "evil",
            match: {},
            patch: { forbidden: ["nope"] } as never,
          },
        ],
      },
    });
    const scene = buildComposeScene({
      entryMode: "outbound",
      localNowIso: "2026-07-13T12:00:00+08:00",
    });
    const prompt = composeRenderedPrompt({ card, scene });
    expect(prompt && "ok" in prompt && prompt.ok === false).toBe(true);
  });

  it("Free package uses allow_casual timeMentionPolicy", () => {
    const scene = buildComposeScene({
      packageId: "__free__",
      entryMode: "inbound",
      localNowIso: "2026-07-13T12:00:00+08:00",
    });
    expect(scene.timeMentionPolicy).toBe("allow_casual");
  });

  it("sceneOverride can fix local time", () => {
    const scene = buildComposeScene({
      entryMode: "outbound",
      localNowIso: "2026-07-13T12:00:00+08:00",
      sceneOverride: {
        localTime: {
          isoWithOffset: "2026-07-13T22:30:00+08:00",
          timeZone: "Asia/Shanghai",
          localHour: 22,
          bucket: "night",
        },
      },
    });
    expect(scene.localTime.bucket).toBe("night");
    expect(scene.localTime.localHour).toBe(22);
  });
});
