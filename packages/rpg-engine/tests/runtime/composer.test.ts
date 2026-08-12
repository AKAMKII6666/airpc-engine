/**
 * 模块名称：Composer 单元测（优先级 / localHourRange / patch 硬约束）
 */
import { describe, expect, it } from "vitest";
import {
  buildComposeScene,
  composeRenderedPrompt,
  listPromptProviderIds,
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
              localHourRange: { from: 11, to: 17 },
            },
            patch: { openingSpeakable: "下午开场" },
          },
          {
            layerId: "morning_out",
            priority: 10,
            match: {
              callDirection: "outbound",
              localHourRange: { from: 5, to: 11 },
            },
            patch: { openingSpeakable: "早上开场" },
          },
        ],
      },
    });
    const scene = buildComposeScene({
      entryMode: "outbound_auto",
      chapterId: "golden_handoff",
      localNowIso: "2026-07-13T16:00:00+08:00",
      timeZone: "Asia/Shanghai",
    });
    expect(scene.localTime.localHour).toBe(16);
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
    expect(prompt.systemHard.some((s) => s.includes("本地小时=16"))).toBe(true);
    expect(prompt.debug?.providerIds).toEqual(listPromptProviderIds());
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

  it("injects global phone style policy without replacing card objective", () => {
    const scene = buildComposeScene({
      entryMode: "outbound",
      localNowIso: "2026-07-13T20:00:00+08:00",
    });
    const prompt = composeRenderedPrompt({ card: baseCard(), scene });
    if (prompt && "ok" in prompt && prompt.ok === false) return;
    const objectiveIndex = prompt.systemHard.findIndex((s) =>
      s.includes("[objective]"),
    );
    const styleIndex = prompt.systemHard.findIndex((s) =>
      s.includes("[style.phone]"),
    );
    expect(objectiveIndex).toBeGreaterThanOrEqual(0);
    expect(styleIndex).toBeGreaterThan(objectiveIndex);
    const style = prompt.systemHard[styleIndex] ?? "";
    expect(style).toContain("像真人打电话");
    expect(style).toContain("禁止小作文式环境描写");
    expect(style).toContain("禁止用括号朗读动作");
    expect(style).toContain("不要每轮都用开放问题收尾");
    expect(style).toContain("本通是你主动打给用户");
    expect(prompt.debug?.providerIds).toContain("style.phone_global");
  });

  it("injects user reminder callback topic and wrong-number guard from begin context", () => {
    const scene = buildComposeScene({
      entryMode: "outbound",
      localNowIso: "2026-07-13T20:00:00+08:00",
    });
    const prompt = composeRenderedPrompt({
      card: baseCard(),
      scene,
      beginContext: {
        source: "schedule_reminder",
        actualEntry: "outbound_auto",
        scheduledIntentId: "intent_1",
        topicHint: "提醒睡午觉",
      },
    });
    if (prompt && "ok" in prompt && prompt.ok === false) return;
    const joinedHard = prompt.systemHard.join("\n\n");
    expect(joinedHard).toContain("[call.source]");
    expect(joinedHard).toContain("本通是你主动打给用户");
    expect(joinedHard).toContain("scheduleIntentId=intent_1");
    expect(joinedHard).toContain("[scheduled.callback.user_reminder]");
    expect(joinedHard).toContain("回电话题：提醒睡午觉");
    expect(joinedHard).toContain("用户口头预约的提醒/回电");
    expect(joinedHard).toContain(
      "不要把预约回电说成误拨、打错、随机遇见或别人介绍",
    );
    expect(joinedHard).toContain("[opening.guard]");
    expect(joinedHard).toContain("FreeCard 自由通话只按当前 FreeCard");
    expect(prompt.openingPolicy?.forbidden).toContain("打错电话剧情开场");
    expect(prompt.debug?.providerIds).toEqual(
      expect.arrayContaining([
        "opening.phone_short_policy",
        "call.source",
        "call.scheduled_callback",
        "opening.wrong_number_guard",
      ]),
    );
  });

  it("distinguishes expert referral and story scheduled callback wording", () => {
    const scene = buildComposeScene({
      entryMode: "outbound",
      localNowIso: "2026-07-13T20:00:00+08:00",
    });
    const expertPrompt = composeRenderedPrompt({
      card: baseCard(),
      scene,
      beginContext: {
        source: "expert_referral",
        actualEntry: "outbound_auto",
        scheduledIntentId: "intent_expert",
        topicHint: "电脑坏了",
      },
    });
    if (expertPrompt && "ok" in expertPrompt && expertPrompt.ok === false) {
      return;
    }
    const expertHard = expertPrompt.systemHard.join("\n\n");
    expect(expertHard).toContain("[scheduled.callback.expert_referral]");
    expect(expertHard).toContain("被介绍/转接后的专家回电");
    expect(expertHard).toContain("不要说成用户自己预约提醒");

    const storyPrompt = composeRenderedPrompt({
      card: baseCard(),
      scene,
      beginContext: {
        source: "story_scheduled_call",
        actualEntry: "outbound_auto",
        scheduledIntentId: "intent_story",
        topicHint: "补打留号",
      },
    });
    if (storyPrompt && "ok" in storyPrompt && storyPrompt.ok === false) {
      return;
    }
    const storyHard = storyPrompt.systemHard.join("\n\n");
    expect(storyHard).toContain("[scheduled.callback.story_plan]");
    expect(storyHard).toContain("剧情/计划安排的外呼");
    expect(storyHard).toContain("不要说成用户口头预约提醒");
  });

  it("adds missed outbound context before scheduled callback instructions", () => {
    const scene = buildComposeScene({
      entryMode: "inbound",
      localNowIso: "2026-07-13T20:05:00+08:00",
    });
    const prompt = composeRenderedPrompt({
      card: baseCard(),
      scene,
      beginContext: {
        source: "expert_referral",
        actualEntry: "inbound_user_dial",
        scheduledIntentId: "intent_expert",
        topicHint: "电脑坏了",
        isEarlyUserDial: true,
        isMissedOutbound: true,
        missedOutbound: {
          at: "2026-07-13T20:03:00+08:00",
          reason: "rejected",
          eventId: "evt_1",
        },
      },
    });
    if (prompt && "ok" in prompt && prompt.ok === false) return;
    const joinedHard = prompt.systemHard.join("\n\n");
    expect(joinedHard).toContain("[call.missed_outbound]");
    expect(joinedHard).toContain("刚才没接上的外呼");
    expect(joinedHard).toContain("missedReason=rejected");
    expect(joinedHard).toContain("不要说「你拒接我」");
    expect(joinedHard).toContain("[scheduled.callback.expert_referral]");
    expect(joinedHard).toContain("回电话题：电脑坏了");
    expect(prompt.debug?.providerIds).toEqual(
      expect.arrayContaining([
        "call.source",
        "call.missed_outbound",
        "call.scheduled_callback",
      ]),
    );
  });

  it("adds conversation inertia policy and recent turns as soft context", () => {
    const scene = buildComposeScene({
      entryMode: "inbound",
      localNowIso: "2026-07-13T20:10:00+08:00",
    });
    const prompt = composeRenderedPrompt({
      card: baseCard(),
      scene,
      beginContext: {
        source: "free",
        actualEntry: "inbound_user_dial",
        conversationInertia: {
          previousSessionId: "session_prev",
          previousEndedAt: "2026-07-13T20:00:00+08:00",
          previousCardId: "lanxing_free",
          previousSource: "free",
          recentTurns: [
            {
              role: "user",
              text: "刚才说到明天要早起。",
              at: "2026-07-13T19:59:00+08:00",
            },
            {
              role: "assistant",
              text: "那我明天早点提醒你。",
              at: "2026-07-13T19:59:10+08:00",
            },
          ],
        },
      },
    });
    if (prompt && "ok" in prompt && prompt.ok === false) return;
    const joinedHard = prompt.systemHard.join("\n\n");
    expect(joinedHard).toContain("[conversation.inertia]");
    expect(joinedHard).toContain("不要重新完整自我介绍");
    expect(prompt.softContext.join("\n\n")).toContain(
      "[conversation.inertia.recent_turns]",
    );
    expect(prompt.softContext.join("\n\n")).toContain("明天要早起");
    expect(prompt.debug?.providerIds).toEqual(
      expect.arrayContaining(["conversation.inertia"]),
    );
  });

  it("can skip character opening fallback while keeping provider trace", () => {
    const card = baseCard({
      cardKind: "free",
      entryMode: "either",
      context: {
        objective: "闲聊",
        speakableBrief: "随便聊聊。",
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
          patch: { openingSpeakable: "角色剧情开场" },
        },
      ],
    };
    const scene = buildComposeScene({
      chapterId: "__free__",
      entryMode: "either",
      localNowIso: "2026-07-13T20:00:00+08:00",
    });
    const prompt = composeRenderedPrompt({
      card,
      characterDef: character,
      scene,
      allowCharacterOpeningFallback: false,
    });
    if (prompt && "ok" in prompt && prompt.ok === false) return;
    expect(prompt.openingSpeakable).toBeUndefined();
    expect(prompt.matchedLayerIds).not.toContain("char_open");
    expect(prompt.debug?.notes).toContain(
      "skip: CharacterDef.defaultPromptScenes",
    );
    expect(prompt.debug?.providerIds).toContain("opening.character_default");
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
      chapterId: "__free__",
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
        },
      },
    });
    expect(scene.localTime.localHour).toBe(22);
    expect(scene.localTime.isoWithOffset).toBe("2026-07-13T22:30:00+08:00");
  });
});
