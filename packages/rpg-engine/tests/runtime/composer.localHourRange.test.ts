/**
 * 模块名称：Composer localHourRange / timeBuckets 拒载（从 composer.test 拆出以降基线）
 */
import { describe, expect, it } from "vitest";
import {
  buildComposeScene,
  composeRenderedPrompt,
  validatePromptScenePatches,
  type CallCardDefinition,
  type RenderedPrompt,
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

/** 成功路径：compose 不得返回 EngineError，否则用例无效。 */
function expectOkPrompt(
  prompt: RenderedPrompt | { ok: false; details?: unknown },
): RenderedPrompt {
  const failed = prompt && "ok" in prompt && prompt.ok === false;
  expect(failed).toBe(false);
  if (failed) {
    throw new Error("composeRenderedPrompt returned EngineError");
  }
  return prompt as RenderedPrompt;
}

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

  it("rejects timeBuckets in match", () => {
    const err = validatePromptScenePatches([
      {
        layerId: "legacy",
        match: { timeBuckets: ["afternoon"] },
        patch: { openingSpeakable: "hi" },
      },
    ]);
    expect(err?.ok).toBe(false);
    expect(err && "details" in err ? err.details : null).toMatchObject({
      rule: "PROMPT_SCENE_TIME_BUCKETS_REMOVED",
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

describe("composeRenderedPrompt localHourRange negatives", () => {
  it("negative: localHourRange excludes non-matching hours", () => {
    const card = baseCard({
      context: {
        objective: "x",
        promptScenes: [
          {
            layerId: "only_morning",
            priority: 10,
            match: { localHourRange: { from: 5, to: 11 } },
            patch: { openingSpeakable: "早上开场" },
          },
          {
            layerId: "any",
            priority: 1,
            match: {},
            patch: { openingSpeakable: "默认开场" },
          },
        ],
      },
    });
    const scene = buildComposeScene({
      entryMode: "outbound",
      localNowIso: "2026-07-13T16:00:00+08:00",
    });
    const prompt = expectOkPrompt(composeRenderedPrompt({ card, scene }));
    expect(prompt.openingSpeakable).toBe("默认开场");
    expect(prompt.matchedLayerIds).toEqual(["any"]);
    expect(prompt.matchedLayerIds).not.toContain("only_morning");
  });

  it("rejects compose when match contains timeBuckets", () => {
    const card = baseCard({
      context: {
        objective: "x",
        promptScenes: [
          {
            layerId: "legacy",
            match: { timeBuckets: ["night"] } as never,
            patch: { openingSpeakable: "旧桶开场" },
          },
        ],
      },
    });
    const scene = buildComposeScene({
      entryMode: "outbound",
      localNowIso: "2026-07-13T22:00:00+08:00",
    });
    const prompt = composeRenderedPrompt({ card, scene });
    expect(prompt && "ok" in prompt && prompt.ok === false).toBe(true);
    if (prompt && "ok" in prompt && prompt.ok === false) {
      expect(prompt.details).toMatchObject({
        rule: "PROMPT_SCENE_TIME_BUCKETS_REMOVED",
      });
    }
  });
});

describe("composeRenderedPrompt localHourRange match", () => {
  it("night layer matches at localHour 22", () => {
    const card = baseCard({
      context: {
        objective: "完成介绍",
        promptScenes: [
          {
            layerId: "outbound_any",
            priority: 1,
            match: { callDirection: "outbound" },
            patch: { openingSpeakable: "默认开场" },
          },
          {
            layerId: "outbound_night",
            priority: 10,
            match: {
              callDirection: "outbound",
              localHourRange: { from: 22, to: 24 },
            },
            patch: { openingSpeakable: "夜间开场" },
          },
        ],
      },
    });
    const nightScene = buildComposeScene({
      entryMode: "outbound_auto",
      packageId: "golden_handoff",
      localNowIso: "2026-07-13T22:30:00+08:00",
      timeZone: "Asia/Shanghai",
    });
    expect(nightScene.localTime.localHour).toBe(22);
    const nightPrompt = expectOkPrompt(
      composeRenderedPrompt({ card, scene: nightScene }),
    );
    expect(nightPrompt.openingSpeakable).toBe("夜间开场");
    expect(nightPrompt.matchedLayerIds).toEqual([
      "outbound_any",
      "outbound_night",
    ]);
  });

  it("late_night layer matches at localHour 2", () => {
    const card = baseCard({
      context: {
        objective: "完成介绍",
        promptScenes: [
          {
            layerId: "outbound_any",
            priority: 1,
            match: { callDirection: "outbound" },
            patch: { openingSpeakable: "默认开场" },
          },
          {
            layerId: "outbound_late_night",
            priority: 10,
            match: {
              callDirection: "outbound",
              localHourRange: { from: 0, to: 5 },
            },
            patch: { openingSpeakable: "深夜开场" },
          },
        ],
      },
    });
    const lateScene = buildComposeScene({
      entryMode: "outbound_auto",
      packageId: "golden_handoff",
      localNowIso: "2026-07-14T02:15:00+08:00",
      timeZone: "Asia/Shanghai",
    });
    expect(lateScene.localTime.localHour).toBe(2);
    const latePrompt = expectOkPrompt(
      composeRenderedPrompt({ card, scene: lateScene }),
    );
    expect(latePrompt.openingSpeakable).toBe("深夜开场");
    expect(latePrompt.matchedLayerIds).toEqual([
      "outbound_any",
      "outbound_late_night",
    ]);
  });
});
