/**
 * 模块名称：Composer Provider Golden 摘要
 * 模块说明：锁住电话开场/回电/惯性的 Prompt 组装形态，避免 Provider 化回归。
 */
import { describe, expect, it } from "vitest";
import {
  buildComposeScene,
  composeRenderedPrompt,
  type BeginCallContext,
  type CallCardDefinition,
  type CharacterDef,
  type RenderedPrompt,
} from "../../src/index.js";

function baseCard(
  overrides: Partial<CallCardDefinition> = {},
): CallCardDefinition {
  return {
    cardId: "golden_card",
    cardKind: "story",
    ownerAgentId: "lanxing",
    entryMode: "either",
    interactionMode: "realtime_dialogue",
    context: {
      objective: "接通电话并自然说明来意。",
      speakableBrief: "先短短接通，再推进当前话题。",
      privateBrief: "不要散文化。",
      promptScenes: [
        {
          layerId: "inbound_short",
          match: { callDirection: "inbound" },
          patch: {
            openingSpeakable: "喂？我是澜星。",
            appendSpeakable: "你打过来啦。",
          },
        },
        {
          layerId: "outbound_short",
          match: { callDirection: "outbound" },
          patch: {
            openingSpeakable: "喂？我是澜星。",
            appendSpeakable: "我按刚才说的打回来。",
          },
        },
      ],
    },
    exits: [],
    ...overrides,
  };
}

function lanxingCharacter(): CharacterDef {
  return {
    schemaVersion: 1,
    agentId: "lanxing",
    dialable: true,
    identity: { gender: "female", age: 24 },
    persona: {
      systemPrompt: "你是澜星姐姐。",
      personalityCode: "ENFJ",
      speakingStyle: "温柔、口语化、像真人电话，不写散文",
      voiceNotes: "偏软，带一点笑意",
      exampleLines: ["喂？我是澜星。", "刚才那件事，我接着说。"],
    },
  };
}

function mustPrompt(prompt: RenderedPrompt | { ok: false }): RenderedPrompt {
  if ("ok" in prompt && prompt.ok === false) {
    throw new Error("composeRenderedPrompt returned EngineError");
  }
  return prompt;
}

function blockTitles(blocks: readonly string[]): string[] {
  return blocks.map(function (block) {
    const firstLine = block.split("\n")[0] ?? "";
    const match = firstLine.match(/^\[([^\]]+)\]/);
    return match?.[1] ?? firstLine;
  });
}

function goldenSummary(prompt: RenderedPrompt) {
  return {
    openingSpeakable: prompt.openingSpeakable ?? null,
    openingPolicy: prompt.openingPolicy
      ? {
          mode: prompt.openingPolicy.mode,
          maxSentences: prompt.openingPolicy.maxSentences,
          forbidden: prompt.openingPolicy.forbidden,
        }
      : null,
    matchedLayerIds: prompt.matchedLayerIds,
    providerIds: prompt.debug?.providerIds ?? [],
    systemHardTitles: blockTitles(prompt.systemHard),
    softContextTitles: blockTitles(prompt.softContext),
    hasWrongNumberGuard: prompt.systemHard.some(function (block) {
      return block.includes("[opening.guard]");
    }),
  };
}

function composeGolden(input: {
  entryMode: string;
  beginContext: BeginCallContext;
  card?: CallCardDefinition;
  localNowIso?: string;
}): RenderedPrompt {
  const scene = buildComposeScene({
    entryMode: input.entryMode,
    actualEntry: input.beginContext.actualEntry,
    chapterId: input.beginContext.source === "free" ? "__free__" : "golden_handoff",
    localNowIso: input.localNowIso ?? "2026-07-13T20:10:00+08:00",
    timeZone: "Asia/Shanghai",
  });
  return mustPrompt(
    composeRenderedPrompt({
      card: input.card ?? baseCard(),
      characterDef: lanxingCharacter(),
      scene,
      beginContext: input.beginContext,
      allowCharacterOpeningFallback: input.beginContext.source !== "free",
    }),
  );
}

describe("composeRenderedPrompt provider golden summaries", () => {
  it("free inbound keeps short free opening and no scheduled callback", () => {
    const prompt = composeGolden({
      entryMode: "inbound",
      beginContext: {
        source: "free",
        actualEntry: "inbound_user_dial",
      },
      card: baseCard({ cardKind: "free" }),
    });

    expect(goldenSummary(prompt)).toMatchInlineSnapshot(`
      {
        "hasWrongNumberGuard": true,
        "matchedLayerIds": [
          "inbound_short",
        ],
        "openingPolicy": {
          "forbidden": [
            "小作文式环境描写",
            "括号动作描写",
            "预设已经听到用户声音",
            "客服式长自我介绍",
            "未识别用户前直呼姓名",
            "打错电话剧情开场",
          ],
          "maxSentences": 2,
          "mode": "phone_short",
        },
        "openingSpeakable": "喂？请问哪位？",
        "providerIds": [
          "base.card_context",
          "scene.card_promptScenes",
          "opening.character_default",
          "opening.phone_short_policy",
          "opening.situation",
          "hard.card_objective",
          "style.phone_global",
          "call.source",
          "call.missed_outbound",
          "conversation.inertia",
          "call.scheduled_callback",
          "opening.wrong_number_guard",
          "persona.character",
          "persona.style",
          "identity.character",
          "time.local",
          "soft.extras",
        ],
        "softContextTitles": [
          "identity",
        ],
        "systemHardTitles": [
          "opening.situation",
          "objective",
          "style.phone",
          "call.source",
          "opening.guard",
          "persona.systemPrompt",
          "persona.personality",
          "persona.style",
          "用户本地时间",
        ],
      }
    `);
  });

  it("scheduled user reminder carries topic without wrong-number opening", () => {
    const prompt = composeGolden({
      entryMode: "outbound",
      beginContext: {
        source: "schedule_reminder",
        actualEntry: "outbound_auto",
        scheduledIntentId: "intent_user_reminder",
        topicHint: "提醒午睡",
      },
    });

    expect(goldenSummary(prompt)).toMatchInlineSnapshot(`
      {
        "hasWrongNumberGuard": true,
        "matchedLayerIds": [
          "outbound_short",
        ],
        "openingPolicy": {
          "forbidden": [
            "小作文式环境描写",
            "括号动作描写",
            "预设已经听到用户声音",
            "客服式长自我介绍",
            "未识别用户前直呼姓名",
            "打错电话剧情开场",
          ],
          "maxSentences": 2,
          "mode": "phone_short",
        },
        "openingSpeakable": "喂，是我。",
        "providerIds": [
          "base.card_context",
          "scene.card_promptScenes",
          "opening.character_default",
          "opening.phone_short_policy",
          "opening.situation",
          "hard.card_objective",
          "style.phone_global",
          "call.source",
          "call.missed_outbound",
          "conversation.inertia",
          "call.scheduled_callback",
          "opening.wrong_number_guard",
          "persona.character",
          "persona.style",
          "identity.character",
          "time.local",
          "soft.extras",
        ],
        "softContextTitles": [
          "identity",
        ],
        "systemHardTitles": [
          "opening.situation",
          "objective",
          "style.phone",
          "call.source",
          "scheduled.callback.user_reminder",
          "opening.guard",
          "persona.systemPrompt",
          "persona.personality",
          "persona.style",
          "用户本地时间",
        ],
      }
    `);
    expect(prompt.systemHard.join("\n\n")).toContain("回电话题：提醒午睡");
  });

  it("missed expert callback composes source, missed, inertia, and referral blocks", () => {
    const prompt = composeGolden({
      entryMode: "inbound",
      beginContext: {
        source: "expert_referral",
        actualEntry: "inbound_user_dial",
        scheduledIntentId: "intent_expert",
        topicHint: "电脑坏了",
        isEarlyUserDial: true,
        isMissedOutbound: true,
        missedOutbound: {
          at: "2026-07-13T20:03:00+08:00",
          reason: "dismissed",
          eventId: "evt_1",
        },
        conversationInertia: {
          previousSessionId: "session_prev",
          previousEndedAt: "2026-07-13T20:02:00+08:00",
          previousCardId: "lanxing_free",
          previousSource: "free",
          recentTurns: [
            {
              role: "user",
              text: "电脑坏了，刚才没说完。",
              at: "2026-07-13T20:01:00+08:00",
            },
            {
              role: "assistant",
              text: "我找懂电脑的人回你。",
              at: "2026-07-13T20:01:20+08:00",
            },
          ],
        },
      },
    });

    expect(goldenSummary(prompt)).toMatchInlineSnapshot(`
      {
        "hasWrongNumberGuard": true,
        "matchedLayerIds": [
          "inbound_short",
        ],
        "openingPolicy": {
          "forbidden": [
            "小作文式环境描写",
            "括号动作描写",
            "预设已经听到用户声音",
            "客服式长自我介绍",
            "未识别用户前直呼姓名",
            "打错电话剧情开场",
          ],
          "maxSentences": 2,
          "mode": "phone_short",
        },
        "openingSpeakable": "喂，是我。刚才那通没接上。",
        "providerIds": [
          "base.card_context",
          "scene.card_promptScenes",
          "opening.character_default",
          "opening.phone_short_policy",
          "opening.situation",
          "hard.card_objective",
          "style.phone_global",
          "call.source",
          "call.missed_outbound",
          "conversation.inertia",
          "call.scheduled_callback",
          "opening.wrong_number_guard",
          "persona.character",
          "persona.style",
          "identity.character",
          "time.local",
          "soft.extras",
        ],
        "softContextTitles": [
          "conversation.inertia.recent_turns",
          "identity",
        ],
        "systemHardTitles": [
          "opening.situation",
          "objective",
          "style.phone",
          "call.source",
          "call.missed_outbound",
          "conversation.inertia",
          "scheduled.callback.expert_referral",
          "opening.guard",
          "persona.systemPrompt",
          "persona.personality",
          "persona.style",
          "用户本地时间",
        ],
      }
    `);
    const hard = prompt.systemHard.join("\n\n");
    expect(hard).toContain("missedReason=dismissed");
    expect(hard).toContain("被介绍/转接后的专家回电");
    expect(prompt.softContext.join("\n\n")).toContain("电脑坏了，刚才没说完");
  });

  it("recurring callback keeps recurring source and forbids random opening", () => {
    const prompt = composeGolden({
      entryMode: "outbound",
      beginContext: {
        source: "recurring_schedule",
        actualEntry: "outbound_auto",
        scheduledIntentId: "intent_recurring",
        topicHint: "早安问候",
      },
    });

    expect(goldenSummary(prompt)).toMatchInlineSnapshot(`
      {
        "hasWrongNumberGuard": true,
        "matchedLayerIds": [
          "outbound_short",
        ],
        "openingPolicy": {
          "forbidden": [
            "小作文式环境描写",
            "括号动作描写",
            "预设已经听到用户声音",
            "客服式长自我介绍",
            "未识别用户前直呼姓名",
            "打错电话剧情开场",
          ],
          "maxSentences": 2,
          "mode": "phone_short",
        },
        "openingSpeakable": "喂，是我。",
        "providerIds": [
          "base.card_context",
          "scene.card_promptScenes",
          "opening.character_default",
          "opening.phone_short_policy",
          "opening.situation",
          "hard.card_objective",
          "style.phone_global",
          "call.source",
          "call.missed_outbound",
          "conversation.inertia",
          "call.scheduled_callback",
          "opening.wrong_number_guard",
          "persona.character",
          "persona.style",
          "identity.character",
          "time.local",
          "soft.extras",
        ],
        "softContextTitles": [
          "identity",
        ],
        "systemHardTitles": [
          "opening.situation",
          "objective",
          "style.phone",
          "call.source",
          "scheduled.callback.recurring",
          "opening.guard",
          "persona.systemPrompt",
          "persona.personality",
          "persona.style",
          "用户本地时间",
        ],
      }
    `);
    const hard = prompt.systemHard.join("\n\n");
    expect(hard).toContain("这是固定重复计划触发的回电");
    expect(hard).toContain("回电话题：早安问候");
    expect(hard).toContain("不要打错电话，不要说成临时随机来电");
  });

  it("story scheduled callback carries plan topic instead of user reminder copy", () => {
    const prompt = composeGolden({
      entryMode: "outbound",
      beginContext: {
        source: "story_scheduled_call",
        actualEntry: "outbound_auto",
        scheduledIntentId: "intent_story_plan",
        topicHint: "补完线索",
      },
    });

    expect(goldenSummary(prompt)).toMatchInlineSnapshot(`
      {
        "hasWrongNumberGuard": true,
        "matchedLayerIds": [
          "outbound_short",
        ],
        "openingPolicy": {
          "forbidden": [
            "小作文式环境描写",
            "括号动作描写",
            "预设已经听到用户声音",
            "客服式长自我介绍",
            "未识别用户前直呼姓名",
            "打错电话剧情开场",
          ],
          "maxSentences": 2,
          "mode": "phone_short",
        },
        "openingSpeakable": "喂，是我。",
        "providerIds": [
          "base.card_context",
          "scene.card_promptScenes",
          "opening.character_default",
          "opening.phone_short_policy",
          "opening.situation",
          "hard.card_objective",
          "style.phone_global",
          "call.source",
          "call.missed_outbound",
          "conversation.inertia",
          "call.scheduled_callback",
          "opening.wrong_number_guard",
          "persona.character",
          "persona.style",
          "identity.character",
          "time.local",
          "soft.extras",
        ],
        "softContextTitles": [
          "identity",
        ],
        "systemHardTitles": [
          "opening.situation",
          "objective",
          "style.phone",
          "call.source",
          "scheduled.callback.story_plan",
          "opening.guard",
          "persona.systemPrompt",
          "persona.personality",
          "persona.style",
          "用户本地时间",
        ],
      }
    `);
    const hard = prompt.systemHard.join("\n\n");
    expect(hard).toContain("这是剧情/计划安排的外呼");
    expect(hard).toContain("回电话题：补完线索");
    expect(hard).not.toContain("这是用户口头预约的提醒/回电");
  });

	  it("late-night free inbound overrides to sleepy unknown-caller opening", () => {
	    const prompt = composeGolden({
      entryMode: "inbound",
      beginContext: {
        source: "free",
        actualEntry: "inbound_user_dial",
      },
      card: baseCard({ cardKind: "free" }),
      localNowIso: "2026-07-13T02:10:00+08:00",
    });

    expect(prompt.openingSpeakable).toBe("喂？哪位……这么晚了。");
    expect(prompt.openingPrivate).toContain("深夜用户拨入");
    expect(prompt.debug?.notes).toContain(
      "opening.situation:late_night_inbound:override",
    );
	    expect(prompt.systemHard.join("\n\n")).toContain("kind=late_night_inbound");
	  });

	  it("early-morning free inbound acknowledges early hour without self intro", () => {
	    const prompt = composeGolden({
	      entryMode: "inbound",
	      beginContext: {
	        source: "free",
	        actualEntry: "inbound_user_dial",
	      },
	      card: baseCard({ cardKind: "free" }),
	      localNowIso: "2026-07-13T06:40:00+08:00",
	    });

	    expect(prompt.openingSpeakable).toBe("喂？请问哪位？这么早。");
	    expect(prompt.openingSpeakable).not.toContain("我是");
	    expect(prompt.openingPrivate).toContain("清早用户拨入");
	    expect(prompt.debug?.notes).toContain(
	      "opening.situation:early_morning_inbound:override",
	    );
	    expect(prompt.systemHard.join("\n\n")).toContain(
	      "kind=early_morning_inbound",
	    );
	  });

	  it("afternoon free inbound remains a normal answered call while trace keeps temporal kind", () => {
	    const prompt = composeGolden({
	      entryMode: "inbound",
	      beginContext: {
	        source: "free",
	        actualEntry: "inbound_user_dial",
	      },
	      card: baseCard({ cardKind: "free" }),
	      localNowIso: "2026-07-13T15:20:00+08:00",
	    });

	    expect(prompt.openingSpeakable).toBe("喂？请问哪位？");
	    expect(prompt.openingPrivate).toContain("下午用户拨入");
	    expect(prompt.debug?.notes).toContain(
	      "opening.situation:afternoon_inbound:override",
	    );
	    expect(prompt.systemHard.join("\n\n")).toContain("kind=afternoon_inbound");
	  });
	});
